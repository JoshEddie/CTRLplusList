'use server';

import { db } from '@/db';
import { items, list_items, purchases } from '@/db/schema';
import {
  canRemovePurchase,
  duplicateClaimResponse,
  getEntryClaimSummary,
  getRevealedEntryClaims,
  isEligiblePurchaser,
} from '@/lib/data/purchase';
import {
  forgetGuestClaim,
  readGuestClaims,
  rememberGuestClaim,
  resolveClaimIdentity,
} from '@/lib/data/purchase.identity';
import { writableMembership } from '@/lib/data/profile.gate';
import { authedIdentity } from '@/lib/data/user.session';
import { getMessage } from '@/lib/i18n/utils';
import { isEntryViewable } from '@/lib/listAccess';
import { sqlstateOf } from '@/lib/sqlstate';
import { type ActionResponse, type PurchaseView } from '@/lib/types';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Postgres unique-violation error code.
const PG_UNIQUE_VIOLATION = '23505';

// Every claim covers exactly one unit. Named rather than inlined so the
// capacity guard below reads as the general statement it already is.
const CLAIM_UNITS = 1;

// What identifies one claim to the write path: who it is for, who asserted it,
// and the entry it lands on.
type ClaimInput = {
  listId: string;
  itemId: string;
  purchaserProfileId: string | null;
  callerProfileId: string | null;
  guestName: string | null;
};

export async function createPurchase(data: {
  item_id: string;
  list_id: string;
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

    // Gate by the ENTRY's viewability: a claim belongs to an item's presence
    // on one list, so what the caller may claim is an entry on a list they can
    // see. An item reachable through some other list does not qualify, and an
    // item on no list has no entry at all. Indistinguishable from a missing
    // item on purpose. Gated on the authenticated caller (not the stored
    // attribution) so a blocked caller cannot slip a claim through the
    // on-behalf path.
    const viewable = await isEntryViewable(data.list_id, data.item_id, viewer);
    if (!viewable) {
      return {
        success: false,
        message: getMessage('claim_item_not_found'),
        error: getMessage('claim_error_item_not_found'),
      };
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, data.item_id),
      columns: { profile_id: true },
    });
    if (!item) {
      return {
        success: false,
        message: getMessage('claim_item_not_found'),
        error: getMessage('claim_error_item_not_found'),
      };
    }

    const isAttributed =
      !!purchaserProfileId && purchaserProfileId !== callerProfileId;
    if (isAttributed) {
      const refusal = await attributionRefusal(
        item.profile_id,
        // callerProfileId is non-null here: purchased_by without a session is
        // rejected in resolveClaimIdentity.
        callerProfileId as string,
        purchaserProfileId
      );
      if (refusal) return refusal;
    }

    const written = await recordEntryClaim(
      {
        listId: data.list_id,
        itemId: data.item_id,
        purchaserProfileId,
        callerProfileId,
        guestName,
      },
      isAttributed
    );
    if ('refusal' in written) return written.refusal;
    const insertedId = written.id;

    if (!callerProfileId) {
      // guestName is non-null here: the signed-out branch of
      // resolveClaimIdentity rejects an empty name.
      await rememberGuestClaim(insertedId, guestName as string);
    }

    updateTags(
      cacheTags.itemsOfProfile(item.profile_id),
      ...(purchaserProfileId
        ? [cacheTags.purchasesOfProfile(purchaserProfileId)]
        : [])
    );

    return {
      success: true,
      message: getMessage('claim_create_success'),
      id: insertedId,
    };
  } catch (error) {
    console.error('Error creating purchase:', error);
    return {
      success: false,
      message: getMessage('claim_create_failed'),
      error: getMessage('claim_error_create_failed'),
    };
  }
}

// Re-verifies an attribution target against the live graph: must be an
// owner-mutual, no block edge with the claimer, and not the owner. The client
// picker is presentation only. A block or unfollow can land between this check
// and the insert (neon-http: no transactions) — residual and harmless, since
// removal rights are row-based and the at-claim gate is best-effort by design.
async function attributionRefusal(
  ownerProfileId: string,
  claimerProfileId: string,
  purchaserProfileId: string
): Promise<ActionResponse | null> {
  const eligible = await isEligiblePurchaser(
    ownerProfileId,
    claimerProfileId,
    purchaserProfileId
  );
  if (eligible) return null;
  return {
    success: false,
    message: getMessage('claim_ineligible_purchaser'),
    error: getMessage('claim_error_ineligible_purchaser'),
  };
}

// The claim write and every refusal it can answer with, in one place: the
// duplicate a purchaser already holds, the capacity the entry has no room in,
// and the duplicate that raced past the first check.
async function recordEntryClaim(
  claim: ClaimInput,
  isAttributed: boolean
): Promise<{ id: string } | { refusal: ActionResponse }> {
  // Best-effort, for the message alone: the partial unique index on
  // (list_id, item_id, profile_id) is the concurrency backstop, and the 23505
  // catch below reports the same refusal. Asked first so a purchaser who
  // already holds a claim reads "already claimed" rather than the capacity
  // refusal their own claim provoked. There is no guest equivalent — two
  // guests who both type "Josh" are two claims, and capacity is what limits
  // them.
  if (
    claim.purchaserProfileId &&
    (await entryHoldsClaimBy(
      claim.listId,
      claim.itemId,
      claim.purchaserProfileId
    ))
  ) {
    return { refusal: duplicateClaimResponse(isAttributed) };
  }

  let insertedId: string | null;
  try {
    insertedId = await insertClaimWithinCapacity(claim);
  } catch (insertError) {
    // Partial unique index trip (purchases_list_item_profile_unique_idx): a
    // duplicate purchaser slipped past the check above because two requests
    // raced against distinct DB sessions.
    if (sqlstateOf(insertError) === PG_UNIQUE_VIOLATION) {
      return { refusal: duplicateClaimResponse(isAttributed) };
    }
    throw insertError;
  }
  if (!insertedId) {
    return {
      refusal: {
        success: false,
        message: getMessage('claim_item_fully_claimed'),
        error: getMessage('claim_error_fully_claimed'),
      },
    };
  }
  return { id: insertedId };
}

async function entryHoldsClaimBy(
  listId: string,
  itemId: string,
  purchaserProfileId: string
): Promise<boolean> {
  const [existing] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(
      and(
        eq(purchases.list_id, listId),
        eq(purchases.item_id, itemId),
        eq(purchases.profile_id, purchaserProfileId)
      )
    );
  return !!existing;
}

// Capacity is a guard folded into the insert, not a read that precedes it:
// this driver has no interactive transaction, so a count read then an insert
// decides on state that has already moved. Selecting FROM the entry means a
// missing entry inserts nothing either, so null answers both refusals — and
// only capacity can be the reason, the entry's existence being proven by the
// gate upstream. The residual race the sum leaves open is accepted
// (ADR-0016): the guard takes no lock, and an over-claimed entry is a state
// the app already tolerates.
//
// Written as a raw SELECT because drizzle builds the target column list from
// the schema: the projection below is every `purchases` column in DECLARATION
// ORDER, matched positionally. A column added without one here fails on arity,
// but reordering two columns of the same type would not — what catches that is
// the write-path suite, which pins a distinct value in every identity column
// of a persisted row.
async function insertClaimWithinCapacity(
  claim: ClaimInput
): Promise<string | null> {
  const claimId = nanoid();
  const [inserted] = await db
    .insert(purchases)
    .select(
      sql`select ${claimId}::text, ${claim.itemId}::text, ${claim.listId}::text, ${CLAIM_UNITS}::integer,
                 null::text, null::text, null::text,
                 ${claim.purchaserProfileId}::text, ${claim.callerProfileId}::text, ${claim.guestName}::text, now()
          from ${list_items}
          where ${list_items.list_id} = ${claim.listId}
            and ${list_items.item_id} = ${claim.itemId}
            and ${CLAIM_UNITS} + coalesce((select sum(${purchases.units}) from ${purchases}
                  where ${purchases.list_id} = ${claim.listId}
                    and ${purchases.item_id} = ${claim.itemId}), 0) <= ${list_items.quantity}`
    )
    .returning({ id: purchases.id });
  return inserted?.id ?? null;
}

type RemovePurchaseInput = { purchase_id: string };

export async function removePurchase(
  data: RemovePurchaseInput
): Promise<ActionResponse> {
  try {
    if (!data.purchase_id) {
      return {
        success: false,
        message: getMessage('claim_remove_unidentified'),
        error: getMessage('claim_error_missing_identity'),
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
        message: getMessage('claim_not_found'),
        error: getMessage('claim_error_not_found'),
      };
    }

    // A claim whose item was deleted keeps a null item reference, so there is
    // no owner to compare against and no item tag to bump. The claim is still
    // its holder's to drop.
    const targetItem = row.item_id
      ? await db.query.items.findFirst({
          where: eq(items.id, row.item_id),
          columns: { profile_id: true },
        })
      : undefined;

    const guestClaims = actorIdentity ? null : await readGuestClaims();

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
        message: getMessage('claim_not_yours'),
        error: getMessage('claim_error_not_yours'),
      };
    }

    await db.delete(purchases).where(eq(purchases.id, row.id));
    if (guestClaims) {
      await forgetGuestClaim(guestClaims, row.id);
    }
    updateTags(
      ...(targetItem ? [cacheTags.itemsOfProfile(targetItem.profile_id)] : []),
      ...(row.profile_id ? [cacheTags.purchasesOfProfile(row.profile_id)] : [])
    );
    return {
      success: true,
      message: getMessage('claim_delete_success'),
    };
  } catch (error) {
    console.error('Error removing purchase:', error);
    return {
      success: false,
      message: getMessage('claim_delete_failed'),
      error: getMessage('claim_error_remove_failed'),
    };
  }
}

// What the claim affordance's reveal reaches: whether the entry is spoken for
// and what capacity remains, naming nobody. Gated by the same rule as its
// sibling below — without it, possession of an item id was enough to read a
// list's exact claim state at any tier.
export async function claimSummaryForEntry(listId: string, itemId: string) {
  const viewer = await authedIdentity();
  if (!(await isEntryViewable(listId, itemId, viewer))) return null;
  return getEntryClaimSummary(listId, itemId);
}

// What the owner's manage-claims reveal reaches. Naming the claiming parties is
// no tier, so the stored baseline does not gate it — what gates it is the same
// rule that decides whether the viewer may see the entry at all.
export async function revealedClaimsForEntry(
  listId: string,
  itemId: string
): Promise<PurchaseView[]> {
  const viewer = await authedIdentity();
  if (!(await isEntryViewable(listId, itemId, viewer))) return [];
  return getRevealedEntryClaims(listId, itemId, viewer?.selfProfile.id);
}
