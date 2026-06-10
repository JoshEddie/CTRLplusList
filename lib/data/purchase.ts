import { db } from '@/db';
import { purchases } from '@/db/schema';
import { PurchaseView } from '@/lib/types';
import { eq } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

type RawPurchase = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  user: { name: string | null } | null;
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
  if (isOwner && showSpoilers) {
    // Owner with spoilers: reveal claimer first names (owner can't claim own items)
    return raw.map((p) => ({
      id: p.id,
      by: 'other' as const,
      firstName: firstNameOf(p.user?.name ?? p.guest_name),
    }));
  }
  // Non-owner viewer: first names only
  return raw.map((p) => {
    const isSelf = !!viewerId && p.user_id === viewerId;
    return {
      id: p.id,
      by: isSelf ? ('self' as const) : ('other' as const),
      firstName: firstNameOf(p.user?.name ?? p.guest_name),
    };
  });
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
