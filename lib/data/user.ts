import { db } from '@/db';
import { lists, profiles, user_follows, users } from '@/db/schema';
import { selfMemberships } from '@/lib/data/profile.identity';
import { UserTable } from '@/lib/types';
import { VISIBILITY, visibilityDbValues } from '@/lib/visibility';
import { cacheTags } from '@/lib/cacheTags';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { cache } from 'react';

export const getUserIdByEmail: (email: string) => Promise<UserTable | null> =
  cache(async (email: string) => {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  });

// Not cached: joins the followee profile's account for image.
export async function getFollowingByUser(userId: string) {
  try {
    const result = await db
      .select({
        follower_id: user_follows.follower_id,
        followee_profile_id: user_follows.followee_profile_id,
        created_at: user_follows.created_at,
        followee: {
          id: profiles.id,
          name: profiles.name,
          image: users.image,
        },
      })
      .from(user_follows)
      .innerJoin(profiles, eq(profiles.id, user_follows.followee_profile_id))
      .leftJoin(selfMemberships, eq(selfMemberships.profile_id, profiles.id))
      .leftJoin(users, eq(users.id, selfMemberships.user_id))
      .where(eq(user_follows.follower_id, userId))
      .orderBy(desc(user_follows.created_at));
    return result;
  } catch (error) {
    console.error('Error fetching following:', error);
    throw new Error('Failed to fetch following');
  }
}

export async function isFollowing({
  userId,
  followeeProfileId,
}: {
  userId: string;
  followeeProfileId: string;
}): Promise<boolean> {
  'use cache';
  cacheTag(cacheTags.userFollows, cacheTags.followsOfUser(userId));
  try {
    const result = await db.query.user_follows.findFirst({
      where: and(
        eq(user_follows.follower_id, userId),
        eq(user_follows.followee_profile_id, followeeProfileId)
      ),
    });
    return !!result;
  } catch (error) {
    console.error('Error checking follow status:', error);
    throw new Error('Failed to check follow status');
  }
}

export async function viewerHasAnyFollows(viewerId: string): Promise<boolean> {
  'use cache';
  cacheTag(cacheTags.userFollows, cacheTags.followsOfUser(viewerId));
  try {
    const result = await db.query.user_follows.findFirst({
      where: eq(user_follows.follower_id, viewerId),
      columns: { follower_id: true },
    });
    return !!result;
  } catch (error) {
    console.error('Error checking viewer follow count:', error);
    throw new Error('Failed to check viewer follow count');
  }
}

/**
 * Returns profiles the viewer follows, with per-profile metadata for the home
 * Following rail:
 *   - latest_shared_at: MAX(shared_at) over the followee profile's public
 *     lists (null if none)
 *   - new_count: number of public lists the followee shared since the viewer
 *     last visited /following (or since the follow was created, whichever is
 *     later)
 */
// Not cached: reads `users.image` which NextAuth updates out-of-band on
// sign-in (no invalidation hook).
export async function getFollowingFeedProfiles(viewerId: string) {
  try {
    const rows = await db
      .select({
        id: profiles.id,
        name: profiles.name,
        image: users.image,
        follow_created_at: user_follows.created_at,
        last_seen_following_at: users.last_seen_following_at,
        latest_shared_at: sql<Date | null>`MAX(${lists.shared_at})`.as(
          'latest_shared_at'
        ),
        new_count:
          sql<number>`COUNT(${lists.id}) FILTER (WHERE ${lists.shared_at} > GREATEST(COALESCE(${users.last_seen_following_at}, ${user_follows.created_at}), ${user_follows.created_at}))`.as(
            'new_count'
          ),
      })
      .from(user_follows)
      .innerJoin(profiles, eq(profiles.id, user_follows.followee_profile_id))
      .leftJoin(selfMemberships, eq(selfMemberships.profile_id, profiles.id))
      .leftJoin(users, eq(users.id, selfMemberships.user_id))
      .leftJoin(
        lists,
        and(
          eq(lists.profile_id, profiles.id),
          inArray(lists.visibility, visibilityDbValues([VISIBILITY.FOLLOWERS]))
        )
      )
      .where(eq(user_follows.follower_id, viewerId))
      .groupBy(profiles.id, users.id, user_follows.created_at)
      .orderBy(desc(sql`MAX(${lists.shared_at})`));

    // Convert Postgres-returned count strings to numbers.
    return rows.map((r) => ({
      ...r,
      new_count: Number(r.new_count),
    }));
  } catch (error) {
    console.error('Error fetching following feed profiles:', error);
    throw new Error('Failed to fetch following feed profiles');
  }
}
