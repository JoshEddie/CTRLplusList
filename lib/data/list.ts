import { db } from '@/db';
import {
  items,
  list_items,
  lists,
  profile_avatars,
  profiles,
} from '@/db/schema';
import { cacheTags, profileIdentityTags } from '@/lib/cacheTags';
import {
  accentPreferences,
  avatarColumns,
  avatarViewOf,
  withProfileAvatar,
  type RelationalProfile,
} from '@/lib/data/profileAvatar';
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

// Collapses the relational avatar join into the flat ProfileAvatarView every
// list card paints its accent and owner disc from. The join scaffolding
// (`avatar`, `preferences`) is dropped rather than forwarded, so nothing
// downstream can read a profile's face two different ways.
export function withOwnerAvatar<
  T extends {
    visibility: string;
    profile: NonNullable<RelationalProfile> & { id: string };
  },
>(row: T) {
  return {
    ...withVisibility(row),
    profile: { id: row.profile.id, ...avatarViewOf(row.profile) },
  };
}

export async function getList(id: string) {
  'use cache';
  cacheTag(
    cacheTags.lists,
    cacheTags.profiles,
    cacheTags.profileAvatars,
    cacheTags.profilePreferences,
    cacheTags.list(id)
  );
  try {
    const [result] = await db
      .select({
        ...getTableColumns(lists),
        profile: { id: profiles.id, name: profiles.name, ...avatarColumns },
        item_count: count(items.id),
      })
      .from(lists)
      .innerJoin(profiles, eq(profiles.id, lists.profile_id))
      .leftJoin(profile_avatars, eq(profile_avatars.profile_id, profiles.id))
      .leftJoin(accentPreferences, eq(accentPreferences.profile_id, profiles.id))
      .leftJoin(list_items, eq(list_items.list_id, lists.id))
      .leftJoin(
        items,
        and(
          eq(items.id, list_items.item_id),
          eq(items.profile_id, lists.profile_id)
        )
      )
      .where(eq(lists.id, id))
      .groupBy(
        lists.id,
        profiles.id,
        profile_avatars.profile_id,
        accentPreferences.accent
      );

    if (!result) return undefined;
    cacheTag(...profileIdentityTags([result.profile_id]));
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
    cacheTags.profileAvatars,
    cacheTags.profilePreferences,
    cacheTags.listsOfProfile(profileId),
    ...profileIdentityTags([profileId])
  );
  try {
    const result = await db.query.lists.findMany({
      where: eq(lists.profile_id, profileId),
      with: {
        profile: {
          columns: { id: true, name: true },
          with: withProfileAvatar,
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.updated_at)],
    });
    return result.map(withOwnerAvatar);
  } catch (error) {
    console.error('Error fetching lists:', error);
    throw new Error('Failed to fetch lists');
  }
}

// Not cached: adopting `'use cache'` is a freshness decision with its own tag
// audit, and this read keeps its current behaviour until one is made.
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
          with: withProfileAvatar,
        },
      },
      orderBy: (lists, { desc }) => [desc(lists.shared_at)],
      limit: opts.limit,
    });
    return result.map(withOwnerAvatar);
  } catch (error) {
    console.error('Error fetching public lists:', error);
    throw new Error('Failed to fetch public lists');
  }
}
