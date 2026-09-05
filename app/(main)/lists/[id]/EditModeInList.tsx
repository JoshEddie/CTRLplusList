'use client';

import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import { useSortableSensors } from '@/app/(main)/items/ui/components/useSortableSensors';
import { closestCenter, DndContext, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useId } from 'react';
import EditModeSection from './EditModeSection';
import SortableEditModeRow from './SortableEditModeRow';

export default function EditModeInList({
  rows,
  total,
  filtered,
  quantityOf,
  pending,
  onQuantityChange,
  onOpen,
  onReorder,
}: {
  /** The members that survive the filters, in staged position order. */
  rows: ItemDisplay[];
  total: number;
  filtered: boolean;
  quantityOf: (itemId: string) => number;
  pending: ReadonlySet<string>;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onOpen: (item: ItemDisplay) => void;
  onReorder: (activeId: string, overId: string) => void;
}) {
  const dndId = useId();
  const sensors = useSortableSensors();

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  const title = filtered
    ? getMessage('edit_mode_section_in_list_filtered', {
        shown: rows.length,
        total,
      })
    : getMessage('edit_mode_section_in_list', { count: total });
  const empty =
    total === 0
      ? getMessage('edit_mode_list_empty')
      : rows.length === 0
        ? getMessage('edit_mode_list_no_matches')
        : undefined;

  return (
    <EditModeSection
      kind="in"
      title={title}
      hint={
        filtered && total > 0 ? getMessage('edit_mode_reorder_hint') : undefined
      }
      empty={empty}
    >
      {rows.length > 0 && (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="edit-mode-list" role="list">
              {rows.map((item) => (
                <SortableEditModeRow
                  key={item.id}
                  item={item}
                  quantity={quantityOf(item.id)}
                  pending={pending.has(item.id)}
                  disabled={filtered}
                  onQuantityChange={onQuantityChange}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </EditModeSection>
  );
}
