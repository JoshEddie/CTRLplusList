import { updateTag } from 'next/cache';

// Invalidation contract (issues #305/#309): every cached read carries a tag per
// key it actually read — keys taken from parameters or from the fetched rows
// (cacheTag may run after the query). Every write fires the tags for the keys
// it wrote. There is no coarse per-table tag: a writer that touches a key
// without firing its tag leaves those reads stale until their cacheLife
// revalidate elapses, so when adding a write, enumerate the tags for every key
// it changes.
export const cacheTags = {
  list: (listId: string) => `lists:id:${listId}`,
  listsOfProfile: (profileId: string) => `lists:profile:${profileId}`,

  item: (itemId: string) => `items:id:${itemId}`,
  itemsOfProfile: (profileId: string) => `items:profile:${profileId}`,
  itemsOfList: (listId: string) => `list_items:list:${listId}`,

  purchasesOfProfile: (profileId: string) => `purchases:profile:${profileId}`,

  profile: (profileId: string) => `profiles:id:${profileId}`,
  profilesOfUser: (userId: string) => `profile_members:user:${userId}`,
  preferencesOfProfile: (profileId: string) =>
    `profile_preferences:profile:${profileId}`,

  followsOfUser: (userId: string) => `user_follows:follower:${userId}`,
  followersOfProfile: (profileId: string) =>
    `user_follows:followee:${profileId}`,

  blocksOfProfile: (profileId: string) => `user_blocks:profile:${profileId}`,

  visitsOfUser: (userId: string) => `list_visits:user:${userId}`,
} as const;

export function updateTags(...tags: string[]) {
  for (const tag of tags) updateTag(tag);
}

type PurchaseAttribution = {
  profile_id: string | null;
  claimed_by_profile_id: string | null;
};

// Narrow tags for fetched item rows: the owning profile's item pool, plus the
// profiles whose names render on the embedded purchase attributions.
export function itemRowTags(
  rows: { profile_id: string; purchases?: PurchaseAttribution[] }[]
): string[] {
  const tags = new Set<string>();
  for (const row of rows) {
    tags.add(cacheTags.itemsOfProfile(row.profile_id));
    for (const purchase of row.purchases ?? []) {
      if (purchase.profile_id)
        tags.add(cacheTags.profile(purchase.profile_id));
      if (purchase.claimed_by_profile_id)
        tags.add(cacheTags.profile(purchase.claimed_by_profile_id));
    }
  }
  return [...tags];
}
