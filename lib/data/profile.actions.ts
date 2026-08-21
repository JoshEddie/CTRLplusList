'use server';

import { db } from '@/db';
import {
  ACCENT_PREFERENCE_ID,
  profile_members,
  profile_preferences,
  profiles,
  user_blocks,
  user_follows,
} from '@/db/schema';
import { selfMemberships } from '@/lib/data/profile.identity';
import {
  ProfileSettingsSchema,
  type ProfileSettingsData,
} from '@/lib/data/profile.schema';
import {
  UNAUTHORIZED_RESPONSE,
  authedIdentity,
  authedUserId,
} from '@/lib/data/user.session';
import { type ActionResponse } from '@/lib/types';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
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


// Deliberately not atomic with the profile and membership rows: a profile
// without its accent renders the fallback and its owner can write one, while a
// profile without its membership row is unreachable by anyone. The fixability
// criterion on 2026-08-18-atomic-writes-in-one-cte is what splits them, so this
// raises nothing and reports instead — creation ignores the report and
// succeeds, an edit surfaces it rather than claiming a colour it did not save.
async function writeAccent(profileId: string, accent: string) {
  try {
    await db
      .insert(profile_preferences)
      .values({
        profile_id: profileId,
        preference_id: ACCENT_PREFERENCE_ID,
        value: accent,
      })
      .onConflictDoUpdate({
        target: [
          profile_preferences.profile_id,
          profile_preferences.preference_id,
        ],
        set: { value: accent },
      });
    // Fired here rather than by each caller so the tag tracks the write that
    // lands the row: a failure below invalidates nothing.
    updateTag('profile_preferences');
    return true;
  } catch (error) {
    console.error('Error writing profile accent:', error);
    return false;
  }
}

export async function createProfile(
  data: ProfileSettingsData
): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }

    const validationResult = ProfileSettingsSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }
    const { name, tagline, accent } = validationResult.data;

    const id = nanoid();
    const created = db.$with('created').as(
      db
        .insert(profiles)
        .values({ id, name, tagline })
        .returning({ id: profiles.id })
    );

    // Both rows in one statement — the only atomicity neon-http offers. A
    // membership row is the sole handle onto a profile, so a second statement
    // that failed would strand this one as a permanent orphan. No 23505 catch,
    // unlike createSelfProfile: nothing constrains how many managed profiles
    // an account owns, so a duplicate name is a second profile, not a repeat.
    await db
      .with(created)
      .insert(profile_members)
      .select(
        // Every column, in table order: drizzle rejects an insert-select whose
        // projection is not the table's own.
        db
          .select({
            user_id: sql<string>`${userId}`.as('user_id'),
            profile_id: created.id,
            role: sql<string>`'owner'`.as('role'),
            ride_along: sql<boolean>`false`.as('ride_along'),
            created_at: sql<Date>`now()`.as('created_at'),
          })
          .from(created)
      );

    // Report ignored on purpose: the profile exists and renders the fallback.
    await writeAccent(id, accent);

    updateTag('profiles');
    updateTag('profile_members');

    return { success: true, message: 'Profile created', id };
  } catch (error) {
    console.error('Error creating profile:', error);
    return {
      success: false,
      message: 'An error occurred while creating the profile',
      error: 'Failed to create profile',
    };
  }
}

export async function updateProfileSettings(
  profileId: string,
  data: ProfileSettingsData
): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }

    // Identity is an ownership act, so the check is on the role this account
    // holds on this profile, not on what the page rendered: a manager who
    // submits by any other means lands here too.
    const [membership] = await db
      .select({ role: profile_members.role })
      .from(profile_members)
      .where(
        and(
          eq(profile_members.user_id, userId),
          eq(profile_members.profile_id, profileId)
        )
      );
    if (membership?.role !== 'self' && membership?.role !== 'owner') {
      return UNAUTHORIZED_RESPONSE;
    }

    const validationResult = ProfileSettingsSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }
    const { name, tagline, accent } = validationResult.data;

    await db
      .update(profiles)
      .set({ name, tagline, updated_at: new Date() })
      .where(eq(profiles.id, profileId));

    const accentWritten = await writeAccent(profileId, accent);

    updateTag('profiles');

    if (!accentWritten) {
      return {
        success: false,
        message: 'Name and tagline were saved, but the accent was not',
        error: 'Failed to update profile',
      };
    }

    return { success: true, message: 'Profile updated', id: profileId };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      message: 'An error occurred while updating the profile',
      error: 'Failed to update profile',
    };
  }
}
