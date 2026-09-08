'use client';

import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import { useMemo } from 'react';
import { EDIT_MODE_TABS } from './EditModeBand';
import EditModeCard from './EditModeCard';
import { quantitiesOf, type StagedEntry } from './editModeChanges';
import { cardStatus } from './editModeRows';
import NewItemButton from './NewItemButton';

// The item library exactly as the items page renders it, less the claim state.
export default function EditModeLibrary({
  items,
  rows,
  saved,
  entries,
  onQuantityChange,
  onCreate,
}: {
  /** The whole library — what the toolbar's facets are offered over. */
  items: ItemDisplay[];
  /** The page of it that survives the filters. */
  rows: ItemDisplay[];
  saved: StagedEntry[];
  entries: StagedEntry[];
  onQuantityChange: (itemId: string, quantity: number) => void;
  onCreate: () => void;
}) {
  const savedQty = useMemo(() => quantitiesOf(saved), [saved]);
  const stagedQty = useMemo(() => quantitiesOf(entries), [entries]);

  return (
    <section
      id={EDIT_MODE_TABS.add.panelId}
      role="tabpanel"
      aria-labelledby={EDIT_MODE_TABS.add.tabId}
      className="edit-mode-panel edit-mode-library"
    >
      {items.length === 0 ? (
        <div className="empty-container">
          <h3>{getMessage('library_empty_title')}</h3>
          <p>{getMessage('library_empty_body')}</p>
          <NewItemButton onClick={onCreate} />
        </div>
      ) : rows.length === 0 ? (
        <p className="edit-mode-empty">
          {getMessage('edit_mode_library_no_matches')}
        </p>
      ) : (
        <div className="item-grid-container">
          <div className="item-grid">
            {rows.map((item) => (
              <EditModeCard
                key={item.id}
                item={item}
                quantity={stagedQty.get(item.id) ?? 0}
                status={cardStatus(
                  savedQty.get(item.id),
                  stagedQty.get(item.id)
                )}
                onQuantityChange={onQuantityChange}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
