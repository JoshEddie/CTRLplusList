'use server';

import { db } from '@/db';
import { user_blocks, user_follows } from '@/db/schema';
import { signIn, signOut } from '@/lib/auth';
import {
  UNAUTHORIZED_RESPONSE,
  authedUserId,
} from '@/lib/data/user.session';
import { type ActionResponse } from '@/lib/types';
import { and, eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signInUser() {
  await signIn('google');
}

export async function signOutUser() {
  await signOut({ redirect: false });
  redirect('/sign-in');
}

export async function followUser(followee_id: string): Promise<ActionResponse> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) {
      return UNAUTHORIZED_RESPONSE;
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
      return UNAUTHORIZED_RESPONSE;
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
      return UNAUTHORIZED_RESPONSE;
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

export async function blockUser(blocked_id: string): Promise<ActionResponse> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) {
      return UNAUTHORIZED_RESPONSE;
    }
    if (viewerId === blocked_id) {
      return {
        success: false,
        message: 'Cannot block yourself',
        error: 'Invalid',
      };
    }

    // Sequential statements, block-first: the neon-http driver does not
    // support interactive transactions, so cross-statement atomicity comes
    // from idempotent ordering + DB constraints. Insert the block row first
    // so a racing followUser is gated by the block-check before the follow
    // rows are removed. See harden-remaining-server-actions design Decision 2.
    await db
      .insert(user_blocks)
      .values({ blocker_id: viewerId, blocked_id })
      .onConflictDoNothing();
    await db
      .delete(user_follows)
      .where(
        and(
          eq(user_follows.follower_id, viewerId),
          eq(user_follows.followee_id, blocked_id)
        )
      );
    await db
      .delete(user_follows)
      .where(
        and(
          eq(user_follows.follower_id, blocked_id),
          eq(user_follows.followee_id, viewerId)
        )
      );

    updateTag('user_follows');
    updateTag('user_blocks');
    return { success: true, message: 'User blocked' };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, message: 'Failed to block', error: 'Failed' };
  }
}

export async function unblockUser(blocked_id: string): Promise<ActionResponse> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) {
      return UNAUTHORIZED_RESPONSE;
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
