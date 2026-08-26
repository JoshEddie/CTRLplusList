import { db } from '@/db';
import { items, list_items, lists, profiles } from '@/db/schema';
import { cacheTags } from '@/lib/cacheTags';
import { withSelfAvatar } from '@/lib/data/profile.identity';
import {
  VISIBILITY,
  fromDb,
  visibilityDbValues,
  type ListVisibility,
} from '@/lib/visibility';
import { and, count, eq, getTableColumns, inArray } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

// The data layer is the translation boundary: raw lists.visibility strings are
// decoded to canonical ListVisibility constants before any row escapes it.
export function withVisibility<T extends { visibility: string }>(
  row: T
): Omit<T, 'visibility'> & { visibility: ListVisibility } {
  return { ...row, visibility: fromDb(row.visibility) };
}

export async function getList(id: string) {
  'use cache';
  cacheTag(cacheTags.lists, cacheTags.profiles, cacheTags.list(id));
  try {
    const [result] = await db
      .select({
        ...getTableColumns(lists),
        profile: { id: profiles.id, name: profiles.name },
        item_count: count(items.id),
      })
      .from(lists)
      .innerJoin(profiles, eq(profiles.id, lists.profile_id))
      .leftJoin(list_items, eq(list_items.list_id, lists.id))
      .leftJoin(
        items,
        and(
          eq(items.id, list_items.item_id),
          eq(items.profile_id, lists.profile_id)
        )
      )
      .where(eq(lists.id, id))
      .groupBy(lists.id, profiles.id);

    if (!result) return undefined;
    cacheTag(cacheTags.profile(result.profile_id));
    return withVisibility(result);
  } catch (error) {
    console.error(`Error fetching list ${id}:`, error);
    throw new Error('Failed to fetch list');
  }
}

export async function getListsByProfile(profileId: string) {
  'use cache';
  cacheTag(
    cacheTags.lists,
    cacheTags.profiles,
    cacheTags.listsOfProfile(profileId),
    cacheTags.profile(profileId)
  );
  try {
    const result = await db.query.lists.findMany({
      where: eq(lists.profile_id, profileId),
      with: {
        profile: {
          columns: { id: true, name: true },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.updated_at)],
    });
    return result.map(withVisibility);
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

export async function getListsSharedByProfile(profileId: string) {
  'use cache';
  cacheTag(
    cacheTags.lists,
    cacheTags.profiles,
    cacheTags.listsOfProfile(profileId),
    cacheTags.profile(profileId)
  );
  try {
    const result = await db.query.lists.findMany({
      where: and(
        inArray(
          lists.visibility,
          visibilityDbValues([VISIBILITY.LINK, VISIBILITY.FOLLOWERS])
        ),
        eq(lists.profile_id, profileId)
      ),
      with: {
        profile: {
          columns: { id: true, name: true },
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.created_at)],
    });
    return result.map(withVisibility);
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

// Not cached: joins the owning profile's account for image (NextAuth updates
// user rows out-of-band on sign-in; no invalidation hook).
export async function getPublicListsByProfile(
  profileId: string,
  opts: { limit?: number } = {}
) {
  try {
    const result = await db.query.lists.findMany({
      where: and(
        eq(lists.profile_id, profileId),
        inArray(lists.visibility, visibilityDbValues([VISIBILITY.FOLLOWERS]))
      ),
      with: {
        profile: {
          columns: { id: true, name: true },
          with: withSelfAvatar,
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.shared_at)],
      limit: opts.limit,
    });
    return result.map(withVisibility);
  } catch (error) {
    console.error('Error fetching public lists:', error);
    throw new Error('Failed to fetch public lists');
  }
}
