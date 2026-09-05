import { db } from '@/db';
import { items, list_items, lists } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { hasBlocked } from '@/lib/data/profile';
import type { UserIdentity } from '@/lib/types';
import { VISIBILITY, fromDb } from './visibility';

/**
 * Guards a list-page render against unavailable conditions:
 *   - the list is missing (deleted, wrong id)
 *   - the list's owning profile has blocked the viewer's human
 *
 * On failure, redirects to `/lists` (or `/` for unauthenticated viewers
 * hitting a missing list) — the same end-state callers experienced for a
 * deleted list before this helper existed. Centralized here so future
 * changes (e.g. to a `notFound()` page) edit one place.
 *
 * Takes the whole identity rather than a profile id: the block gate is the
 * human's, so it compares the self-profile whatever profile the viewer acts
 * as, and no caller can collapse the two into one argument.
 */
export async function guardListViewable<T extends { profile_id: string }>(
  list: T | null | undefined,
  viewer: UserIdentity | null
): Promise<T> {
  if (!list) {
    redirect(viewer ? '/lists' : '/');
  }
  if (
    viewer &&
    (await hasBlocked({
      blockerProfileId: list.profile_id,
      blockedProfileId: viewer.selfProfile.id,
    }))
  ) {
    redirect('/lists');
  }
  return list;
}

/**
 * Returns true iff the viewer (null for anonymous) is permitted to view the
 * item — i.e. the item belongs to at least one list the caller can view.
 *
 * Used to gate `createPurchase` so a caller can't claim items on a private
 * list whose id they guessed. Mirrors the access predicate used by the
 * `/lists/[id]` render path:
 *   - owning profile: always viewable
 *   - public / unlisted list: viewable by anyone — both are link-open. The
 *     follow relationship governs feed discovery, not claim access, so a guest
 *     or any non-follower can view (and therefore claim) items on a public list
 *   - private list: only the owning profile
 *   - any list whose owning profile has blocked the viewer's human: not
 *     viewable (block wins)
 *
 * Items not on any list are owner-only.
 *
 * The two comparisons take different profiles: ownership is against the
 * profile the request acts as, the block against the viewer's self-profile.
 * The identity is passed whole so neither can be reached by default.
 */
export async function isItemViewable(
  itemId: string,
  viewer: UserIdentity | null
): Promise<boolean> {
  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    columns: { profile_id: true },
  });
  if (!item) return false;

  if (viewer && viewer.activeProfile.id === item.profile_id) return true;

  const memberships = await db
    .select({ list_id: list_items.list_id })
    .from(list_items)
    .where(eq(list_items.item_id, itemId));
  if (memberships.length === 0) return false;

  const candidateLists = await db
    .select({
      id: lists.id,
      profile_id: lists.profile_id,
      visibility: lists.visibility,
    })
    .from(lists)
    .where(
      inArray(
        lists.id,
        memberships.map((m) => m.list_id)
      )
    );

  for (const list of candidateLists) {
    if (viewer && list.profile_id === viewer.activeProfile.id) return true;
    if (
      viewer &&
      (await hasBlocked({
        blockerProfileId: list.profile_id,
        blockedProfileId: viewer.selfProfile.id,
      }))
    )
      continue;
    if (fromDb(list.visibility) !== VISIBILITY.OWNER) return true;
  }
  return false;
}
