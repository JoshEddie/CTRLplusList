import { cacheTags, updateTags } from '@/lib/cacheTags';

// Both the acting owner's and the affected account's tags: a write that
// refreshes only the actor leaves the other party's Profiles page and profile
// switcher stating a membership that no longer holds. Narrow tags only — the
// coarse table tag would invalidate every account's memberships for one
// profile's role change.
//
// Internal, not an action: a `'use server'` module's exports are
// client-callable endpoints, and the two membership actions modules share this
// one.
export function invalidateMembership(
  profileId: string,
  affectedUserId: string
): void {
  updateTags(
    cacheTags.membersOfProfile(profileId),
    cacheTags.profilesOfUser(affectedUserId),
    cacheTags.profile(profileId)
  );
}
