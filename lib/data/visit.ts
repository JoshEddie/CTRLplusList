import { db } from '@/db';
import { list_visits } from '@/db/schema';
import { withVisibility } from '@/lib/data/list';
import { type ListVisibility } from '@/lib/visibility';
import { and, eq, isNotNull } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

function withNestedListVisibility<
  T extends { list: { visibility: string } & Record<string, unknown> },
>(
  row: T
): Omit<T, 'list'> & {
  list: Omit<T['list'], 'visibility'> & { visibility: ListVisibility };
} {
  return { ...row, list: withVisibility(row.list) };
}

// Not cached: joins the owning profile for `list.profile.name`. No mutation
// fires `updateTag('profiles')` — the row is written out-of-band by NextAuth's
// createUser event — so caching here can pin a stale name.
export async function getBookmarkedListsByUser(userId: string) {
  try {
    const result = await db.query.list_visits.findMany({
      where: and(
        eq(list_visits.user_id, userId),
        isNotNull(list_visits.favorited_at)
      ),
      with: {
        list: {
          with: {
            profile: {
              columns: { name: true },
            },
          },
        },
      },
      orderBy: (list_visits, { desc }) => [desc(list_visits.favorited_at)],
    });
    return result.map(withNestedListVisibility);
  } catch (error) {
    console.error('Error fetching bookmarked lists:', error);
    throw new Error('Failed to fetch bookmarked lists');
  }
}

export async function getBookmarkStatus(
  listId: string,
  userId: string
): Promise<boolean> {
  'use cache';
  cacheTag('list_visits');
  try {
    const result = await db.query.list_visits.findFirst({
      where: and(
        eq(list_visits.list_id, listId),
        eq(list_visits.user_id, userId),
        isNotNull(list_visits.favorited_at)
      ),
    });
    return !!result;
  } catch (error) {
    console.error('Error fetching bookmark status:', error);
    throw new Error('Failed to fetch bookmark status');
  }
}

// Not cached: joins the owning profile (see getBookmarkedListsByUser above for
// why an uninvalidated `profiles` join keeps this read fresh-per-request).
export async function getVisitHistoryByUser(
  userId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  try {
    const result = await db.query.list_visits.findMany({
      where: and(
        eq(list_visits.user_id, userId),
        isNotNull(list_visits.last_visited_at)
      ),
      with: {
        list: {
          with: {
            profile: {
              columns: { name: true },
            },
          },
        },
      },
      orderBy: (list_visits, { desc }) => [desc(list_visits.last_visited_at)],
      limit: opts.limit,
      offset: opts.offset,
    });
    return result.map(withNestedListVisibility);
  } catch (error) {
    console.error('Error fetching visit history:', error);
    throw new Error('Failed to fetch visit history');
  }
}
