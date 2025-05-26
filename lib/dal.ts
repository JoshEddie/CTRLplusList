import { db } from '@/db';
import { items, list_items, lists, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { unstable_cacheTag as cacheTag } from 'next/cache';
import { cache } from 'react';
import { ItemStoreTable, ItemTable, ListTable, UserTable } from './types';

// Get user by id
export const getUserById: (id: string) => Promise<UserTable | null> =
  cache(async (id: string) => {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by id:', error);
      return null;
    }
  });

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

export async function getListsByUser(
  userId: string
) {
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
) {
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

export async function getItemById(id: string, userId: string) {
  'use cache';
  cacheTag('items');
  try {
    const result = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.user_id, userId)),
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

export async function getItemsByListId(listId: string): Promise<
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
