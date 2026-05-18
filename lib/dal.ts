import { db } from '@/db';
import {
  items,
  list_items,
  lists,
  purchases,
  saved_lists,
  users,
} from '@/db/schema';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { cache } from 'react';
import { ListTable, PurchaseView, UserTable } from './types';

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

function sanitizePurchases(
  raw: RawPurchase[] | undefined,
  viewerId: string | undefined,
  isOwner: boolean,
  showSpoilers: boolean = false
): PurchaseView[] {
  if (!raw) return [];
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

// Get user by id
export const getUserById: (id: string) => Promise<UserTable | null> = cache(
  async (id: string) => {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by id:', error);
      return null;
    }
  }
);

// Get user by email
export const getUserIdByEmail: (email: string) => Promise<UserTable | null> =
  cache(async (email: string) => {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  });

// Fetcher functions for React Query
export async function getList(id: string) {
  'use cache';
  cacheTag('lists');
  try {
    const result = await db.query.lists.findFirst({
      where: eq(lists.id, id),
      with: {
        user: true,
      },
    });
    return result;
  } catch (error) {
    console.error(`Error fetching list ${id}:`, error);
    throw new Error('Failed to fetch list');
  }
}

export async function getLists() {
  'use cache';
  cacheTag('lists');
  try {
    const result = await db.query.lists.findMany({
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

export async function getListsByUser(userId: string) {
  'use cache';
  cacheTag('lists');
  try {
    const result = await db.query.lists.findMany({
      where: eq(lists.user_id, userId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

export async function getItemsByUser(
  userId: string,
  opts: {
    filter?: 'active' | 'archived' | 'all';
    showSpoilers?: boolean;
  } = {}
) {
  'use cache';
  cacheTag('items');
  try {
    const filter = opts.filter ?? 'active';
    const showSpoilers = opts.showSpoilers ?? false;
    const where =
      filter === 'active'
        ? and(eq(items.user_id, userId), isNull(items.archived_at))
        : filter === 'archived'
          ? and(eq(items.user_id, userId), isNotNull(items.archived_at))
          : eq(items.user_id, userId);

    const result = await db.query.items.findMany({
      where,
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
      orderBy: (items, { desc }) => [desc(items.created_at)],
    });

    return result.map((item) => ({
      ...item,
      hasPurchases: (item.purchases?.length ?? 0) > 0,
      purchases: sanitizePurchases(
        item.purchases,
        userId,
        true,
        showSpoilers
      ),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

export async function getItemById(id: string, userId: string) {
  'use cache';
  cacheTag('items');
  try {
    const result = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.user_id, userId)),
      with: {
        stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
        list_items: {
          with: {
            list: true,
          },
        },
      },
      orderBy: (items, { desc }) => [desc(items.created_at)],
    });

    if (!result) {
      return result;
    }

    const lists: (ListTable & { position: number })[] =
      result.list_items?.map((li) => ({
        ...li.list,
        position: li.position,
      })) || [];

    const newResult = {
      id: result.id,
      name: result.name,
      description: result.description,
      image_url: result.image_url,
      quantity_limit: result.quantity_limit,
      user_id: result.user_id,
      created_at: result.created_at,
      updated_at: result.updated_at,
      stores: result.stores,
      lists: lists,
    };

    return newResult;
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
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

export async function getItemsByListId(
  listId: string,
  opts: {
    viewerId?: string;
    isOwner?: boolean;
    showSpoilers?: boolean;
  } = {}
) {
  'use cache';
  cacheTag('items');
  try {
    const result = await db.query.list_items.findMany({
      where: eq(list_items.list_id, listId),
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
      orderBy: (list_items, { asc }) => [asc(list_items.position)],
    });

    return result.map(({ item }) => ({
      ...item,
      purchases: sanitizePurchases(
        item.purchases,
        opts.viewerId,
        opts.isOwner ?? false,
        opts.showSpoilers ?? false
      ),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw new Error('Failed to fetch items');
  }
}

export async function getListsSharedByUser(userId: string) {
  'use cache';
  cacheTag('lists');
  try {
    const result = await db.query.lists.findMany({
      where: and(eq(lists.shared, true), eq(lists.user_id, userId)),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

export async function getSavedListsByUser(userId: string) {
  'use cache';
  cacheTag('saved_lists');
  try {
    const result = await db.query.saved_lists.findMany({
      where: eq(saved_lists.user_id, userId),
      with: {
        list: {
          with: {
            user: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
    });
    return result;
  } catch (error) {
    console.error('Error fetching saved lists:', error);
    throw new Error('Failed to fetch saved lists');
  }
}

export async function getSavedStatus(
  listId: string,
  userId: string
): Promise<{ list_id: string; user_id: string; id: string } | undefined> {
  'use cache';
  cacheTag('saved_lists');
  try {
    const result = await db.query.saved_lists.findFirst({
      where: and(
        eq(saved_lists.list_id, listId),
        eq(saved_lists.user_id, userId)
      ),
    });

    if (!result) {
      return undefined;
    }

    return result;
  } catch (error) {
    console.error('Error fetching saved status:', error);
    throw new Error('Failed to fetch saved status');
  }
}
