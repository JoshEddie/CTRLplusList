import { getMessage } from '@/lib/i18n/utils';

/** One list entry as edit mode stages it: the array's order is the position. */
export type StagedEntry = { item_id: string; quantity: number };

// Entering and leaving the mode are one operation on one set of searchParams —
// only `edit` differs. Everything else the page was reached with (the spoiler
// tier, the filters) rides through in both directions, which is what makes the
// mode a toggle rather than a second page.
function listHref(
  listId: string,
  params: URLSearchParams | null,
  edit: boolean
): string {
  const next = new URLSearchParams(params?.toString());
  next.delete('new');
  next.delete('page');
  if (edit) next.set('edit', '1');
  else next.delete('edit');
  const queryString = next.toString();
  return queryString ? `/lists/${listId}?${queryString}` : `/lists/${listId}`;
}

export function enterEditHref(
  listId: string,
  params: URLSearchParams | null
): string {
  return listHref(listId, params, true);
}

export function exitEditHref(
  listId: string,
  params: URLSearchParams | null
): string {
  return listHref(listId, params, false);
}

// The primary always reads as the commit: on the create fork it counts what
// is staged, and with nothing staged it is a plain Save that just leaves.
export function editModeSaveLabel(
  isNew: boolean,
  totalSelected: number
): string {
  if (!isNew || totalSelected === 0) return getMessage('edit_mode_save_label');
  return getMessage('edit_mode_add_label', { count: totalSelected });
}

export const quantitiesOf = (entries: StagedEntry[]) =>
  new Map(entries.map((entry) => [entry.item_id, entry.quantity]));

// Reorder is judged on the rows both states share: an add lands at the end
// and a removal drops out, and neither is a move.
export function entryDiff(
  initial: StagedEntry[],
  staged: StagedEntry[]
): {
  added: number;
  removed: number;
  requantified: number;
  reordered: boolean;
} {
  const before = quantitiesOf(initial);
  const after = quantitiesOf(staged);
  let added = 0;
  let removed = 0;
  let requantified = 0;
  for (const [id, quantity] of after) {
    if (!before.has(id)) added++;
    else if (before.get(id) !== quantity) requantified++;
  }
  for (const id of before.keys()) if (!after.has(id)) removed++;
  const shared = (entries: StagedEntry[], other: Map<string, number>) =>
    entries
      .filter((entry) => other.has(entry.item_id))
      .map((entry) => entry.item_id)
      .join('\n');
  return {
    added,
    removed,
    requantified,
    reordered: shared(initial, after) !== shared(staged, before),
  };
}

// A move displaces every row between its start and its end, but only the
// dragged row's saved position changes (ADR-0010), so only it is pending.
export function pendingChanges(
  initial: StagedEntry[],
  staged: StagedEntry[],
  moved: ReadonlySet<string>
): Set<string> {
  const before = quantitiesOf(initial);
  const after = quantitiesOf(staged);
  const pending = new Set(moved);
  for (const [id, quantity] of after) {
    if (before.get(id) !== quantity) pending.add(id);
  }
  for (const id of before.keys()) if (!after.has(id)) pending.add(id);
  return pending;
}

export function moveEntry(
  entries: StagedEntry[],
  activeId: string,
  overId: string
): StagedEntry[] {
  const from = entries.findIndex((entry) => entry.item_id === activeId);
  const to = entries.findIndex((entry) => entry.item_id === overId);
  if (from < 0 || to < 0 || from === to) return entries;
  const next = [...entries];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/** The order `In this list` shows: the staged entries, with every saved entry removed this session spliced back at the index it held. */
export function displayOrder(
  staged: StagedEntry[],
  saved: StagedEntry[]
): { item_id: string; removed: boolean }[] {
  const stagedIds = new Set(staged.map((entry) => entry.item_id));
  const order = staged.map((entry) => ({
    item_id: entry.item_id,
    removed: false,
  }));
  saved.forEach((entry, index) => {
    if (stagedIds.has(entry.item_id)) return;
    order.splice(Math.min(index, order.length), 0, {
      item_id: entry.item_id,
      removed: true,
    });
  });
  return order;
}

// Where a removed entry goes back into the staged array so that the shown
// order does not change: its shown index, less the removed rows still ahead
// of it, which the staged array does not hold.
function restoreIndex(
  entries: StagedEntry[],
  saved: StagedEntry[],
  itemId: string
): number {
  const shown = displayOrder(entries, saved);
  const at = shown.findIndex((row) => row.item_id === itemId);
  if (at < 0) return entries.length;
  return at - shown.slice(0, at).filter((row) => row.removed).length;
}

// The one membership control: 0 removes, a new item lands at the end, and a
// saved entry being put back lands where its struck-through row already is.
export function setEntryQuantity(
  entries: StagedEntry[],
  saved: StagedEntry[],
  itemId: string,
  quantity: number
): StagedEntry[] {
  if (quantity <= 0) return entries.filter((entry) => entry.item_id !== itemId);
  if (entries.some((entry) => entry.item_id === itemId))
    return entries.map((entry) =>
      entry.item_id === itemId ? { ...entry, quantity } : entry
    );
  const next = [...entries];
  next.splice(restoreIndex(entries, saved, itemId), 0, {
    item_id: itemId,
    quantity,
  });
  return next;
}

// Where a click on an in-app link would take the page, or null when the click
// is not a plain navigation the mode should intercept.
export function inAppDestination(event: MouseEvent): string | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return null;
  const anchor =
    event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target === '_blank' || anchor.origin !== window.location.origin)
    return null;
  return anchor.pathname + anchor.search + anchor.hash;
}
