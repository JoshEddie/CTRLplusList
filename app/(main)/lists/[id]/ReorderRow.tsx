'use client';

import ItemPhoto from '@/app/(main)/items/ui/components/ItemPhoto';
import PriceLine from '@/app/(main)/items/ui/components/PriceLine';
import ViewItemLink from '@/app/(main)/items/ui/components/ViewItemLink';
import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import { useSortable } from '@dnd-kit/sortable';
import {
  MdArrowDownward,
  MdArrowUpward,
  MdOutlineDragHandle,
} from 'react-icons/md';

// Two ways to make the same move: the handle for a drag, and the arrows for
// anyone the gesture does not serve. The arrows disable at the ends rather
// than disappearing, so the pair keeps one shape down the whole list.
export default function ReorderRow({
  item,
  position,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  item: ItemDisplay;
  /** The row's place in the list's own order, counting from 1. */
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const name = item.name ?? '';

  return (
    <li
      ref={setNodeRef}
      className={`reorder-item${isDragging ? ' is-dragging' : ''}`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
    >
      <div className="reorder-row">
        <button
          type="button"
          className="drag-handle reorder-handle"
          aria-label={getMessage('reorder_drag_handle_label', { name })}
          {...attributes}
          {...listeners}
        >
          <MdOutlineDragHandle size={24} />
        </button>
        <span className="reorder-position" aria-hidden>
          {position}
        </span>
        <ItemPhoto itemId={item.id} name={name} url={item.image_url || ''} />
        <div className="reorder-row-main">
          <span className="itemName reorder-row-name">{name}</span>
          <div className="reorder-row-meta">
            <PriceLine item={item} />
            <ViewItemLink
              store={item.store}
              size="sm"
              className="reorder-row-view"
            />
          </div>
        </div>
        <span className="reorder-quantity">
          {getMessage('reorder_quantity_chip', { count: item.quantity ?? 0 })}
        </span>
        <div className="reorder-arrows">
          <Button
            variant="secondary"
            size="sm"
            icon
            disabled={isFirst}
            aria-label={getMessage('reorder_move_up_label', { name })}
            onClick={onMoveUp}
          >
            <MdArrowUpward size={18} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon
            disabled={isLast}
            aria-label={getMessage('reorder_move_down_label', { name })}
            onClick={onMoveDown}
          >
            <MdArrowDownward size={18} />
          </Button>
        </div>
      </div>
    </li>
  );
}
