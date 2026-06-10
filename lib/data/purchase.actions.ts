'use server';

import { db } from '@/db';
import { items, purchases, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { type ActionResponse } from '@/lib/data/item.actions';
import { isItemViewable } from '@/lib/listAccess';
import { sqlstateOf } from '@/lib/sqlstate';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { updateTag } from 'next/cache';

// Postgres unique-violation error code.
const PG_UNIQUE_VIOLATION = '23505';

// Resolve who a createPurchase claim is authorized AS vs stored AS. An
// authenticated caller supplying a non-empty guest_name is recording a claim
// "on behalf of" that named third party ("Someone else"): it is authorized by
// their session (callerUserId) but stored as a guest claim (actorUserId NULL,
// guestName set) so the claim belongs to the named person, not the caller. A
// self-claim (no guest_name) is stored under the caller's own id. No user_id is
// ever taken from the payload — the third party is a free-text name, never an
// account.
async function resolveClaimIdentity(
  rawGuestName: string | null
): Promise<
  | { callerUserId: string | null; actorUserId: string | null; guestName: string | null }
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
    return trimmed
      ? { callerUserId: sessionUser.id, actorUserId: null, guestName: trimmed }
      : { callerUserId: sessionUser.id, actorUserId: sessionUser.id, guestName: null };
  }
  if (!trimmed) {
    return {
      error: {
        success: false,
        message: 'Cannot identify which claim to add',
        error: 'Missing identity',
      },
    };
  }
  return { callerUserId: null, actorUserId: null, guestName: trimmed };
}

export async function createPurchase(data: {
  item_id: string;
  guest_name: string | null;
}): Promise<ActionResponse> {
  try {
    const identity = await resolveClaimIdentity(data.guest_name);
    if ('error' in identity) {
      return identity.error;
    }
    // callerUserId authorizes the request (the viewability/block gate below);
    // actorUserId + guestName are what we STORE for the claim.
    const { callerUserId, actorUserId, guestName } = identity;

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
      columns: { quantity_limit: true },
    });
    if (!item) {
      return {
        success: false,
        message: 'Item not found',
        error: 'Item not found',
      };
    }

    const existing = await db
      .select({
        id: purchases.id,
        user_id: purchases.user_id,
        guest_name: purchases.guest_name,
      })
      .from(purchases)
      .where(eq(purchases.item_id, data.item_id));

    const isDuplicate = existing.some((p) =>
      actorUserId
        ? p.user_id === actorUserId
        : !!guestName && p.guest_name === guestName
    );
    if (isDuplicate) {
      return {
        success: false,
        message: 'You have already claimed this item',
        error: 'Duplicate claim',
      };
    }

    if (
      item.quantity_limit !== null &&
      existing.length >= item.quantity_limit
    ) {
      return {
        success: false,
        message: 'This item is fully claimed',
        error: 'Fully claimed',
      };
    }

    try {
      await db.insert(purchases).values({
        id: nanoid(),
        item_id: data.item_id,
        user_id: actorUserId,
        guest_name: guestName,
        purchased_at: new Date(),
      });
    } catch (insertError) {
      // Partial unique index trip (purchases_item_user_unique_idx): a
      // duplicate claim by the same authenticated user slipped past the
      // in-app check because two requests raced against distinct DB
      // sessions. The capacity-race for guest claims / different users on a
      // limited item is not closed at the DB layer (neon-http driver does
      // not support interactive transactions, so SELECT … FOR UPDATE is not
      // available). Accepted as a known limitation.
      if (sqlstateOf(insertError) === PG_UNIQUE_VIOLATION) {
        return {
          success: false,
          message: 'You have already claimed this item',
          error: 'Duplicate claim',
        };
      }
      throw insertError;
    }

    updateTag('items');

    return { success: true, message: 'Item marked as purchased successfully' };
  } catch (error) {
    console.error('Error creating purchase:', error);
    return {
      success: false,
      message: 'An error occurred while marking the item as purchased',
      error: 'Failed to create purchase',
    };
  }
}

type RemovePurchaseInput =
  | { purchase_id: string; guest_name?: string | null }
  | { item_id: string; guest_name?: string | null };

// Guests must own a guest row AND supply the matching name, else any guest who
// knew a purchase id could revoke it.
function canRemovePurchase(
  row: { user_id: string | null; guest_name: string | null },
  actorUserId: string | null,
  suppliedGuestName: string | null | undefined
): boolean {
  if (actorUserId) return row.user_id === actorUserId;
  if (row.user_id !== null) return false;
  const supplied = suppliedGuestName?.trim() ?? '';
  return supplied !== '' && row.guest_name === supplied;
}

export async function removePurchase(
  data: RemovePurchaseInput
): Promise<ActionResponse> {
  try {
    const session = await auth();
    let actorUserId: string | null = null;
    if (session?.user?.email) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { id: true },
      });
      actorUserId = user?.id ?? null;
    }

    if ('purchase_id' in data && data.purchase_id) {
      const row = await db.query.purchases.findFirst({
        where: eq(purchases.id, data.purchase_id),
        columns: { id: true, user_id: true, guest_name: true },
      });
      if (!row) {
        return {
          success: false,
          message: 'Claim not found',
          error: 'Not found',
        };
      }

      if (!canRemovePurchase(row, actorUserId, data.guest_name)) {
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
    }

    // Legacy item-scoped path: only authenticated callers are permitted.
    // Guests must use the purchase_id shape (see spec).
    if (!('item_id' in data) || !data.item_id) {
      return {
        success: false,
        message: 'Cannot identify which claim to remove',
        error: 'Missing identity',
      };
    }
    if (!actorUserId) {
      return {
        success: false,
        message: 'Cannot identify which claim to remove',
        error: 'Missing identity',
      };
    }

    await db
      .delete(purchases)
      .where(
        and(
          eq(purchases.item_id, data.item_id),
          eq(purchases.user_id, actorUserId)
        )
      );

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
