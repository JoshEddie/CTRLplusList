'use server';

import { db } from '@/db';
import { items, purchases } from '@/db/schema';
import {
  canRemovePurchase,
  getEntryClaimSummary,
  getRevealedEntryClaims,
} from '@/lib/data/purchase';
import {
  forgetGuestClaim,
  readGuestClaims,
  rememberGuestClaim,
  resolveClaimIdentity,
} from '@/lib/data/purchase.identity';
import {
  attributionRefusal,
  noRoomResponse,
  recordEntryClaim,
  updateClaimUnitsWithinCapacity,
} from '@/lib/data/purchase.write';
import { EntryQuantitySchema } from '@/lib/data/listItems.schema';
import { writableMembership } from '@/lib/data/profile.gate';
import { authedIdentity } from '@/lib/data/user.session';
import { getMessage } from '@/lib/i18n/utils';
import { isEntryViewable } from '@/lib/listAccess';
import { type ActionResponse, type PurchaseView } from '@/lib/types';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { eq } from 'drizzle-orm';

// A claim covers at least one unit and at most what an entry can ask for, so
// the entry's own bound is the units bound too — a claim can never legitimately
// exceed the quantity it is measured against. Capacity narrows it further per
// entry; this only rejects what is not a unit count at all.
function invalidUnitsRefusal(units: number): ActionResponse | null {
  if (EntryQuantitySchema.safeParse(units).success) return null;
  return {
    success: false,
    message: getMessage('claim_units_invalid'),
    error: getMessage('claim_error_invalid_units'),
  };
}

export async function createPurchase(data: {
  item_id: string;
  list_id: string;
  guest_name: string | null;
  purchased_by?: string | null;
  /** Units this claim covers. Absent means one — Buy & Claim and every single-quantity entry. */
  units?: number;
}): Promise<ActionResponse> {
  try {
    const units = data.units ?? 1;
    const invalid = invalidUnitsRefusal(units);
    if (invalid) return invalid;

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
        units,
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

type ClaimRow = {
  id: string;
  item_id: string | null;
  list_id: string | null;
  units: number;
  profile_id: string | null;
  claimed_by_profile_id: string | null;
};

type AuthorizedClaim = {
  row: ClaimRow;
  ownerProfileId: string | null;
  /** The signed-out caller's cookie, kept so a removal can prune it. Null for an authenticated caller. */
  guestClaims: Awaited<ReturnType<typeof readGuestClaims>> | null;
};

// One gate for both ways a claim can be changed: dropping it and moving its
// units. Editing units is a new capability for the item's owner, but not a new
// rights question — who may change somebody else's claim is who may remove it,
// and dropping a claim to zero units IS removing it.
async function authorizeClaimMutation(
  purchaseId: string
): Promise<AuthorizedClaim | { refusal: ActionResponse }> {
  const actorIdentity = await authedIdentity();
  const actorMembership = actorIdentity
    ? await writableMembership(
        actorIdentity.userId,
        actorIdentity.activeProfile.id
      )
    : null;

  const row = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
    columns: {
      id: true,
      item_id: true,
      list_id: true,
      units: true,
      profile_id: true,
      claimed_by_profile_id: true,
    },
  });
  if (!row) {
    return {
      refusal: {
        success: false,
        message: getMessage('claim_not_found'),
        error: getMessage('claim_error_not_found'),
      },
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
      refusal: {
        success: false,
        message: getMessage('claim_not_yours'),
        error: getMessage('claim_error_not_yours'),
      },
    };
  }

  return { row, ownerProfileId: targetItem?.profile_id ?? null, guestClaims };
}

function bumpClaimTags(claim: AuthorizedClaim) {
  updateTags(
    ...(claim.ownerProfileId
      ? [cacheTags.itemsOfProfile(claim.ownerProfileId)]
      : []),
    ...(claim.row.profile_id
      ? [cacheTags.purchasesOfProfile(claim.row.profile_id)]
      : [])
  );
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

    const authorized = await authorizeClaimMutation(data.purchase_id);
    if ('refusal' in authorized) return authorized.refusal;

    await db.delete(purchases).where(eq(purchases.id, authorized.row.id));
    if (authorized.guestClaims) {
      await forgetGuestClaim(authorized.guestClaims, authorized.row.id);
    }
    bumpClaimTags(authorized);
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

// Moves a claim within what its entry still has room for. Zero is not a unit
// count a row can hold, so it routes to removal: dropping a claim to nothing IS
// unclaiming, and leaving a zero-unit row would be a claim for nothing.
export async function setPurchaseUnits(data: {
  purchase_id: string;
  units: number;
}): Promise<ActionResponse> {
  if (data.units === 0) return removePurchase({ purchase_id: data.purchase_id });
  try {
    const invalid = invalidUnitsRefusal(data.units);
    if (invalid) return invalid;

    const authorized = await authorizeClaimMutation(data.purchase_id);
    if ('refusal' in authorized) return authorized.refusal;
    const { row } = authorized;

    // A claim detached from its entry — the item was deleted, or the list was
    // — has no capacity to be measured against, so there is no number the edit
    // could be checked for room in.
    if (!row.list_id || !row.item_id) return noRoomResponse();

    const moved = await updateClaimUnitsWithinCapacity({
      id: row.id,
      listId: row.list_id,
      itemId: row.item_id,
      units: data.units,
    });
    if (!moved) return noRoomResponse();

    bumpClaimTags(authorized);
    return {
      success: true,
      message: getMessage('claim_units_success'),
    };
  } catch (error) {
    console.error('Error updating purchase units:', error);
    return {
      success: false,
      message: getMessage('claim_units_failed'),
      error: getMessage('claim_error_units_failed'),
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
