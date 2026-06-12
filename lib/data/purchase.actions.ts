'use server';

import { db } from '@/db';
import { items, purchases, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import {
  canRemovePurchase,
  claimConflictResponse,
  duplicateClaimResponse,
  isEligiblePurchaser,
} from '@/lib/data/purchase';
import { isItemViewable } from '@/lib/listAccess';
import { sqlstateOf } from '@/lib/sqlstate';
import { type ActionResponse } from '@/lib/types';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { updateTag } from 'next/cache';

// Postgres unique-violation error code.
const PG_UNIQUE_VIOLATION = '23505';

// Resolve who a createPurchase claim is authorized AS vs stored AS, producing
// one of the four row shapes (claimed_by = who asserted, user_id = the
// purchaser):
//   self-claim:               claimed_by = caller, user_id = caller
//   attributed claim:         claimed_by = caller, user_id = purchased_by target
//   authenticated guest name: claimed_by = caller, user_id = NULL, guest_name set
//   signed-out guest:         claimed_by = NULL,   user_id = NULL, guest_name set
// claimed_by is always session-resolved; the purchased_by target is a payload
// field but only an attribution target — eligibility is re-verified against
// the live follow/block graph before insert.
async function resolveClaimIdentity(
  rawGuestName: string | null,
  purchasedBy: string | null
): Promise<
  | {
      callerUserId: string | null;
      purchaserUserId: string | null;
      guestName: string | null;
    }
  | { error: ActionResponse }
> {
  const session = await auth();
  const trimmed = rawGuestName?.trim() ?? '';
  if (session?.user?.email) {
    const sessionUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (!sessionUser) {
      return {
        error: { success: false, message: 'User not found', error: 'Unauthorized' },
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
        callerUserId: sessionUser.id,
        purchaserUserId: purchasedBy,
        guestName: null,
      };
    }
    return trimmed
      ? { callerUserId: sessionUser.id, purchaserUserId: null, guestName: trimmed }
      : {
          callerUserId: sessionUser.id,
          purchaserUserId: sessionUser.id,
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
  return { callerUserId: null, purchaserUserId: null, guestName: trimmed };
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
    // callerUserId authorizes the request (the viewability/block gate below)
    // and is stored as claimed_by; purchaserUserId + guestName identify the
    // purchaser we STORE for the claim.
    const { callerUserId, purchaserUserId, guestName } = identity;

    // Gate by viewability: items on lists the caller can't see are unclaimable.
    // Indistinguishable from a missing item on purpose. Gated on the
    // authenticated caller (not the stored attribution) so a blocked caller
    // cannot slip a claim through the on-behalf path.
    const viewable = await isItemViewable(data.item_id, callerUserId);
    if (!viewable) {
      return {
        success: false,
        message: 'Item not found',
        error: 'Item not found',
      };
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, data.item_id),
      columns: { quantity_limit: true, user_id: true },
    });
    if (!item) {
      return {
        success: false,
        message: 'Item not found',
        error: 'Item not found',
      };
    }

    const isAttributed =
      !!purchaserUserId && purchaserUserId !== callerUserId;
    if (isAttributed) {
      // Re-verify the attribution target against the live graph: must be an
      // owner-mutual, no block edge with the claimer, and not the owner. The
      // client picker is presentation only. A block/unfollow can land between
      // this check and the insert below (neon-http: no transactions) —
      // residual and harmless: removal rights are row-based, and the at-claim
      // gate is best-effort by design.
      const eligible = await isEligiblePurchaser(
        item.user_id,
        // callerUserId is non-null here: purchased_by without a session is
        // rejected in resolveClaimIdentity.
        callerUserId as string,
        purchaserUserId
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
        user_id: purchases.user_id,
        guest_name: purchases.guest_name,
      })
      .from(purchases)
      .where(eq(purchases.item_id, data.item_id));

    const conflict = claimConflictResponse(
      existing,
      purchaserUserId,
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
          user_id: purchaserUserId,
          claimed_by: callerUserId,
          guest_name: guestName,
          purchased_at: new Date(),
        })
        .returning({ id: purchases.id });
      insertedId = inserted.id;
    } catch (insertError) {
      // Partial unique index trip (purchases_item_user_unique_idx): a
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

    updateTag('items');

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

type RemovePurchaseInput = { purchase_id: string; guest_name?: string | null };

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

    const session = await auth();
    let actorUserId: string | null = null;
    if (session?.user?.email) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { id: true },
      });
      actorUserId = user?.id ?? null;
    }

    const row = await db.query.purchases.findFirst({
      where: eq(purchases.id, data.purchase_id),
      columns: {
        id: true,
        item_id: true,
        user_id: true,
        claimed_by: true,
        guest_name: true,
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
      columns: { user_id: true },
    });

    if (
      !canRemovePurchase(
        row,
        targetItem?.user_id ?? null,
        actorUserId,
        data.guest_name
      )
    ) {
      return {
        success: false,
        message: 'Not your claim',
        error: 'Not your claim',
      };
    }

    await db.delete(purchases).where(eq(purchases.id, row.id));
    updateTag('items');
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
