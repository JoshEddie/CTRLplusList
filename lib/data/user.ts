import { db } from '@/db';
import { lists, user_blocks, user_follows, users } from '@/db/schema';
import { UserTable } from '@/lib/types';
import { VISIBILITY, visibilityDbValues } from '@/lib/visibility';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { cache } from 'react';

export const getUserById: (id: string) => Promise<UserTable | null> = cache(
  async (id: string) => {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by id:', error);
      return null;
    }
  }
);

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

// Not cached: joins `users` for followee name/image.
export async function getFollowingByUser(userId: string) {
  try {
    const result = await db.query.user_follows.findMany({
      where: eq(user_follows.follower_id, userId),
      with: {
        followee: {
          columns: { id: true, name: true, image: true },
        },
      },
      orderBy: (user_follows, { desc }) => [desc(user_follows.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching following:', error);
    throw new Error('Failed to fetch following');
  }
}

// Not cached: joins `users` for follower name/image.
export async function getFollowersOfUser(userId: string) {
  try {
    const result = await db.query.user_follows.findMany({
      where: eq(user_follows.followee_id, userId),
      with: {
        follower: {
          columns: { id: true, name: true, image: true },
        },
      },
      orderBy: (user_follows, { desc }) => [desc(user_follows.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching followers:', error);
    throw new Error('Failed to fetch followers');
  }
}

// Not cached: joins `users` for blocked user's name/image.
export async function getBlockedByUser(userId: string) {
  try {
    const result = await db.query.user_blocks.findMany({
      where: eq(user_blocks.blocker_id, userId),
      with: {
        blocked: {
          columns: { id: true, name: true, image: true },
        },
      },
      orderBy: (user_blocks, { desc }) => [desc(user_blocks.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    throw new Error('Failed to fetch blocked users');
  }
}

export async function isFollowing({
  userId,
  followeeId,
}: {
  userId: string;
  followeeId: string;
}): Promise<boolean> {
  'use cache';
  cacheTag('user_follows');
  try {
    const result = await db.query.user_follows.findFirst({
      where: and(
        eq(user_follows.follower_id, userId),
        eq(user_follows.followee_id, followeeId)
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
  cacheTag('user_follows');
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

export async function hasBlocked({
  userId,
  blockedId,
}: {
  userId: string;
  blockedId: string;
}): Promise<boolean> {
  'use cache';
  cacheTag('user_blocks');
  try {
    const result = await db.query.user_blocks.findFirst({
      where: and(
        eq(user_blocks.blocker_id, userId),
        eq(user_blocks.blocked_id, blockedId)
      ),
    });
    return !!result;
  } catch (error) {
    console.error('Error checking block status:', error);
    throw new Error('Failed to check block status');
  }
}

/**
 * Eligible attributed-purchaser pool for an item on `ownerId`'s list, as seen
 * by `claimerId`: the owner's mutual follows (owner follows them AND they
 * follow the owner), minus anyone with a block edge to/from the claimer,
 * minus the owner, minus the claimer themselves (their claim is the modal's
 * primary self-claim CTA, not a picker row). Sorted with the claimer's own
 * mutuals first, then by name. Eligibility gates at claim time only — the
 * server re-verifies via `isEligiblePurchaser` (lib/data/purchase.ts); this
 * read feeds the picker UI.
 */
export async function getEligiblePurchasers(ownerId: string, claimerId: string) {
  'use cache';
  cacheTag('user_follows');
  cacheTag('user_blocks');
  try {
    const followRows = await db
      .select({
        follower_id: user_follows.follower_id,
        followee_id: user_follows.followee_id,
      })
      .from(user_follows)
      .where(
        or(
          inArray(user_follows.follower_id, [ownerId, claimerId]),
          inArray(user_follows.followee_id, [ownerId, claimerId])
        )
      );

    const mutualsOf = (userId: string) => {
      const followees = new Set<string>();
      const followers = new Set<string>();
      for (const row of followRows) {
        if (row.follower_id === userId) followees.add(row.followee_id);
        if (row.followee_id === userId) followers.add(row.follower_id);
      }
      return new Set([...followees].filter((id) => followers.has(id)));
    };

    const ownerMutuals = mutualsOf(ownerId);
    const claimerMutuals = mutualsOf(claimerId);

    const blockRows = await db
      .select({
        blocker_id: user_blocks.blocker_id,
        blocked_id: user_blocks.blocked_id,
      })
      .from(user_blocks)
      .where(
        or(
          eq(user_blocks.blocker_id, claimerId),
          eq(user_blocks.blocked_id, claimerId)
        )
      );
    const blockedWithClaimer = new Set(
      blockRows.flatMap((row) => [row.blocker_id, row.blocked_id])
    );

    const poolIds = [...ownerMutuals].filter(
      (id) =>
        id !== ownerId && id !== claimerId && !blockedWithClaimer.has(id)
    );
    if (poolIds.length === 0) return [];

    const rows = await db
      .select({ id: users.id, name: users.name, image: users.image })
      .from(users)
      .where(inArray(users.id, poolIds));

    // Claimer-mutuals first, then by display name.
    const sortKey = (u: { id: string; name: string | null }) =>
      `${claimerMutuals.has(u.id) ? 0 : 1}:${u.name ?? ''}`;
    return rows.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  } catch (error) {
    console.error('Error fetching eligible purchasers:', error);
    throw new Error('Failed to fetch eligible purchasers');
  }
}

/**
 * Returns users the viewer follows, with per-user metadata for the home Following rail:
 *   - latest_shared_at: MAX(shared_at) over the followee's public lists (null if none)
 *   - new_count: number of public lists the followee shared since the viewer last
 *     visited /following (or since the follow was created, whichever is later)
 */
// Not cached: reads `users.name`/`users.image` which NextAuth updates
// out-of-band on sign-in (no invalidation hook).
export async function getFollowingFeedUsers(viewerId: string) {
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
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
      .innerJoin(users, eq(users.id, user_follows.followee_id))
      .leftJoin(
        lists,
        and(
          eq(lists.user_id, users.id),
          inArray(lists.visibility, visibilityDbValues([VISIBILITY.FOLLOWERS]))
        )
      )
      .where(eq(user_follows.follower_id, viewerId))
      .groupBy(users.id, user_follows.created_at)
      .orderBy(desc(sql`MAX(${lists.shared_at})`));

    // Convert Postgres-returned count strings to numbers.
    return rows.map((r) => ({
      ...r,
      new_count: Number(r.new_count),
    }));
  } catch (error) {
    console.error('Error fetching following feed users:', error);
    throw new Error('Failed to fetch following feed users');
  }
}

// Not cached: reads `users.name`/`users.image` which NextAuth updates
// out-of-band on sign-in (no invalidation hook).
export async function getProfileForUser(
  userId: string,
  viewerId: string | null
) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, name: true, image: true },
    });
    if (!user) return null;

    const publicListCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(lists)
      .where(
        and(
          eq(lists.user_id, userId),
          inArray(lists.visibility, visibilityDbValues([VISIBILITY.FOLLOWERS]))
        )
      );

    let viewerIsFollowing = false;
    let viewerIsBlocked = false;
    let blockedByViewer = false;
    if (viewerId && viewerId !== userId) {
      viewerIsFollowing = await isFollowing({
        userId: viewerId,
        followeeId: userId,
      });
      viewerIsBlocked = await hasBlocked({
        userId,
        blockedId: viewerId,
      });
      blockedByViewer = await hasBlocked({
        userId: viewerId,
        blockedId: userId,
      });
    }

    return {
      ...user,
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
