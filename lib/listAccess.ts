import { db } from '@/db';
import { items, list_items, lists } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { isBlocked, isFollowing } from './dal';
import { VISIBILITY, fromDb } from './visibility';

/**
 * Guards a list-page render against unavailable conditions:
 *   - the list is missing (deleted, wrong id)
 *   - the list's owner has blocked the viewer
 *
 * On failure, redirects to `/lists` (or `/` for unauthenticated viewers
 * hitting a missing list) — the same end-state callers experienced for a
 * deleted list before this helper existed. Centralized here so future
 * changes (e.g. to a `notFound()` page) edit one place.
 */
export async function guardListViewable<T extends { user_id: string }>(
  list: T | null | undefined,
  viewerId: string | null
): Promise<T> {
  if (!list) {
    redirect(viewerId ? '/lists' : '/');
  }
  if (viewerId && (await isBlocked(list.user_id, viewerId))) {
    redirect('/lists');
  }
  return list;
}

/**
 * Returns true iff `viewerId` (null for anonymous) is permitted to view the
 * item — i.e. the item belongs to at least one list the caller can view.
 *
 * Used to gate `createPurchase` so a caller can't claim items on a private
 * list whose id they guessed. Mirrors the access predicate used by the
 * `/lists/[id]` render path:
 *   - owner: always viewable
 *   - followers-only / public list: viewable to followers (and to anyone for
 *     unlisted lists, since unlisted is link-shareable)
 *   - private list: only the owner
 *   - any list whose owner has blocked the viewer: not viewable
 *
 * Items not on any list are owner-only.
 */
// Per-list viewability decision. Split out from `isItemViewable` to keep the
// outer function under the cognitive-complexity ceiling enforced for this
// carve-out by eslint.config.mjs. Returns:
//   - `true`  → list satisfies viewability (short-circuit the loop)
//   - `false` → list does not satisfy; caller continues to next candidate
async function isListViewableForViewer(
  list: { user_id: string; visibility: string },
  viewerId: string | null
): Promise<boolean> {
  if (viewerId && list.user_id === viewerId) return true;
  if (viewerId && (await isBlocked(list.user_id, viewerId))) return false;
  const visibility = fromDb(list.visibility);
  if (visibility === VISIBILITY.OWNER) return false;
  if (visibility === VISIBILITY.LINK) return true;
  if (visibility === VISIBILITY.FOLLOWERS) {
    if (!viewerId) return false;
    return isFollowing(viewerId, list.user_id);
  }
  return false;
}

export async function isItemViewable(
  itemId: string,
  viewerId: string | null
): Promise<boolean> {
  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    columns: { user_id: true },
  });
  if (!item) return false;

  if (viewerId && viewerId === item.user_id) return true;

  const memberships = await db
    .select({ list_id: list_items.list_id })
    .from(list_items)
    .where(eq(list_items.item_id, itemId));
  if (memberships.length === 0) return false;

  const candidateLists = await db
    .select({
      id: lists.id,
      user_id: lists.user_id,
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
    if (await isListViewableForViewer(list, viewerId)) return true;
  }
  return false;
}
