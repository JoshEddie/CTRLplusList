'use client';

import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import { useSortable } from '@dnd-kit/sortable';
import { MdOutlineDragHandle } from 'react-icons/md';
import EditModeRow from './EditModeRow';

// The handle stays rendered while a filter suspends reorder: dropping it
// would shift the row's layout for the length of a search.
export default function SortableEditModeRow({
  item,
  quantity,
  pending,
  disabled,
  onQuantityChange,
  onOpen,
}: {
  item: ItemDisplay;
  quantity: number;
  pending: boolean;
  disabled: boolean;
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
  } = useSortable({ id: item.id, disabled });

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
        pending={pending}
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
