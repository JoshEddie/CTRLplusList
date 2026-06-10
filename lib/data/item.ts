import { db } from '@/db';
import { items, list_items } from '@/db/schema';
import { sanitizePurchases } from '@/lib/data/purchase';
import { ListTable } from '@/lib/types';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

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
      hasPurchases: item.purchases.length > 0,
      purchases: sanitizePurchases(item.purchases, userId, true, showSpoilers),
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

    const lists: (ListTable & { position: number })[] = result.list_items.map(
      (li) => ({
        ...li.list,
        position: li.position,
      })
    );

    const newResult = {
      id: result.id,
      name: result.name,
      description: result.description,
      image_url: result.image_url,
      quantity_limit: result.quantity_limit,
      user_id: result.user_id,
      created_at: result.created_at,
      updated_at: result.updated_at,
      archived_at: result.archived_at,
      stores: result.stores,
      lists: lists,
    };

    return newResult;
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
