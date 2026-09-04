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

export function entryDiff(
  initial: ReadonlySet<string>,
  selected: ReadonlySet<string>
): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const id of selected) if (!initial.has(id)) added++;
  for (const id of initial) if (!selected.has(id)) removed++;
  return { added, removed };
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
