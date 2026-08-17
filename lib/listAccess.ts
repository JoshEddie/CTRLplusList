import { db } from '@/db';
import { items, list_items, lists } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { hasBlocked } from '@/lib/data/profile';
import { VISIBILITY, fromDb } from './visibility';

/**
 * Guards a list-page render against unavailable conditions:
 *   - the list is missing (deleted, wrong id)
 *   - the list's owning profile has blocked the viewer's profile
 *
 * On failure, redirects to `/lists` (or `/` for unauthenticated viewers
 * hitting a missing list) — the same end-state callers experienced for a
 * deleted list before this helper existed. Centralized here so future
 * changes (e.g. to a `notFound()` page) edit one place.
 */
export async function guardListViewable<T extends { profile_id: string }>(
  list: T | null | undefined,
  viewerProfileId: string | null
): Promise<T> {
  if (!list) {
    redirect(viewerProfileId ? '/lists' : '/');
  }
  if (
    viewerProfileId &&
    (await hasBlocked({
      blockerProfileId: list.profile_id,
      blockedProfileId: viewerProfileId,
    }))
  ) {
    redirect('/lists');
  }
  return list;
}

/**
 * Returns true iff the viewer's profile (null for anonymous) is permitted to
 * view the item — i.e. the item belongs to at least one list the caller can
 * view.
 *
 * Used to gate `createPurchase` so a caller can't claim items on a private
 * list whose id they guessed. Mirrors the access predicate used by the
 * `/lists/[id]` render path:
 *   - owning profile: always viewable
 *   - public / unlisted list: viewable by anyone — both are link-open. The
 *     follow relationship governs feed discovery, not claim access, so a guest
 *     or any non-follower can view (and therefore claim) items on a public list
 *   - private list: only the owning profile
 *   - any list whose owning profile has blocked the viewer's profile: not
 *     viewable (block wins)
 *
 * Items not on any list are owner-only.
 */
export async function isItemViewable(
  itemId: string,
  viewerProfileId: string | null
): Promise<boolean> {
  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    columns: { profile_id: true },
  });
  if (!item) return false;

  if (viewerProfileId && viewerProfileId === item.profile_id) return true;

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
    if (viewerProfileId && list.profile_id === viewerProfileId) return true;
    if (
      viewerProfileId &&
      (await hasBlocked({
        blockerProfileId: list.profile_id,
        blockedProfileId: viewerProfileId,
      }))
    )
      continue;
    if (fromDb(list.visibility) !== VISIBILITY.OWNER) return true;
  }
  return false;
}
