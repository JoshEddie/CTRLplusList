'use server';

// TODO(#343): extract the duplicated literal to a constant, then drop this disable
/* eslint-disable sonarjs/no-duplicate-string */

import { db } from '@/db';
import {
  profile_members,
  profiles,
  user_blocks,
  user_follows,
} from '@/db/schema';
import { selfMemberships } from '@/lib/data/profile.identity';
import { ROLES } from '@/lib/data/profile.roles';
import {
  ProfileFieldsSchema,
  ProfileIdentitySchema,
  ProfileSettingsSchema,
  type ProfileFieldsData,
  type ProfileIdentityData,
  type ProfileSettingsData,
} from '@/lib/data/profile.schema';
import {
  ACTIVE_PROFILE_COOKIE,
  ACTIVE_PROFILE_COOKIE_ATTRIBUTES,
} from '@/lib/data/profile.cookie';
import {
  FORBIDDEN_RESPONSE,
  ownsProfile,
  stampActedAs,
  writableMembership,
} from '@/lib/data/profile.gate';
import {
  UNAUTHORIZED_RESPONSE,
  authedIdentity,
  authedUserId,
} from '@/lib/data/user.session';
import { type ActionResponse } from '@/lib/types';
import { writeAltvatar } from '@/lib/data/profileAvatar.write';
import {
  writeAccent,
  writeMemberTier,
} from '@/lib/data/profilePreference.write';
import { PROTECTED_TIER } from '@/lib/spoilers';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { refresh } from 'next/cache';
import { cookies } from 'next/headers';

export async function followUser(
  followee_profile_id: string
): Promise<ActionResponse> {
  try {
    const viewer = await authedIdentity();
    if (!viewer) {
      return UNAUTHORIZED_RESPONSE;
    }
    if (viewer.selfProfile.id === followee_profile_id) {
      return {
        success: false,
        message: 'Cannot follow yourself',
        error: 'Invalid',
      };
    }

    // Either-direction block prevents follow. The gate names the viewer by
    // their self-profile: a block belongs to the human who made it, so it
    // means the same thing whatever profile they are acting as.
    const blocked = await db.query.user_blocks.findFirst({
      where: (b, { or, and: andOp, eq: eqOp }) =>
        or(
          andOp(
            eqOp(b.blocker_profile_id, viewer.selfProfile.id),
            eqOp(b.blocked_profile_id, followee_profile_id)
          ),
          andOp(
            eqOp(b.blocker_profile_id, followee_profile_id),
            eqOp(b.blocked_profile_id, viewer.selfProfile.id)
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

    updateTags(
      cacheTags.followsOfUser(viewer.userId),
      cacheTags.followersOfProfile(followee_profile_id)
    );
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

    updateTags(
      cacheTags.followsOfUser(viewerId),
      cacheTags.followersOfProfile(followee_profile_id)
    );
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
    if (viewer.selfProfile.id === blocked_profile_id) {
      return {
        success: false,
        message: 'Cannot block yourself',
        error: 'Invalid',
      };
    }

    // The blocker end is always the acting account's self-profile, whatever
    // profile they act as — a block is an act by a human, and exactly one row
    // is written however many profiles either party runs.
    //
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
        blocker_profile_id: viewer.selfProfile.id,
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
            eq(user_follows.followee_profile_id, viewer.selfProfile.id)
          )
        );
    }

    updateTags(
      cacheTags.blocksOfProfile(viewer.selfProfile.id),
      cacheTags.blocksOfProfile(blocked_profile_id),
      cacheTags.followsOfUser(viewer.userId),
      cacheTags.followersOfProfile(blocked_profile_id),
      cacheTags.followersOfProfile(viewer.selfProfile.id)
    );
    if (blockedAccount?.user_id) {
      updateTags(cacheTags.followsOfUser(blockedAccount.user_id));
    }
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
          eq(user_blocks.blocker_profile_id, viewer.selfProfile.id),
          eq(user_blocks.blocked_profile_id, blocked_profile_id)
        )
      );

    updateTags(
      cacheTags.blocksOfProfile(viewer.selfProfile.id),
      cacheTags.blocksOfProfile(blocked_profile_id)
    );
    return { success: true, message: 'User unblocked' };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, message: 'Failed to unblock', error: 'Failed' };
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
    const { name, tagline, accent, altvatar } = validationResult.data;

    const id = nanoid();
    const created = db
      .$with('created')
      .as(
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
        // projection is not the table's own. `last_active_at` is NULL because a
        // membership just created has never been acted as.
        db
          .select({
            user_id: sql<string>`${userId}`.as('user_id'),
            profile_id: created.id,
            role: sql<string>`${ROLES.owner.value}`.as('role'),
            ride_along: sql<boolean>`false`.as('ride_along'),
            last_active_at: sql<Date | null>`NULL`.as('last_active_at'),
            created_at: sql<Date>`now()`.as('created_at'),
          })
          .from(created)
      );

    // Reports ignored on purpose: the profile exists, and each of these
    // failing leaves it rendering the fallback its own capability defines. The
    // creator's tier is written seeded from full protection — a profile being
    // born carries no default yet — and its absence would resolve there anyway.
    await writeAccent(id, accent);
    await writeAltvatar(id, altvatar);
    await writeMemberTier(id, userId, PROTECTED_TIER);

    updateTags(cacheTags.profilesOfUser(userId));

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
  data: ProfileFieldsData
): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }
    if (!(await ownsProfile(userId, profileId))) {
      return UNAUTHORIZED_RESPONSE;
    }

    const validationResult = ProfileFieldsSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }
    const { name, tagline } = validationResult.data;

    await db
      .update(profiles)
      .set({ name, tagline, updated_at: new Date() })
      .where(eq(profiles.id, profileId));

    updateTags(cacheTags.profile(profileId));

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

// The identity's own writer, separate from the fields because the settings
// surface commits them at different moments: confirming the customizer is a
// decision the viewer has made, while a name still being typed is not. Folding
// both into one action is what made every field submit re-render and re-write
// art that had not changed.
export async function updateProfileIdentity(
  profileId: string,
  data: ProfileIdentityData
): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }
    if (!(await ownsProfile(userId, profileId))) {
      return UNAUTHORIZED_RESPONSE;
    }

    const validationResult = ProfileIdentitySchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }
    const { accent, altvatar } = validationResult.data;

    const accentWritten = await writeAccent(profileId, accent);
    const altvatarWritten = await writeAltvatar(profileId, altvatar);

    updateTags(cacheTags.profile(profileId));

    // A half-saved identity is reported rather than claimed: the viewer is
    // looking at a face the surface already repainted, so saying nothing would
    // let the screen lie about what was stored. Which half failed is not named
    // — neither is recoverable by hand, and both are fixed the same way.
    if (!accentWritten || !altvatarWritten) {
      return {
        success: false,
        message: 'Your Altvatar was not fully saved',
        error: 'Failed to update profile',
      };
    }

    return { success: true, message: 'Altvatar saved', id: profileId };
  } catch (error) {
    console.error('Error updating profile identity:', error);
    return {
      success: false,
      message: 'An error occurred while saving your Altvatar',
      error: 'Failed to update profile',
    };
  }
}

// Changing the profile a viewer acts as. Membership is re-verified here rather
// than trusted from whichever surface offered the row: the client's claim about
// what it may select is an input, never a grant, and a target the viewer holds
// no membership on is refused without writing a selection.
//
// `refresh()` re-renders the route the viewer is already on, so a switch never
// navigates. The confirmation copy rides back on `message` so every switching
// surface raises the same words rather than each keeping its own.
export async function switchActiveProfile(
  profileId: string
): Promise<ActionResponse> {
  try {
    const identity = await authedIdentity();
    if (!identity) {
      return UNAUTHORIZED_RESPONSE;
    }

    const target = await writableMembership(identity.userId, profileId);
    if (!target) {
      return FORBIDDEN_RESPONSE;
    }

    const store = await cookies();
    store.set(
      ACTIVE_PROFILE_COOKIE,
      profileId,
      ACTIVE_PROFILE_COOKIE_ATTRIBUTES
    );
    await stampActedAs(identity.userId, profileId, target.last_active_at);
    refresh();

    return {
      success: true,
      message: `Profile switched to ${target.name}`,
      id: profileId,
    };
  } catch (error) {
    console.error('Error switching active profile:', error);
    return {
      success: false,
      message: 'Failed to switch profile',
      error: 'Failed',
    };
  }
}
