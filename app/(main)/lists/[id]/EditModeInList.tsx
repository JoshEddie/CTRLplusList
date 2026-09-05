'use client';

import { useSortableSensors } from '@/app/(main)/items/ui/components/useSortableSensors';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import { closestCenter, DndContext, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useId, useMemo, useState } from 'react';
import { EDIT_MODE_TABS } from './EditModeBand';
import type { StagedEntry } from './editModeChanges';
import EditModeQuantitySheet from './EditModeQuantitySheet';
import EditModeRow from './EditModeRow';
import { listRows } from './editModeRows';
import SortableEditModeRow from './SortableEditModeRow';

// Never filtered and never paginated: reorder is this tab's one gesture, and a
// row has to be draggable from anywhere in the list to anywhere else.
export default function EditModeInList({
  items,
  saved,
  entries,
  moved,
  onQuantityChange,
  onReorder,
}: {
  items: ItemDisplay[];
  saved: StagedEntry[];
  entries: StagedEntry[];
  moved: ReadonlySet<string>;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onReorder: (activeId: string, overId: string) => void;
}) {
  const dndId = useId();
  const sensors = useSortableSensors();
  const [sheetItem, setSheetItem] = useState<ItemDisplay | null>(null);

  const rows = useMemo(
    () => listRows(items, saved, entries, moved),
    [items, saved, entries, moved]
  );
  const quantityOf = (itemId: string) =>
    entries.find((entry) => entry.item_id === itemId)?.quantity ?? 0;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  return (
    <section
      id={EDIT_MODE_TABS.list.panelId}
      role="tabpanel"
      aria-labelledby={EDIT_MODE_TABS.list.tabId}
      className="edit-mode-panel"
    >
      {rows.length === 0 ? (
        <p className="edit-mode-empty">{getMessage('edit_mode_list_empty')}</p>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows
              .filter((row) => row.status !== 'removed')
              .map((row) => row.item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="edit-mode-list">
              {rows.map((row) =>
                row.status === 'removed' ? (
                  <li key={row.item.id} className="edit-mode-item is-removed">
                    <EditModeRow
                      item={row.item}
                      quantity={0}
                      status="removed"
                      onQuantityChange={onQuantityChange}
                      onOpen={setSheetItem}
                    />
                  </li>
                ) : (
                  <SortableEditModeRow
                    key={row.item.id}
                    item={row.item}
                    quantity={row.quantity}
                    status={row.status}
                    onQuantityChange={onQuantityChange}
                    onOpen={setSheetItem}
                  />
                )
              )}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {sheetItem && (
        <EditModeQuantitySheet
          item={sheetItem}
          quantity={quantityOf(sheetItem.id)}
          onQuantityChange={onQuantityChange}
          onClose={() => setSheetItem(null)}
        />
      )}
    </section>
  );
}
