import { redirect } from 'next/navigation';
import { isBlocked } from './dal';

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
