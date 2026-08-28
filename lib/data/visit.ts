import { db } from '@/db';
import { list_visits } from '@/db/schema';
import { withOwnerAvatar } from '@/lib/data/list';
import { withProfileAvatar } from '@/lib/data/profileAvatar';
import { cacheTags } from '@/lib/cacheTags';
import { and, eq, isNotNull } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

// Not cached: adopting `'use cache'` is a freshness decision with its own tag
// audit, and this read keeps its current behaviour until one is made.
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
              columns: { id: true, name: true },
              with: withProfileAvatar,
            },
          },
        },
      },
      orderBy: (list_visits, { desc }) => [desc(list_visits.favorited_at)],
    });
    return result.map((row) => ({ ...row, list: withOwnerAvatar(row.list) }));
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
  cacheTag(cacheTags.listVisits, cacheTags.visitsOfUser(userId));
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

// Not cached: see getBookmarkedListsByUser above for why this read keeps its
// current behaviour.
export async function getVisitHistoryByUser(
  userId: string,
  opts: { limit?: number } = {}
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
              columns: { id: true, name: true },
              with: withProfileAvatar,
            },
          },
        },
      },
      orderBy: (list_visits, { desc }) => [desc(list_visits.last_visited_at)],
      limit: opts.limit,
    });
    return result.map((row) => ({ ...row, list: withOwnerAvatar(row.list) }));
  } catch (error) {
    console.error('Error fetching visit history:', error);
    throw new Error('Failed to fetch visit history');
  }
}
