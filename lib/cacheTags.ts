import { updateTag } from 'next/cache';

// Invalidation contract (issues #305/#309): every cached read carries its
// table's coarse tag PLUS narrow tags covering the keys it actually read —
// keys taken from parameters or from the fetched rows (cacheTag may run after
// the query). Ordinary server actions fire ONLY narrow tags for the keys they
// wrote; the coarse table tags are a bulk-invalidation escape hatch that no
// ordinary write fires. A writer that touches a key without firing its narrow
// tag leaves those reads stale until their cacheLife revalidate elapses —
// when adding a write, enumerate the narrow tags for every key it changes.
export const cacheTags = {
  lists: 'lists',
  list: (listId: string) => `lists:id:${listId}`,
  listsOfProfile: (profileId: string) => `lists:profile:${profileId}`,

  items: 'items',
  item: (itemId: string) => `items:id:${itemId}`,
  itemsOfProfile: (profileId: string) => `items:profile:${profileId}`,
  itemsOfList: (listId: string) => `list_items:list:${listId}`,

  purchasesOfProfile: (profileId: string) => `purchases:profile:${profileId}`,

  profiles: 'profiles',
  profile: (profileId: string) => `profiles:id:${profileId}`,

  profileMembers: 'profile_members',
  profilesOfUser: (userId: string) => `profile_members:user:${userId}`,

  profileInvites: 'profile_invites',
  invitesOfProfile: (profileId: string) =>
    `profile_invites:profile:${profileId}`,

  profilePreferences: 'profile_preferences',
  preferencesOfProfile: (profileId: string) =>
    `profile_preferences:profile:${profileId}`,

  profileAvatars: 'profile_avatars',
  avatarOfProfile: (profileId: string) =>
    `profile_avatars:profile:${profileId}`,

  userFollows: 'user_follows',
  followsOfUser: (userId: string) => `user_follows:follower:${userId}`,
  followersOfProfile: (profileId: string) =>
    `user_follows:followee:${profileId}`,

  userBlocks: 'user_blocks',
  blocksOfProfile: (profileId: string) => `user_blocks:profile:${profileId}`,

  listVisits: 'list_visits',
  visitsOfUser: (userId: string) => `list_visits:user:${userId}`,
} as const;

export function updateTags(...tags: string[]) {
  for (const tag of tags) updateTag(tag);
}

type PurchaseAttribution = {
  profile_id: string | null;
  claimed_by_profile_id: string | null;
};

// A rendered profile is three rows in three tables — the profile, its avatar
// art and its accent preference — and every surface that shows a face reads
// all three. One helper rather than three tags per call site: a read naming
// two of the three keeps painting the old identity when the third changes.
export function profileIdentityTags(profileIds: Iterable<string>): string[] {
  const tags = new Set<string>();
  for (const id of profileIds) {
    tags.add(cacheTags.profile(id));
    tags.add(cacheTags.avatarOfProfile(id));
    tags.add(cacheTags.preferencesOfProfile(id));
  }
  return [...tags];
}

// Narrow tags for fetched item rows: the owning profile's item pool, plus the
// identities that render on the embedded purchase attributions.
export function itemRowTags(
  rows: { profile_id: string; purchases?: PurchaseAttribution[] }[]
): string[] {
  const tags = new Set<string>();
  const attributed = new Set<string>();
  for (const row of rows) {
    tags.add(cacheTags.itemsOfProfile(row.profile_id));
    for (const purchase of row.purchases ?? []) {
      if (purchase.profile_id) attributed.add(purchase.profile_id);
      if (purchase.claimed_by_profile_id)
        attributed.add(purchase.claimed_by_profile_id);
    }
  }
  for (const tag of profileIdentityTags(attributed)) tags.add(tag);
  return [...tags];
}
