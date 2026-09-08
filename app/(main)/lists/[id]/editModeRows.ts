import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import {
  displayOrder,
  quantitiesOf,
  type StagedEntry,
} from './editModeChanges';

export type RowStatus = 'kept' | 'added' | 'removed' | 'requantified' | 'moved';

export interface Row {
  item: ItemDisplay;
  quantity: number;
  status: RowStatus;
}

// How one entry reads against what is saved. `moved` outranks a quantity
// change only because a row can carry one mark; the Save confirm counts both.
function statusOf(
  before: number | undefined,
  after: number | undefined,
  moved: boolean
): RowStatus {
  if (before === undefined) return after === undefined ? 'kept' : 'added';
  if (after === undefined) return 'removed';
  if (moved) return 'moved';
  return before === after ? 'kept' : 'requantified';
}

/**
 * `In this list` as it will exist at Save, removed rows included — nothing
 * leaves the surface until Save. An entry naming an item the library has not
 * delivered yet (one just created, ahead of the refresh) is skipped.
 */
export function listRows(
  items: ItemDisplay[],
  saved: StagedEntry[],
  staged: StagedEntry[],
  moved: ReadonlySet<string>
): Row[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const savedQty = quantitiesOf(saved);
  const stagedQty = quantitiesOf(staged);
  return displayOrder(staged, saved).flatMap(({ item_id, removed }) => {
    const item = byId.get(item_id);
    if (!item) return [];
    if (removed) return [{ item, quantity: 0, status: 'removed' as const }];
    const quantity = stagedQty.get(item_id) as number;
    return [
      {
        item,
        quantity,
        status: statusOf(savedQty.get(item_id), quantity, moved.has(item_id)),
      },
    ];
  });
}

/** A library card's mark: membership and quantity against what is saved, never position. */
export function cardStatus(
  before: number | undefined,
  after: number | undefined
): RowStatus {
  return statusOf(before, after, false);
}

export function statusLabel(status: RowStatus): string | null {
  switch (status) {
    case 'added':
      return getMessage('edit_mode_status_added');
    case 'removed':
      return getMessage('edit_mode_status_removed');
    case 'requantified':
      return getMessage('edit_mode_status_requantified');
    case 'moved':
      return getMessage('edit_mode_status_moved');
    default:
      return null;
  }
}
