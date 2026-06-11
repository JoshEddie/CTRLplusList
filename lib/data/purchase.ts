import { db } from '@/db';
import { purchases, user_blocks, user_follows } from '@/db/schema';
import { ActionResponse, PurchaseView } from '@/lib/types';
import { and, eq, or } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

type RawPurchase = {
  id: string;
  user_id: string | null;
  claimed_by: string | null;
  guest_name: string | null;
  user: { name: string | null } | null;
  claimer: { name: string | null } | null;
};

function firstNameOf(name: string | null | undefined): string {
  if (!name) return 'Someone';
  const trimmed = name.trim();
  if (!trimmed) return 'Someone';
  return trimmed.split(/\s+/)[0];
}

export function sanitizePurchases(
  raw: RawPurchase[],
  viewerId: string | undefined,
  isOwner: boolean,
  showSpoilers: boolean = false
): PurchaseView[] {
  if (isOwner && !showSpoilers) return [];
  // First names only; 'self' keys off the purchaser (user_id), so an
  // attributed user sees the claim as their own. claimedByViewer keys off
  // claimed_by and drives the asserter's unclaim affordance.
  return raw.map((p) => {
    const isSelf = !!viewerId && p.user_id === viewerId;
    const view: PurchaseView = {
      id: p.id,
      by: isSelf ? ('self' as const) : ('other' as const),
      firstName: firstNameOf(p.user?.name ?? p.guest_name),
      claimedByViewer: !!viewerId && p.claimed_by === viewerId,
    };
    if (isOwner && p.claimed_by && p.claimed_by !== p.user_id) {
      view.claimerFirstName = firstNameOf(p.claimer?.name);
    }
    return view;
  });
}

// Not cached: authorizes a write (createPurchase attribution), so it must see
// the live follow/block graph, not a tagged snapshot.
export async function isEligiblePurchaser(
  ownerId: string,
  claimerId: string,
  targetId: string
): Promise<boolean> {
  if (targetId === ownerId) return false;
  const mutualRows = await db
    .select({ follower_id: user_follows.follower_id })
    .from(user_follows)
    .where(
      or(
        and(
          eq(user_follows.follower_id, ownerId),
          eq(user_follows.followee_id, targetId)
        ),
        and(
          eq(user_follows.follower_id, targetId),
          eq(user_follows.followee_id, ownerId)
        )
      )
    );
  const ownerFollowsTarget = mutualRows.some((r) => r.follower_id === ownerId);
  const targetFollowsOwner = mutualRows.some(
    (r) => r.follower_id === targetId
  );
  if (!ownerFollowsTarget || !targetFollowsOwner) return false;

  const blockRows = await db
    .select({ blocker_id: user_blocks.blocker_id })
    .from(user_blocks)
    .where(
      or(
        and(
          eq(user_blocks.blocker_id, claimerId),
          eq(user_blocks.blocked_id, targetId)
        ),
        and(
          eq(user_blocks.blocker_id, targetId),
          eq(user_blocks.blocked_id, claimerId)
        )
      )
    );
  return blockRows.length === 0;
}

export function duplicateClaimResponse(isAttributed: boolean): ActionResponse {
  return {
    success: false,
    message: isAttributed
      ? 'Already marked as the purchaser'
      : 'You have already claimed this item',
    error: 'Duplicate claim',
  };
}

// Best-effort pre-insert checks; the partial unique index on
// purchases (item_id, user_id) is the concurrency backstop for purchaser
// duplicates (createPurchase catches the unique violation on insert).
export function claimConflictResponse(
  existing: { user_id: string | null; guest_name: string | null }[],
  purchaserUserId: string | null,
  guestName: string | null,
  quantityLimit: number | null,
  isAttributed: boolean
): ActionResponse | null {
  const isDuplicate = existing.some((p) =>
    purchaserUserId
      ? p.user_id === purchaserUserId
      : !!guestName && p.guest_name === guestName
  );
  if (isDuplicate) return duplicateClaimResponse(isAttributed);
  if (quantityLimit !== null && existing.length >= quantityLimit) {
    return {
      success: false,
      message: 'This item is fully claimed',
      error: 'Fully claimed',
    };
  }
  return null;
}

// Removal rights matrix: the claimer (claimed_by), the purchaser (user_id),
// or the item owner (master unclaim). Unauthenticated callers keep the
// legacy guest path: a claimed_by-NULL row plus the exact stored name —
// without the name match, any guest who knew a purchase id could revoke it.
export function canRemovePurchase(
  row: {
    user_id: string | null;
    claimed_by: string | null;
    guest_name: string | null;
  },
  itemOwnerId: string | null,
  actorUserId: string | null,
  suppliedGuestName: string | null | undefined
): boolean {
  if (actorUserId) {
    return (
      row.claimed_by === actorUserId ||
      row.user_id === actorUserId ||
      itemOwnerId === actorUserId
    );
  }
  if (row.claimed_by !== null || row.user_id !== null) return false;
  const supplied = suppliedGuestName?.trim() ?? '';
  return supplied !== '' && row.guest_name === supplied;
}

export async function getItemsByPurchased(userId?: string) {
  'use cache';
  cacheTag('items');
  if (!userId) {
    return [];
  }
  try {
    const result = await db.query.purchases.findMany({
      where: eq(purchases.user_id, userId),
      with: {
        item: {
          with: {
            stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
            purchases: {
              with: {
                user: {
                  columns: {
                    name: true,
                  },
                },
                claimer: {
                  columns: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: (purchases, { desc }) => [desc(purchases.purchased_at)],
    });

    return result.map(({ item }) => ({
      ...item,
      purchases: sanitizePurchases(item.purchases, userId, false),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}
