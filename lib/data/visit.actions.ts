'use server';

import { db } from '@/db';
import { list_visits, lists } from '@/db/schema';
import {
  UNAUTHORIZED_RESPONSE,
  authedIdentity,
  authedUserId,
} from '@/lib/data/user.session';
import { type ActionResponse } from '@/lib/types';
import { VISIBILITY, fromDb } from '@/lib/visibility';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

export async function bookmarkList(list_id: string): Promise<ActionResponse> {
  try {
    const identity = await authedIdentity();
    if (!identity) {
      return UNAUTHORIZED_RESPONSE;
    }

    // The owner check is an ownership comparison, so it takes the profile the
    // request acts as; the row written below stays keyed by the caller's
    // account — list_visits records what a human did, whoever they act as.
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, list_id),
      columns: { profile_id: true, visibility: true },
    });
    if (
      !list ||
      (list.profile_id !== identity.activeProfile.id &&
        fromDb(list.visibility) === VISIBILITY.OWNER)
    ) {
      return {
        success: false,
        message: 'List not viewable',
        error: 'List not viewable',
      };
    }

    const now = new Date();
    await db
      .insert(list_visits)
      .values({
        user_id: identity.userId,
        list_id,
        last_visited_at: now,
        visit_count: 1,
        favorited_at: now,
      })
      .onConflictDoUpdate({
        target: [list_visits.user_id, list_visits.list_id],
        set: { favorited_at: now },
      });

    updateTags(cacheTags.visitsOfUser(identity.userId));
    return { success: true, message: 'Bookmarked' };
  } catch (error) {
    console.error('Error bookmarking list:', error);
    return { success: false, message: 'Failed to bookmark', error: 'Failed' };
  }
}

export async function unbookmarkList(list_id: string): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }

    await db
      .update(list_visits)
      .set({ favorited_at: null })
      .where(
        and(eq(list_visits.user_id, userId), eq(list_visits.list_id, list_id))
      );

    updateTags(cacheTags.visitsOfUser(userId));
    return { success: true, message: 'Bookmark removed' };
  } catch (error) {
    console.error('Error unbookmarking list:', error);
    return { success: false, message: 'Failed to unbookmark', error: 'Failed' };
  }
}

export async function clearVisitHistory(opts: {
  includeBookmarked: boolean;
}): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }

    if (opts.includeBookmarked) {
      await db.delete(list_visits).where(eq(list_visits.user_id, userId));
    } else {
      // Drop non-bookmarked rows outright; for bookmarked rows, null
      // last_visited_at so the bookmark survives but the row leaves history.
      await db
        .delete(list_visits)
        .where(
          and(eq(list_visits.user_id, userId), isNull(list_visits.favorited_at))
        );
      await db
        .update(list_visits)
        .set({ last_visited_at: null })
        .where(
          and(
            eq(list_visits.user_id, userId),
            isNotNull(list_visits.favorited_at)
          )
        );
    }

    updateTags(cacheTags.visitsOfUser(userId));
    return { success: true, message: 'History cleared' };
  } catch (error) {
    console.error('Error clearing history:', error);
    return {
      success: false,
      message: 'Failed to clear history',
      error: 'Failed',
    };
  }
}

export async function removeVisit(list_id: string): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }

    // If the row is bookmarked, clear last_visited_at so it leaves the history
    // view but the bookmark survives. Otherwise delete the row outright.
    const row = await db.query.list_visits.findFirst({
      where: and(
        eq(list_visits.user_id, userId),
        eq(list_visits.list_id, list_id)
      ),
      columns: { favorited_at: true },
    });
    if (!row) return { success: true, message: 'No history row' };

    if (row.favorited_at) {
      await db
        .update(list_visits)
        .set({ last_visited_at: null })
        .where(
          and(eq(list_visits.user_id, userId), eq(list_visits.list_id, list_id))
        );
    } else {
      await db
        .delete(list_visits)
        .where(
          and(eq(list_visits.user_id, userId), eq(list_visits.list_id, list_id))
        );
    }

    updateTags(cacheTags.visitsOfUser(userId));
    return { success: true, message: 'Removed from history' };
  } catch (error) {
    console.error('Error removing visit:', error);
    return { success: false, message: 'Failed to remove', error: 'Failed' };
  }
}
