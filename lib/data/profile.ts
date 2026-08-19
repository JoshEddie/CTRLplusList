import { db } from '@/db';
import { lists, profiles, user_blocks, user_follows, users } from '@/db/schema';
import { selfMemberships } from '@/lib/data/profile.identity';
import { isFollowing } from '@/lib/data/user';
import type { UserIdentity } from '@/lib/types';
import { VISIBILITY, visibilityDbValues } from '@/lib/visibility';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { cache } from 'react';

// Request-scoped React cache(), not 'use cache': identity resolution is not a
// table read, so it carries no cache tag and no updateTag obligation.
// `profile` means "the profile this request acts as" — today always the
// account's self-profile; a later change makes it switchable.
export const getUserIdentity: (
  userId: string
) => Promise<UserIdentity | null> = cache(async (userId: string) => {
  try {
    const [profile] = await db
      .select({
        id: profiles.id,
        name: profiles.name,
        created_at: profiles.created_at,
        updated_at: profiles.updated_at,
      })
      .from(profiles)
      .innerJoin(
        selfMemberships,
        eq(selfMemberships.profile_id, profiles.id)
      )
      .where(eq(selfMemberships.user_id, userId));
    if (!profile) return null;
    return { userId, profile };
  } catch (error) {
    console.error('Error resolving user identity:', error);
    return null;
  }
});

// Not cached: joins `users` for follower name/image. The follower is an
// account; its self-profile id rides along so rows can link to the profile
// route.
export async function getFollowersOfProfile(profileId: string) {
  try {
    const result = await db
      .select({
        follower_id: user_follows.follower_id,
        followee_profile_id: user_follows.followee_profile_id,
        created_at: user_follows.created_at,
        follower: {
          id: users.id,
          profile_id: profiles.id,
          name: users.name,
          image: users.image,
        },
      })
      .from(user_follows)
      .innerJoin(users, eq(users.id, user_follows.follower_id))
      .innerJoin(selfMemberships, eq(selfMemberships.user_id, users.id))
      .innerJoin(profiles, eq(profiles.id, selfMemberships.profile_id))
      .where(eq(user_follows.followee_profile_id, profileId))
      .orderBy(desc(user_follows.created_at));
    return result;
  } catch (error) {
    console.error('Error fetching followers:', error);
    throw new Error('Failed to fetch followers');
  }
}

// Not cached: joins the blocked profile's account for image.
export async function getBlockedByProfile(profileId: string) {
  try {
    const result = await db
      .select({
        blocker_profile_id: user_blocks.blocker_profile_id,
        blocked_profile_id: user_blocks.blocked_profile_id,
        created_at: user_blocks.created_at,
        blocked: {
          id: profiles.id,
          name: profiles.name,
          image: users.image,
        },
      })
      .from(user_blocks)
      .innerJoin(profiles, eq(profiles.id, user_blocks.blocked_profile_id))
      .leftJoin(selfMemberships, eq(selfMemberships.profile_id, profiles.id))
      .leftJoin(users, eq(users.id, selfMemberships.user_id))
      .where(eq(user_blocks.blocker_profile_id, profileId))
      .orderBy(desc(user_blocks.created_at));
    return result;
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    throw new Error('Failed to fetch blocked users');
  }
}

export async function hasBlocked({
  blockerProfileId,
  blockedProfileId,
}: {
  blockerProfileId: string;
  blockedProfileId: string;
}): Promise<boolean> {
  'use cache';
  cacheTag('user_blocks');
  try {
    const result = await db.query.user_blocks.findFirst({
      where: and(
        eq(user_blocks.blocker_profile_id, blockerProfileId),
        eq(user_blocks.blocked_profile_id, blockedProfileId)
      ),
    });
    return !!result;
  } catch (error) {
    console.error('Error checking block status:', error);
    throw new Error('Failed to check block status');
  }
}

// A managed profile has no account, so its entry is null rather than absent —
// callers distinguish "no such profile" from "profile nobody signs in as" only
// by whether they care, and both fall out ineligible.
export async function accountsOfProfiles(
  profileIds: string[]
): Promise<Map<string, string | null>> {
  const rows = await db
    .select({ id: profiles.id, user_id: selfMemberships.user_id })
    .from(profiles)
    .leftJoin(selfMemberships, eq(selfMemberships.profile_id, profiles.id))
    .where(inArray(profiles.id, profileIds));
  return new Map(rows.map((r) => [r.id, r.user_id]));
}

/**
 * Eligible attributed-purchaser pool for an item on the owning profile's list,
 * as seen by the claimer's profile: the owner's mutual follows (the owner's
 * account follows them AND their account follows the owner's profile — each
 * leg's account resolved through the profile's `self` membership, so a managed
 * profile with no account yields the empty pool), minus anyone with a block
 * edge to/from
 * the claimer, minus the owner, minus the claimer themselves (their claim is
 * the modal's primary self-claim CTA, not a picker row). Sorted with the
 * claimer's own mutuals first, then by name. Eligibility gates at claim time
 * only — the server re-verifies via `isEligiblePurchaser`
 * (lib/data/purchase.ts); this read feeds the picker UI.
 */
export async function getEligiblePurchasers(
  ownerProfileId: string,
  claimerProfileId: string
) {
  'use cache';
  cacheTag('user_follows');
  cacheTag('user_blocks');
  cacheTag('profile_members');
  try {
    const accounts = await accountsOfProfiles([
      ownerProfileId,
      claimerProfileId,
    ]);
    const ownerUserId = accounts.get(ownerProfileId);
    const claimerUserId = accounts.get(claimerProfileId);
    if (!ownerUserId) return [];

    const followRows = await db
      .select({
        follower_id: user_follows.follower_id,
        followee_profile_id: user_follows.followee_profile_id,
      })
      .from(user_follows)
      .where(
        or(
          inArray(
            user_follows.follower_id,
            [ownerUserId, claimerUserId].filter((id): id is string => !!id)
          ),
          inArray(user_follows.followee_profile_id, [
            ownerProfileId,
            claimerProfileId,
          ])
        )
      );

    // The two follow legs of a profile P (account A): the profiles A follows,
    // and the accounts following P. B is a mutual of P when B is in the first
    // set and B's account is in the second.
    const legsOf = (profileId: string, accountId: string | null | undefined) => {
      const followees = new Set<string>();
      const followerAccounts = new Set<string>();
      for (const row of followRows) {
        if (accountId && row.follower_id === accountId)
          followees.add(row.followee_profile_id);
        if (row.followee_profile_id === profileId)
          followerAccounts.add(row.follower_id);
      }
      return { followees, followerAccounts };
    };

    const ownerLegs = legsOf(ownerProfileId, ownerUserId);
    const claimerLegs = legsOf(claimerProfileId, claimerUserId);

    const blockRows = await db
      .select({
        blocker_profile_id: user_blocks.blocker_profile_id,
        blocked_profile_id: user_blocks.blocked_profile_id,
      })
      .from(user_blocks)
      .where(
        or(
          eq(user_blocks.blocker_profile_id, claimerProfileId),
          eq(user_blocks.blocked_profile_id, claimerProfileId)
        )
      );
    const blockedWithClaimer = new Set(
      blockRows.flatMap((row) => [
        row.blocker_profile_id,
        row.blocked_profile_id,
      ])
    );

    const candidateIds = [...ownerLegs.followees].filter(
      (id) =>
        id !== ownerProfileId &&
        id !== claimerProfileId &&
        !blockedWithClaimer.has(id)
    );
    if (candidateIds.length === 0) return [];

    const rows = await db
      .select({
        id: profiles.id,
        user_id: selfMemberships.user_id,
        name: profiles.name,
        image: users.image,
      })
      .from(profiles)
      .leftJoin(selfMemberships, eq(selfMemberships.profile_id, profiles.id))
      .leftJoin(users, eq(users.id, selfMemberships.user_id))
      .where(inArray(profiles.id, candidateIds));

    // The return-follow leg: the candidate's own account follows the owner's
    // profile. A candidate with no account fails the leg.
    const pool = rows.filter(
      (p) => p.user_id && ownerLegs.followerAccounts.has(p.user_id)
    );

    const claimerMutuals = new Set(
      pool
        .filter(
          (p) =>
            claimerLegs.followees.has(p.id) &&
            !!p.user_id &&
            claimerLegs.followerAccounts.has(p.user_id)
        )
        .map((p) => p.id)
    );

    // Claimer-mutuals first, then by display name.
    const sortKey = (p: { id: string; name: string | null }) =>
      `${claimerMutuals.has(p.id) ? 0 : 1}:${p.name ?? ''}`;
    return pool
      .map(({ id, name, image }) => ({ id, name, image }))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  } catch (error) {
    console.error('Error fetching eligible purchasers:', error);
    throw new Error('Failed to fetch eligible purchasers');
  }
}

// Not cached: reads `users.image` which NextAuth updates out-of-band on
// sign-in (no invalidation hook).
export async function getProfileForViewer(
  profileId: string,
  viewer: UserIdentity | null
) {
  try {
    const profile = await db
      .select({ id: profiles.id, name: profiles.name, image: users.image })
      .from(profiles)
      .leftJoin(selfMemberships, eq(selfMemberships.profile_id, profiles.id))
      .leftJoin(users, eq(users.id, selfMemberships.user_id))
      .where(eq(profiles.id, profileId));
    if (!profile[0]) return null;

    const publicListCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(lists)
      .where(
        and(
          eq(lists.profile_id, profileId),
          inArray(lists.visibility, visibilityDbValues([VISIBILITY.FOLLOWERS]))
        )
      );

    let viewerIsFollowing = false;
    let viewerIsBlocked = false;
    let blockedByViewer = false;
    if (viewer && viewer.profile.id !== profileId) {
      viewerIsFollowing = await isFollowing({
        userId: viewer.userId,
        followeeProfileId: profileId,
      });
      viewerIsBlocked = await hasBlocked({
        blockerProfileId: profileId,
        blockedProfileId: viewer.profile.id,
      });
      blockedByViewer = await hasBlocked({
        blockerProfileId: viewer.profile.id,
        blockedProfileId: profileId,
      });
    }

    return {
      ...profile[0],
      publicListCount: Number(publicListCount[0].count),
      viewerIsFollowing,
      viewerIsBlocked,
      blockedByViewer,
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw new Error('Failed to fetch profile');
  }
}
