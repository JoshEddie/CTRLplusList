import { db } from '@/db';
import { items, list_items, lists, purchases } from '@/db/schema';
import { and, eq, inArray, or } from 'drizzle-orm';
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
    if (await isListViewable(list, viewer)) return true;
  }
  return false;
}

async function isListViewable(
  list: { profile_id: string; visibility: string },
  viewer: UserIdentity | null
): Promise<boolean> {
  if (viewer && list.profile_id === viewer.activeProfile.id) return true;
  if (
    viewer &&
    (await hasBlocked({
      blockerProfileId: list.profile_id,
      blockedProfileId: viewer.selfProfile.id,
    }))
  )
    return false;
  return fromDb(list.visibility) !== VISIBILITY.OWNER;
}

/**
 * Returns true iff the list entry — this item's presence on this list — exists
 * and sits on a list the viewer may view, by the same predicate
 * `isItemViewable` applies per candidate list.
 *
 * This is the claim gate. A claim belongs to an entry, so what a viewer may
 * claim is an item's presence on a list they can see, not an item they can
 * reach through some other list. An item on no list has no entry and so is
 * unclaimable, which is the intended loss: such items are owner-only anyway.
 *
 * The item and the list must agree on whose they are, the same rule the list
 * reads narrow by — an entry pairing someone else's item with your list is not
 * a thing anyone may claim against.
 *
 * A soft-removed entry is not viewable by default, which is what makes the
 * claim gate refuse it: the owner has dropped the item, so it admits no new
 * claims. `includeRemoved` opens it for the reveals reached from a ghost that
 * is ON somebody's screen — managing a claim already made is not making one —
 * and it opens it no wider than that: only the list's owner, and whoever holds
 * a claim on the entry, are people the read path ever shows a ghost to. A
 * caller who merely holds the two ids is refused, so the reveals cannot answer
 * the question the read withholds.
 */
export async function isEntryViewable(
  listId: string,
  itemId: string,
  viewer: UserIdentity | null,
  opts: { includeRemoved?: boolean } = {}
): Promise<boolean> {
  const [entry] = await db
    .select({
      profile_id: lists.profile_id,
      visibility: lists.visibility,
      shown: list_items.shown,
    })
    .from(list_items)
    .innerJoin(lists, eq(lists.id, list_items.list_id))
    .innerJoin(items, eq(items.id, list_items.item_id))
    .where(
      and(
        eq(list_items.list_id, listId),
        eq(list_items.item_id, itemId),
        eq(items.profile_id, lists.profile_id)
      )
    );
  if (!entry) return false;
  if (!entry.shown) {
    if (!opts.includeRemoved) return false;
    const owns = viewer?.activeProfile.id === entry.profile_id;
    if (!owns && !(await holdsEntryClaim(listId, itemId, viewer))) return false;
  }
  return isListViewable(entry, viewer);
}

// Whether the viewer is a party to a claim on the entry — its purchaser, or
// whoever recorded it. A guest's claim names no profile and is held by cookie
// alone (ADR-0008); no guest reaches the reveals this gates, so there is
// nothing here for one to match.
async function holdsEntryClaim(
  listId: string,
  itemId: string,
  viewer: UserIdentity | null
): Promise<boolean> {
  if (!viewer) return false;
  const [held] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(
      and(
        eq(purchases.list_id, listId),
        eq(purchases.item_id, itemId),
        or(
          eq(purchases.profile_id, viewer.selfProfile.id),
          eq(purchases.claimed_by_profile_id, viewer.selfProfile.id)
        )
      )
    )
    .limit(1);
  return !!held;
}
