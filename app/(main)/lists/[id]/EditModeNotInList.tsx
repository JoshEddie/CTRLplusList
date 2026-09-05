'use client';

import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import { FaPlus } from 'react-icons/fa';
import EditModeRow from './EditModeRow';
import EditModeSection from './EditModeSection';

export default function EditModeNotInList({
  rows,
  total,
  filtered,
  pending,
  onQuantityChange,
  onOpen,
  onCreate,
}: {
  /** The rest of the library that survives the filters, by name. */
  rows: ItemDisplay[];
  total: number;
  filtered: boolean;
  pending: ReadonlySet<string>;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onOpen: (item: ItemDisplay) => void;
  onCreate: () => void;
}) {
  const title = filtered
    ? getMessage('edit_mode_section_not_in_list_filtered', {
        shown: rows.length,
        total,
      })
    : getMessage('edit_mode_section_not_in_list', { count: total });
  const empty =
    total === 0
      ? getMessage('edit_mode_library_exhausted')
      : rows.length === 0
        ? getMessage('edit_mode_library_no_matches')
        : undefined;

  return (
    <EditModeSection kind="out" title={title} empty={empty}>
      {/* Ahead of the library the new item lands in — where a search that
          came up empty leaves the owner. */}
      <div className="edit-mode-create">
        <Button variant="primary" onClick={onCreate}>
          <FaPlus size={12} />
          {getMessage('edit_mode_create_item_label')}
        </Button>
      </div>
      <ul className="edit-mode-list" role="list">
        {rows.map((item) => (
          <li key={item.id} className="edit-mode-item">
            <EditModeRow
              item={item}
              quantity={0}
              pending={pending.has(item.id)}
              onQuantityChange={onQuantityChange}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ul>
    </EditModeSection>
  );
}
