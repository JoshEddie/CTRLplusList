'use server';

import { db } from '@/db';
import { user_blocks, user_follows, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { and, eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';

export type ActionResponse = {
  success: boolean;
  message: string;
  error?: string;
};

async function authedUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const u = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: { id: true },
  });
  return u?.id ?? null;
}

export async function followUser(
  followee_id: string
): Promise<ActionResponse> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }
    if (viewerId === followee_id) {
      return {
        success: false,
        message: 'Cannot follow yourself',
        error: 'Invalid',
      };
    }

    // Either-direction block prevents follow.
    const blocked = await db.query.user_blocks.findFirst({
      where: (b, { or, and: andOp, eq: eqOp }) =>
        or(
          andOp(eqOp(b.blocker_id, viewerId), eqOp(b.blocked_id, followee_id)),
          andOp(eqOp(b.blocker_id, followee_id), eqOp(b.blocked_id, viewerId))
        ),
    });
    if (blocked) {
      return {
        success: false,
        message: 'Cannot follow this user',
        error: 'Blocked',
      };
    }

    await db
      .insert(user_follows)
      .values({ follower_id: viewerId, followee_id })
      .onConflictDoNothing();

    updateTag('user_follows');
    return { success: true, message: 'Following' };
  } catch (error) {
    console.error('Error following user:', error);
    return { success: false, message: 'Failed to follow', error: 'Failed' };
  }
}

export async function unfollowUser(
  followee_id: string
): Promise<ActionResponse> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }

    await db
      .delete(user_follows)
      .where(
        and(
          eq(user_follows.follower_id, viewerId),
          eq(user_follows.followee_id, followee_id)
        )
      );

    updateTag('user_follows');
    return { success: true, message: 'Unfollowed' };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return { success: false, message: 'Failed to unfollow', error: 'Failed' };
  }
}

export async function removeFollower(
  follower_id: string
): Promise<ActionResponse> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }

    await db
      .delete(user_follows)
      .where(
        and(
          eq(user_follows.follower_id, follower_id),
          eq(user_follows.followee_id, viewerId)
        )
      );

    updateTag('user_follows');
    return { success: true, message: 'Follower removed' };
  } catch (error) {
    console.error('Error removing follower:', error);
    return {
      success: false,
      message: 'Failed to remove follower',
      error: 'Failed',
    };
  }
}

export async function blockUser(
  blocked_id: string
): Promise<ActionResponse> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }
    if (viewerId === blocked_id) {
      return {
        success: false,
        message: 'Cannot block yourself',
        error: 'Invalid',
      };
    }

    await db.transaction(async (tx) => {
      // Remove any existing follows in both directions.
      await tx
        .delete(user_follows)
        .where(
          and(
            eq(user_follows.follower_id, viewerId),
            eq(user_follows.followee_id, blocked_id)
          )
        );
      await tx
        .delete(user_follows)
        .where(
          and(
            eq(user_follows.follower_id, blocked_id),
            eq(user_follows.followee_id, viewerId)
          )
        );
      // Upsert the block row.
      await tx
        .insert(user_blocks)
        .values({ blocker_id: viewerId, blocked_id })
        .onConflictDoNothing();
    });

    updateTag('user_follows');
    updateTag('user_blocks');
    return { success: true, message: 'User blocked' };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, message: 'Failed to block', error: 'Failed' };
  }
}

export async function unblockUser(
  blocked_id: string
): Promise<ActionResponse> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }

    await db
      .delete(user_blocks)
      .where(
        and(
          eq(user_blocks.blocker_id, viewerId),
          eq(user_blocks.blocked_id, blocked_id)
        )
      );

    updateTag('user_blocks');
    return { success: true, message: 'User unblocked' };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, message: 'Failed to unblock', error: 'Failed' };
  }
}

export async function markFollowingSeen(): Promise<ActionResponse> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }

    await db
      .update(users)
      .set({ last_seen_following_at: new Date() })
      .where(eq(users.id, viewerId));

    updateTag('user_follows');
    return { success: true, message: 'Marked seen' };
  } catch (error) {
    console.error('Error marking following seen:', error);
    return { success: false, message: 'Failed', error: 'Failed' };
  }
}
