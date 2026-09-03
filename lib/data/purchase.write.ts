import { db } from '@/db';
import { list_items, purchases } from '@/db/schema';
import {
  duplicateClaimResponse,
  isEligiblePurchaser,
} from '@/lib/data/purchase';
import { getMessage } from '@/lib/i18n/utils';
import { sqlstateOf } from '@/lib/sqlstate';
import { type ActionResponse } from '@/lib/types';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Postgres unique-violation error code.
const PG_UNIQUE_VIOLATION = '23505';

// What identifies one claim to the write path: who it is for, who asserted it,
// the entry it lands on, and how much of that entry it takes.
export type ClaimInput = {
  listId: string;
  itemId: string;
  units: number;
  purchaserProfileId: string | null;
  callerProfileId: string | null;
  guestName: string | null;
};

// Re-verifies an attribution target against the live graph: must be an
// owner-mutual, no block edge with the claimer, and not the owner. The client
// picker is presentation only. A block or unfollow can land between this check
// and the insert (neon-http: no transactions) — residual and harmless, since
// removal rights are row-based and the at-claim gate is best-effort by design.
export async function attributionRefusal(
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
export async function recordEntryClaim(
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
  if (!insertedId) return { refusal: noRoomResponse() };
  return { id: insertedId };
}

export function noRoomResponse(): ActionResponse {
  return {
    success: false,
    message: getMessage('claim_item_fully_claimed'),
    error: getMessage('claim_error_fully_claimed'),
  };
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
      sql`select ${claimId}::text, ${claim.itemId}::text, ${claim.listId}::text, ${claim.units}::integer,
                 null::text, null::text, null::text,
                 ${claim.purchaserProfileId}::text, ${claim.callerProfileId}::text, ${claim.guestName}::text, now()
          from ${list_items}
          where ${list_items.list_id} = ${claim.listId}
            and ${list_items.item_id} = ${claim.itemId}
            and ${claim.units} + coalesce((select sum(${purchases.units}) from ${purchases}
                  where ${purchases.list_id} = ${claim.listId}
                    and ${purchases.item_id} = ${claim.itemId}), 0) <= ${list_items.quantity}`
    )
    .returning({ id: purchases.id });
  return inserted?.id ?? null;
}

// The same capacity rule as the insert, applied to a claim that already
// exists: what the entry has room for is everything it wants minus every
// OTHER claim on it, so raising a claim by one needs one unit free rather
// than all of them. Aliased in the subquery because the outer statement's
// target is the same table. A missing entry makes the scalar null, which no
// comparison satisfies — the edit is refused rather than silently allowed.
export async function updateClaimUnitsWithinCapacity(claim: {
  id: string;
  listId: string;
  itemId: string;
  units: number;
}): Promise<boolean> {
  const [updated] = await db
    .update(purchases)
    .set({ units: claim.units })
    .where(
      and(
        eq(purchases.id, claim.id),
        sql`${claim.units} + coalesce((select sum(sibling.units) from ${purchases} sibling
              where sibling.list_id = ${claim.listId}
                and sibling.item_id = ${claim.itemId}
                and sibling.id <> ${claim.id}), 0)
            <= (select ${list_items.quantity} from ${list_items}
                where ${list_items.list_id} = ${claim.listId}
                  and ${list_items.item_id} = ${claim.itemId})`
      )
    )
    .returning({ id: purchases.id });
  return !!updated;
}
