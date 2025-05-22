import { db } from '@/db';
import { items, list_items, lists, users } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { unstable_cacheTag as cacheTag } from 'next/cache';
import { cache } from 'react';
import { ItemStoreTable, ItemTable, ListTable, UserTable } from './types';

// Current user
export const getCurrentUser: () => Promise<Omit<UserTable, 'password'> | null> =
  cache(async () => {
    const session = await getSession();
    if (!session) return null;

    // Skip database query during prerendering if we don't have a session
    // hack until we have PPR https://nextjs.org/docs/app/building-your-application/rendering/partial-prerendering
    if (
      typeof window === 'undefined' &&
      process.env.NEXT_PHASE === 'phase-production-build'
    ) {
      return null;
    }

    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, session.userId));

      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  });

// Get user by email
export const getUserByEmail: (email: string) => Promise<UserTable | null> =
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
export async function getList(id: number) {
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

export async function getLists(): Promise<
  (ListTable & { user: Omit<UserTable, 'password'> })[]
> {
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

export async function getListsByUser(
  userId: string
): Promise<(ListTable & { user: Omit<UserTable, 'password'> })[]> {
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
  userId: string
): Promise<(ItemTable & { stores: ItemStoreTable[] })[]> {
  'use cache';
  cacheTag('items');
  try {
    const result = await db.query.items.findMany({
      where: eq(items.user_id, userId),
      with: {
        stores: true,
      },
      orderBy: (items, { desc }) => [desc(items.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

export async function getItemById(id: number): Promise<
  ItemTable & {
    stores: ItemStoreTable[];
    lists: (ListTable & { position: number })[];
  }
> {
  'use cache';
  cacheTag('items');
  try {
    const result = await db.query.items.findFirst({
      where: eq(items.id, id),
      with: {
        stores: true,
        list_items: {
          with: {
            list: true,
          },
        },
      },
      orderBy: (items, { desc }) => [desc(items.created_at)],
    });

    if (!result) {
      throw new Error(`Item with id ${id} not found`);
    }

    const lists: (ListTable & { position: number })[] =
      result.list_items?.map((li) => ({
        ...li.list,
        position: li.position,
      })) || [];

    // Transform the data to match ItemWithLists type
    // const transformedResult = {
    //   ...result,
    //   lists: result.list_items?.map(li => ({
    //     id: li.list.id,
    //     name: li.list.name
    //   })) || []
    // };

    const newResult = {
      id: result.id,
      name: result.name,
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

export async function getItemsByListId(listId: number): Promise<
  (ItemTable & { stores: ItemStoreTable[] })[]
> {
  'use cache';
  cacheTag('items');
  try {
    const result = await db.query.list_items.findMany({
      where: eq(list_items.list_id, listId),
      with: {
        item: {
          with: {
            stores: true,
          },
        },
      },
      orderBy: (list_items, { asc }) => [asc(list_items.position)],
    });

    // Transform the result to match the expected format
    return result.map(({ item }) => ({
      ...item,
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw new Error('Failed to fetch items');
  }
}
