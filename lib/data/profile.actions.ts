'use server';

import { db } from '@/db';
import { user_blocks, user_follows } from '@/db/schema';
import { selfMemberships } from '@/lib/data/profile.identity';
import {
  UNAUTHORIZED_RESPONSE,
  authedIdentity,
  authedUserId,
} from '@/lib/data/user.session';
import { type ActionResponse } from '@/lib/types';
import { and, eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';

export async function followUser(
  followee_profile_id: string
): Promise<ActionResponse> {
  try {
    const viewer = await authedIdentity();
    if (!viewer) {
      return UNAUTHORIZED_RESPONSE;
    }
    if (viewer.profile.id === followee_profile_id) {
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
          andOp(
            eqOp(b.blocker_profile_id, viewer.profile.id),
            eqOp(b.blocked_profile_id, followee_profile_id)
          ),
          andOp(
            eqOp(b.blocker_profile_id, followee_profile_id),
            eqOp(b.blocked_profile_id, viewer.profile.id)
          )
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
      .values({ follower_id: viewer.userId, followee_profile_id })
      .onConflictDoNothing();

    updateTag('user_follows');
    return { success: true, message: 'Following' };
  } catch (error) {
    console.error('Error following user:', error);
    return { success: false, message: 'Failed to follow', error: 'Failed' };
  }
}

export async function unfollowUser(
  followee_profile_id: string
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
          eq(user_follows.followee_profile_id, followee_profile_id)
        )
      );

    updateTag('user_follows');
    return { success: true, message: 'Unfollowed' };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return { success: false, message: 'Failed to unfollow', error: 'Failed' };
  }
}

export async function blockUser(
  blocked_profile_id: string
): Promise<ActionResponse> {
  try {
    const viewer = await authedIdentity();
    if (!viewer) {
      return UNAUTHORIZED_RESPONSE;
    }
    if (viewer.profile.id === blocked_profile_id) {
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
    // rows are removed. Every statement of the mutation, the membership lookup
    // included, stays behind it so none of them widens that race by a
    // round-trip; only actor resolution, which the session seam requires up
    // front, runs ahead of it.
    // See harden-remaining-server-actions design Decision 2.
    await db
      .insert(user_blocks)
      .values({
        blocker_profile_id: viewer.profile.id,
        blocked_profile_id,
      })
      .onConflictDoNothing();
    await db
      .delete(user_follows)
      .where(
        and(
          eq(user_follows.follower_id, viewer.userId),
          eq(user_follows.followee_profile_id, blocked_profile_id)
        )
      );
    // The reverse edge is keyed by the blocked profile's account: a managed
    // profile has none and owns no follow edges.
    const [blockedAccount] = await db
      .select({ user_id: selfMemberships.user_id })
      .from(selfMemberships)
      .where(eq(selfMemberships.profile_id, blocked_profile_id));
    if (blockedAccount?.user_id) {
      await db
        .delete(user_follows)
        .where(
          and(
            eq(user_follows.follower_id, blockedAccount.user_id),
            eq(user_follows.followee_profile_id, viewer.profile.id)
          )
        );
    }

    updateTag('user_follows');
    updateTag('user_blocks');
    return { success: true, message: 'User blocked' };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, message: 'Failed to block', error: 'Failed' };
  }
}

export async function unblockUser(
  blocked_profile_id: string
): Promise<ActionResponse> {
  try {
    const viewer = await authedIdentity();
    if (!viewer) {
      return UNAUTHORIZED_RESPONSE;
    }

    await db
      .delete(user_blocks)
      .where(
        and(
          eq(user_blocks.blocker_profile_id, viewer.profile.id),
          eq(user_blocks.blocked_profile_id, blocked_profile_id)
        )
      );

    updateTag('user_blocks');
    return { success: true, message: 'User unblocked' };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, message: 'Failed to unblock', error: 'Failed' };
  }
}
