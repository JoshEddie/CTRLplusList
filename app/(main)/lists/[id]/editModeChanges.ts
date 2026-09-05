import { dateInputValue } from '@/app/(main)/lists/ui/components/utils';
import { getMessage } from '@/lib/i18n/utils';

export interface ListDetailsDraft {
  name: string;
  subtitle: string;
  occasion: string;
  date: string;
}

type ListDetailsSaved = {
  name: string;
  subtitle: string | null;
  occasion: string;
  date: Date;
};

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

export function editModeSaveLabel(
  isNew: boolean,
  totalSelected: number
): string {
  if (!isNew) return getMessage('edit_mode_save_label');
  return totalSelected > 0
    ? getMessage('edit_mode_add_label', { count: totalSelected })
    : getMessage('edit_mode_skip_label');
}

const quantities = (entries: StagedEntry[]) =>
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
  const before = quantities(initial);
  const after = quantities(staged);
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
  const before = quantities(initial);
  const after = quantities(staged);
  const pending = new Set(moved);
  for (const [id, quantity] of after) {
    if (before.get(id) !== quantity) pending.add(id);
  }
  for (const id of before.keys()) if (!after.has(id)) pending.add(id);
  return pending;
}

export function stagedUnits(staged: StagedEntry[]): number {
  return staged.reduce((sum, entry) => sum + entry.quantity, 0);
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

// A blank subtitle is stored as NULL, so the draft's empty string and the
// row's null are the same value and must not read as an edit.
export function detailsChanged(
  draft: ListDetailsDraft,
  saved: ListDetailsSaved
): boolean {
  const subtitle = draft.subtitle.trim();
  return (
    draft.name !== saved.name ||
    (subtitle === '' ? null : subtitle) !== saved.subtitle ||
    draft.occasion !== saved.occasion ||
    draft.date !== dateInputValue(saved.date)
  );
}
