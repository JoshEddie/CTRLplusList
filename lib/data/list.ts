import { db } from '@/db';
import { lists } from '@/db/schema';
import {
  VISIBILITY,
  fromDb,
  visibilityDbValues,
  type ListVisibility,
} from '@/lib/visibility';
import { and, eq, inArray } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

// The data layer is the translation boundary: raw lists.visibility strings are
// decoded to canonical ListVisibility constants before any row escapes it.
export function withVisibility<T extends { visibility: string }>(
  row: T
): Omit<T, 'visibility'> & { visibility: ListVisibility } {
  return { ...row, visibility: fromDb(row.visibility) };
}

// Fetcher functions for React Query
export async function getList(id: string) {
  'use cache';
  cacheTag('lists');
  cacheTag('items');
  try {
    const result = await db.query.lists.findFirst({
      where: eq(lists.id, id),
      with: {
        user: true,
        // Load only item_id from list_items so the hero can compute item
        // count via `result.items.length` without a separate DAL call.
        // Minimal column projection keeps the payload small even for very
        // large lists.
        items: {
          columns: { item_id: true },
        },
      },
    });
    return result ? withVisibility(result) : result;
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
    return result.map(withVisibility);
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
      orderBy: (lists, { desc }) => [desc(lists.updated_at)],
    });
    return result.map(withVisibility);
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

export async function getListsSharedByUser(userId: string) {
  'use cache';
  cacheTag('lists');
  try {
    const result = await db.query.lists.findMany({
      where: and(
        inArray(
          lists.visibility,
          visibilityDbValues([VISIBILITY.LINK, VISIBILITY.FOLLOWERS])
        ),
        eq(lists.user_id, userId)
      ),
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
    return result.map(withVisibility);
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

// Not cached: joins `users` for owner name/image.
export async function getPublicListsByUser(
  userId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  try {
    const result = await db.query.lists.findMany({
      where: and(
        eq(lists.user_id, userId),
        inArray(lists.visibility, visibilityDbValues([VISIBILITY.FOLLOWERS]))
      ),
      with: {
        user: {
          columns: { id: true, name: true, image: true },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.shared_at)],
      limit: opts.limit,
      offset: opts.offset,
    });
    return result.map(withVisibility);
  } catch (error) {
    console.error('Error fetching public lists:', error);
    throw new Error('Failed to fetch public lists');
  }
}
