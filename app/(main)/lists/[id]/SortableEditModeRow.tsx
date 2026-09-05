'use client';

import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import { useSortable } from '@dnd-kit/sortable';
import { MdOutlineDragHandle } from 'react-icons/md';
import EditModeRow from './EditModeRow';
import type { RowStatus } from './editModeRows';

export default function SortableEditModeRow({
  item,
  quantity,
  status,
  onQuantityChange,
  onOpen,
}: {
  item: ItemDisplay;
  quantity: number;
  status: RowStatus;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onOpen: (item: ItemDisplay) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      className={`edit-mode-item${isDragging ? ' is-dragging' : ''}`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
    >
      <EditModeRow
        item={item}
        quantity={quantity}
        status={status}
        onQuantityChange={onQuantityChange}
        onOpen={onOpen}
        handle={
          <button
            type="button"
            className="drag-handle edit-mode-handle"
            aria-label={getMessage('edit_mode_drag_handle_label')}
            {...attributes}
            {...listeners}
          >
            <MdOutlineDragHandle size={24} />
          </button>
        }
      />
    </li>
  );
}
