'use server';

// TODO(#343): extract the duplicated literal to a constant, then drop this disable
/* eslint-disable sonarjs/no-duplicate-string */

import { db } from '@/db';
import { items, purchases } from '@/db/schema';
import { auth } from '@/lib/auth';
import {
  canRemovePurchase,
  claimConflictResponse,
  duplicateClaimResponse,
  getItemClaimSummary,
  getRevealedItemClaims,
  isEligiblePurchaser,
} from '@/lib/data/purchase';
import {
  GUEST_CLAIMS_COOKIE,
  GUEST_CLAIMS_COOKIE_ATTRIBUTES,
  appendGuestClaim,
  parseGuestClaims,
  pruneGuestClaim,
} from '@/lib/data/purchase.cookie';
import { writableMembership } from '@/lib/data/profile.gate';
import { authedIdentity } from '@/lib/data/user.session';
import { isItemViewable } from '@/lib/listAccess';
import { sqlstateOf } from '@/lib/sqlstate';
import {
  type ActionResponse,
  type PurchaseView,
  type UserIdentity,
} from '@/lib/types';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';

// Postgres unique-violation error code.
const PG_UNIQUE_VIOLATION = '23505';

// Resolve who a createPurchase claim is authorized AS vs stored AS, producing
// one of the four row shapes (claimed_by_profile_id = who asserted,
// profile_id = the purchaser):
//   self-claim:               asserter = caller's self-profile, purchaser = caller's self-profile
//   attributed claim:         asserter = caller's self-profile, purchaser = purchased_by target
//   authenticated guest name: asserter = caller's self-profile, purchaser = NULL, guest_name set
//   signed-out guest:         asserter = NULL,                  purchaser = NULL, guest_name set
// The asserter is always the session-resolved caller's self-profile — a claim
// is a human act; the purchased_by target is a payload field but only an
// attribution target (a profile id) — eligibility is re-verified against the
// live follow/block graph before insert.
async function resolveClaimIdentity(
  rawGuestName: string | null,
  purchasedBy: string | null
): Promise<
  | {
      viewer: UserIdentity | null;
      callerProfileId: string | null;
      purchaserProfileId: string | null;
      guestName: string | null;
    }
  | { error: ActionResponse }
> {
  const session = await auth();
  const trimmed = rawGuestName?.trim() ?? '';
  if (session?.user?.email) {
    const identity = await authedIdentity();
    if (!identity) {
      return {
        error: {
          success: false,
          message: 'User not found',
          error: 'Unauthorized',
        },
      };
    }
    if (purchasedBy && trimmed) {
      return {
        error: {
          success: false,
          message: 'Cannot identify which claim to add',
          error: 'Ambiguous purchaser',
        },
      };
    }
    if (purchasedBy) {
      return {
        viewer: identity,
        callerProfileId: identity.selfProfile.id,
        purchaserProfileId: purchasedBy,
        guestName: null,
      };
    }
    return trimmed
      ? {
          viewer: identity,
          callerProfileId: identity.selfProfile.id,
          purchaserProfileId: null,
          guestName: trimmed,
        }
      : {
          viewer: identity,
          callerProfileId: identity.selfProfile.id,
          purchaserProfileId: identity.selfProfile.id,
          guestName: null,
        };
  }
  if (purchasedBy || !trimmed) {
    return {
      error: {
        success: false,
        message: 'Cannot identify which claim to add',
        error: 'Missing identity',
      },
    };
  }
  return {
    viewer: null,
    callerProfileId: null,
    purchaserProfileId: null,
    guestName: trimmed,
  };
}

export async function createPurchase(data: {
  item_id: string;
  guest_name: string | null;
  purchased_by?: string | null;
}): Promise<ActionResponse> {
  try {
    const identity = await resolveClaimIdentity(
      data.guest_name,
      data.purchased_by ?? null
    );
    if ('error' in identity) {
      return identity.error;
    }
    // callerProfileId is the caller's self-profile: it is stored as the
    // asserter, and is the claimer the eligibility check names — a claim is a
    // human act whatever profile the caller is acting as. `viewer` carries the
    // whole identity because the viewability gate below splits it, comparing
    // ownership against the active profile and blocks against the self one.
    // purchaserProfileId + guestName identify the purchaser we STORE.
    const { viewer, callerProfileId, purchaserProfileId, guestName } = identity;

    // Gate by viewability: items on lists the caller can't see are unclaimable.
    // Indistinguishable from a missing item on purpose. Gated on the
    // authenticated caller (not the stored attribution) so a blocked caller
    // cannot slip a claim through the on-behalf path.
    const viewable = await isItemViewable(data.item_id, viewer);
    if (!viewable) {
      return {
        success: false,
        message: 'Item not found',
        error: 'Item not found',
      };
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, data.item_id),
      columns: { quantity_limit: true, profile_id: true },
    });
    if (!item) {
      return {
        success: false,
        message: 'Item not found',
        error: 'Item not found',
      };
    }

    const isAttributed =
      !!purchaserProfileId && purchaserProfileId !== callerProfileId;
    if (isAttributed) {
      // Re-verify the attribution target against the live graph: must be an
      // owner-mutual, no block edge with the claimer, and not the owner. The
      // client picker is presentation only. A block/unfollow can land between
      // this check and the insert below (neon-http: no transactions) —
      // residual and harmless: removal rights are row-based, and the at-claim
      // gate is best-effort by design.
      const eligible = await isEligiblePurchaser(
        item.profile_id,
        // callerProfileId is non-null here: purchased_by without a session is
        // rejected in resolveClaimIdentity.
        callerProfileId as string,
        purchaserProfileId
      );
      if (!eligible) {
        return {
          success: false,
          message: 'That person cannot be marked as the purchaser',
          error: 'Ineligible purchaser',
        };
      }
    }

    const existing = await db
      .select({
        id: purchases.id,
        profile_id: purchases.profile_id,
        guest_name: purchases.guest_name,
      })
      .from(purchases)
      .where(eq(purchases.item_id, data.item_id));

    const conflict = claimConflictResponse(
      existing,
      purchaserProfileId,
      guestName,
      item.quantity_limit,
      isAttributed
    );
    if (conflict) return conflict;

    let insertedId: string;
    try {
      const [inserted] = await db
        .insert(purchases)
        .values({
          id: nanoid(),
          item_id: data.item_id,
          profile_id: purchaserProfileId,
          claimed_by_profile_id: callerProfileId,
          guest_name: guestName,
          purchased_at: new Date(),
        })
        .returning({ id: purchases.id });
      insertedId = inserted.id;
    } catch (insertError) {
      // Partial unique index trip (purchases_item_profile_unique_idx): a
      // duplicate purchaser slipped past the in-app check because two
      // requests raced against distinct DB sessions. The capacity-race for
      // guest claims / different users on a limited item is not closed at the
      // DB layer (neon-http driver does not support interactive transactions,
      // so SELECT … FOR UPDATE is not available). Accepted as a known
      // limitation.
      if (sqlstateOf(insertError) === PG_UNIQUE_VIOLATION) {
        return duplicateClaimResponse(isAttributed);
      }
      throw insertError;
    }

    if (!callerProfileId) {
      const store = await cookies();
      const claims = appendGuestClaim(
        parseGuestClaims(store.get(GUEST_CLAIMS_COOKIE)?.value),
        insertedId,
        // guestName is non-null here: the signed-out branch of
        // resolveClaimIdentity rejects an empty name.
        guestName as string
      );
      store.set(
        GUEST_CLAIMS_COOKIE,
        JSON.stringify(claims),
        GUEST_CLAIMS_COOKIE_ATTRIBUTES
      );
    }

    updateTags(
      cacheTags.itemsOfProfile(item.profile_id),
      ...(purchaserProfileId
        ? [cacheTags.purchasesOfProfile(purchaserProfileId)]
        : [])
    );

    return {
      success: true,
      message: 'Item marked as purchased successfully',
      id: insertedId,
    };
  } catch (error) {
    console.error('Error creating purchase:', error);
    return {
      success: false,
      message: 'An error occurred while marking the item as purchased',
      error: 'Failed to create purchase',
    };
  }
}

type RemovePurchaseInput = { purchase_id: string };

export async function removePurchase(
  data: RemovePurchaseInput
): Promise<ActionResponse> {
  try {
    if (!data.purchase_id) {
      return {
        success: false,
        message: 'Cannot identify which claim to remove',
        error: 'Missing identity',
      };
    }

    const actorIdentity = await authedIdentity();
    const actorMembership = actorIdentity
      ? await writableMembership(
          actorIdentity.userId,
          actorIdentity.activeProfile.id
        )
      : null;

    const row = await db.query.purchases.findFirst({
      where: eq(purchases.id, data.purchase_id),
      columns: {
        id: true,
        item_id: true,
        profile_id: true,
        claimed_by_profile_id: true,
      },
    });
    if (!row) {
      return {
        success: false,
        message: 'Claim not found',
        error: 'Not found',
      };
    }

    const targetItem = await db.query.items.findFirst({
      where: eq(items.id, row.item_id),
      columns: { profile_id: true },
    });

    let guestClaims = null;
    if (!actorIdentity) {
      const store = await cookies();
      guestClaims = parseGuestClaims(store.get(GUEST_CLAIMS_COOKIE)?.value);
    }

    if (
      !canRemovePurchase(
        row,
        targetItem?.profile_id ?? null,
        actorIdentity,
        new Set(guestClaims?.purchases),
        actorMembership?.role ?? null
      )
    ) {
      return {
        success: false,
        message: 'Not your claim',
        error: 'Not your claim',
      };
    }

    await db.delete(purchases).where(eq(purchases.id, row.id));
    if (guestClaims) {
      const store = await cookies();
      store.set(
        GUEST_CLAIMS_COOKIE,
        JSON.stringify(pruneGuestClaim(guestClaims, row.id)),
        GUEST_CLAIMS_COOKIE_ATTRIBUTES
      );
    }
    updateTags(
      ...(targetItem ? [cacheTags.itemsOfProfile(targetItem.profile_id)] : []),
      ...(row.profile_id ? [cacheTags.purchasesOfProfile(row.profile_id)] : [])
    );
    return {
      success: true,
      message: 'Item marked as not purchased successfully',
    };
  } catch (error) {
    console.error('Error removing purchase:', error);
    return {
      success: false,
      message: 'An error occurred while removing the purchase',
      error: 'Failed to remove purchase',
    };
  }
}

// What the claim affordance's reveal reaches: whether the item is spoken for
// and what capacity remains, naming nobody.
export async function claimSummaryForItem(itemId: string) {
  return getItemClaimSummary(itemId);
}

// What the owner's manage-claims reveal reaches. Naming the claiming parties is
// no tier, so the stored baseline does not gate it — what gates it is the same
// rule that decides whether the viewer may see the item at all.
export async function revealedClaimsForItem(
  itemId: string
): Promise<PurchaseView[]> {
  const viewer = await authedIdentity();
  if (!(await isItemViewable(itemId, viewer))) return [];
  return getRevealedItemClaims(itemId, viewer?.selfProfile.id);
}
