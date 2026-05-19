import { db } from '@/db';
import {
  user_blocks,
  user_follows,
  items,
  list_items,
  list_visits,
  lists,
  purchases,
  users,
} from '@/db/schema';
import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { cache } from 'react';
import { ListTable, PurchaseView, UserTable } from './types';

type RawPurchase = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  user: { name: string | null } | null;
};

function firstNameOf(name: string | null | undefined): string {
  if (!name) return 'Someone';
  const trimmed = name.trim();
  if (!trimmed) return 'Someone';
  return trimmed.split(/\s+/)[0];
}

function sanitizePurchases(
  raw: RawPurchase[] | undefined,
  viewerId: string | undefined,
  isOwner: boolean,
  showSpoilers: boolean = false
): PurchaseView[] {
  if (!raw) return [];
  if (isOwner && !showSpoilers) return [];
  if (isOwner && showSpoilers) {
    // Owner with spoilers: reveal claimer first names (owner can't claim own items)
    return raw.map((p) => ({
      id: p.id,
      by: 'other' as const,
      firstName: firstNameOf(p.user?.name ?? p.guest_name),
    }));
  }
  // Non-owner viewer: first names only
  return raw.map((p) => {
    const isSelf = !!viewerId && p.user_id === viewerId;
    return {
      id: p.id,
      by: isSelf ? ('self' as const) : ('other' as const),
      firstName: firstNameOf(p.user?.name ?? p.guest_name),
    };
  });
}

// Get user by id
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

// Get user by email
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

// Fetcher functions for React Query
export async function getList(id: string) {
  'use cache';
  cacheTag('lists');
  try {
    const result = await db.query.lists.findFirst({
      where: eq(lists.id, id),
      with: {
        user: true,
      },
    });
    return result;
  } catch (error) {
    console.error(`Error fetching list ${id}:`, error);
    throw new Error('Failed to fetch list');
  }
}

export async function getLists() {
  'use cache';
  cacheTag('lists');
  try {
    const result = await db.query.lists.findMany({
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

export async function getListsByUser(userId: string) {
  'use cache';
  cacheTag('lists');
  try {
    const result = await db.query.lists.findMany({
      where: eq(lists.user_id, userId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

export async function getItemsByUser(
  userId: string,
  opts: {
    filter?: 'active' | 'archived' | 'all';
    showSpoilers?: boolean;
  } = {}
) {
  'use cache';
  cacheTag('items');
  try {
    const filter = opts.filter ?? 'active';
    const showSpoilers = opts.showSpoilers ?? false;
    const where =
      filter === 'active'
        ? and(eq(items.user_id, userId), isNull(items.archived_at))
        : filter === 'archived'
          ? and(eq(items.user_id, userId), isNotNull(items.archived_at))
          : eq(items.user_id, userId);

    const result = await db.query.items.findMany({
      where,
      with: {
        stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
        purchases: {
          with: {
            user: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: (items, { desc }) => [desc(items.created_at)],
    });

    return result.map((item) => ({
      ...item,
      hasPurchases: (item.purchases?.length ?? 0) > 0,
      purchases: sanitizePurchases(
        item.purchases,
        userId,
        true,
        showSpoilers
      ),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

export async function getItemById(id: string, userId: string) {
  'use cache';
  cacheTag('items');
  try {
    const result = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.user_id, userId)),
      with: {
        stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
        list_items: {
          with: {
            list: true,
          },
        },
      },
      orderBy: (items, { desc }) => [desc(items.created_at)],
    });

    if (!result) {
      return result;
    }

    const lists: (ListTable & { position: number })[] =
      result.list_items?.map((li) => ({
        ...li.list,
        position: li.position,
      })) || [];

    const newResult = {
      id: result.id,
      name: result.name,
      description: result.description,
      image_url: result.image_url,
      quantity_limit: result.quantity_limit,
      user_id: result.user_id,
      created_at: result.created_at,
      updated_at: result.updated_at,
      stores: result.stores,
      lists: lists,
    };

    return newResult;
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

export async function getItemsByPurchased(userId?: string) {
  'use cache';
  cacheTag('items');
  if (!userId) {
    return [];
  }
  try {
    const result = await db.query.purchases.findMany({
      where: eq(purchases.user_id, userId),
      with: {
        item: {
          with: {
            stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
            purchases: {
              with: {
                user: {
                  columns: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: (purchases, { desc }) => [desc(purchases.purchased_at)],
    });

    return result.map(({ item }) => ({
      ...item,
      purchases: sanitizePurchases(item.purchases, userId, false),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

export async function getItemsByListId(
  listId: string,
  opts: {
    viewerId?: string;
    isOwner?: boolean;
    showSpoilers?: boolean;
  } = {}
) {
  'use cache';
  cacheTag('items');
  try {
    const result = await db.query.list_items.findMany({
      where: eq(list_items.list_id, listId),
      with: {
        item: {
          with: {
            stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
            purchases: {
              with: {
                user: {
                  columns: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: (list_items, { asc }) => [asc(list_items.position)],
    });

    return result.map(({ item }) => ({
      ...item,
      purchases: sanitizePurchases(
        item.purchases,
        opts.viewerId,
        opts.isOwner ?? false,
        opts.showSpoilers ?? false
      ),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw new Error('Failed to fetch items');
  }
}

export async function getListsSharedByUser(userId: string) {
  'use cache';
  cacheTag('lists');
  try {
    const result = await db.query.lists.findMany({
      where: and(
        inArray(lists.visibility, ['unlisted', 'public']),
        eq(lists.user_id, userId)
      ),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.created_at)],
    });
    return result;
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

// Not cached: joins `users` for `list.user.name`. NextAuth updates user rows
// out-of-band on sign-in, and we have no hook to fire `updateTag` for that,
// so caching here can pin a stale (null-image, null-name) version.
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
            user: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: (list_visits, { desc }) => [desc(list_visits.favorited_at)],
    });
    return result;
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
  cacheTag('list_visits');
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

// Not cached: joins `users` (see note on getBookmarkedListsByUser above).
export async function getVisitHistoryByUser(
  userId: string,
  opts: { limit?: number; offset?: number } = {}
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
            user: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: (list_visits, { desc }) => [desc(list_visits.last_visited_at)],
      limit: opts.limit,
      offset: opts.offset,
    });
    return result;
  } catch (error) {
    console.error('Error fetching visit history:', error);
    throw new Error('Failed to fetch visit history');
  }
}

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

export async function isFollowing(
  followerId: string,
  followeeId: string
): Promise<boolean> {
  'use cache';
  cacheTag('user_follows');
  try {
    const result = await db.query.user_follows.findFirst({
      where: and(
        eq(user_follows.follower_id, followerId),
        eq(user_follows.followee_id, followeeId)
      ),
    });
    return !!result;
  } catch (error) {
    console.error('Error checking follow status:', error);
    throw new Error('Failed to check follow status');
  }
}

export async function isBlocked(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  'use cache';
  cacheTag('user_blocks');
  try {
    const result = await db.query.user_blocks.findFirst({
      where: and(
        eq(user_blocks.blocker_id, blockerId),
        eq(user_blocks.blocked_id, blockedId)
      ),
    });
    return !!result;
  } catch (error) {
    console.error('Error checking block status:', error);
    throw new Error('Failed to check block status');
  }
}

// Not cached: joins `users` for owner name/image.
export async function getPublicListsByUser(
  userId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  try {
    const result = await db.query.lists.findMany({
      where: and(eq(lists.user_id, userId), eq(lists.visibility, 'public')),
      with: {
        user: {
          columns: { id: true, name: true, image: true },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.shared_at)],
      limit: opts.limit,
      offset: opts.offset,
    });
    return result;
  } catch (error) {
    console.error('Error fetching public lists:', error);
    throw new Error('Failed to fetch public lists');
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
        new_count: sql<number>`COUNT(${lists.id}) FILTER (WHERE ${lists.shared_at} > GREATEST(COALESCE(${users.last_seen_following_at}, ${user_follows.created_at}), ${user_follows.created_at}))`.as(
          'new_count'
        ),
      })
      .from(user_follows)
      .innerJoin(users, eq(users.id, user_follows.followee_id))
      .leftJoin(
        lists,
        and(eq(lists.user_id, users.id), eq(lists.visibility, 'public'))
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
      .where(and(eq(lists.user_id, userId), eq(lists.visibility, 'public')));

    let viewerIsFollowing = false;
    let viewerIsBlocked = false;
    let blockedByViewer = false;
    if (viewerId && viewerId !== userId) {
      viewerIsFollowing = await isFollowing(viewerId, userId);
      viewerIsBlocked = await isBlocked(userId, viewerId);
      blockedByViewer = await isBlocked(viewerId, userId);
    }

    return {
      ...user,
      publicListCount: Number(publicListCount[0]?.count ?? 0),
      viewerIsFollowing,
      viewerIsBlocked,
      blockedByViewer,
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw new Error('Failed to fetch profile');
  }
}
