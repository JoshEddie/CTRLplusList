'use client';

import { updatePriority } from '@/lib/data/listItems.actions';
import { LinkButton } from '@/app/ui/components/button';
import { ItemDisplay } from '@/lib/types';
import { MdChecklist } from 'react-icons/md';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineDragHandle } from 'react-icons/md';
import Item from './Item';

interface ItemsProps {
  items: ItemDisplay[];
  listId: string;
  user_id?: string;
  showSpoilers?: boolean;
}

function EmptyListCTA({ listId }: { listId: string }) {
  return (
    <div className="empty-container">
      <h3>No items on this list yet</h3>
      <p>Pick from your item library or create a new one.</p>
      <LinkButton href={`/lists/${listId}/choose-items`} variant="primary">
        <MdChecklist size={18} />
        Choose items
      </LinkButton>
    </div>
  );
}

export default function SortItems({
  items,
  listId,
  user_id,
  showSpoilers,
}: ItemsProps) {
  const router = useRouter();
  // Re-sync key: changes whenever any card-visible field changes, so an edit
  // (image, name, quantity, stores) or a claim/unclaim re-seeds itemsState.
  // Omitting the edit fields left the grid stale after edits until a full
  // remount.
  const itemsKey = items
    .map((i) => {
      const pkey = (i.purchases ?? [])
        .map((p) => `${p.id}:${p.firstName}:${p.by}`)
        .join('|');
      const skey = (i.stores ?? [])
        .map((s) => `${s.name}:${s.price}:${s.link}`)
        .join('|');
      return `${i.id}:${i.name}:${i.image_url ?? ''}:${i.quantity_limit ?? ''}[${pkey}][${skey}]`;
    })
    .join(';');
  const dndId = useId();
  const [itemsState, setItemsState] = useState(items);
  const [prevItemsKey, setPrevItemsKey] = useState(itemsKey);
  if (itemsKey !== prevItemsKey) {
    setPrevItemsKey(itemsKey);
    setItemsState(items);
  }
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getIndex = (id: UniqueIdentifier) =>
    itemsState.findIndex((item) => item.id === id);
  const activeIndex = activeId != null ? getIndex(activeId) : -1;

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setIsDragging(false);
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = getIndex(active.id);
    const newIndex = getIndex(over.id);
    const previousItems = itemsState;

    setItemsState((items) => arrayMove(items, oldIndex, newIndex));

    const result = await updatePriority(
      active.id as string,
      over.id as string,
      listId
    );

    if (!result.success) {
      setItemsState(previousItems);
      toast.error(result.message || 'Failed to reorder items');
      return;
    }

    router.refresh();
  };

  const handleDragCancel = () => {
    setIsDragging(false);
    setActiveId(null);
  };

  return itemsState.length === 0 ? (
    <EmptyListCTA listId={listId} />
  ) : (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={itemsState.map((item) => item.id)}
        // strategy={rectSortingStrategy}
      >
        <div className="item-grid sortable">
          {itemsState.map((item) => {
            return (
              <SortableItem
                key={item.id}
                id={item.id}
                item={item}
                listId={listId}
                user_id={user_id}
                showSpoilers={showSpoilers}
                isAnyDragging={isDragging}
              />
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay className="sortable-item">
        {activeId ? (
          <Item
            item={itemsState[activeIndex]}
            className="item-drag-overlay"
            user_id={user_id}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function SortableItem({
  id,
  item,
  className,
  listId,
  user_id,
  showSpoilers,
  isAnyDragging = false,
}: {
  id: string;
  item: ItemDisplay;
  className?: string;
  listId?: string;
  user_id?: string;
  showSpoilers?: boolean;
  isAnyDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging ? 'true' : undefined}
      {...attributes}
      className={`
        sortable-item 
        ${isDragging ? 'is-dragging' : ''} 
        ${isAnyDragging ? 'drag-active' : ''}
        ${className || ''}
      `
        .trim()
        .replace(/\s+/g, ' ')}
    >
      <button
        type="button"
        className="drag-handle"
        {...listeners}
        aria-label="Drag to reorder item"
      >
        <MdOutlineDragHandle size={40} className="drag-handle-icon" />
      </button>
      <Item
        item={item}
        listId={listId}
        user_id={user_id}
        showSpoilers={showSpoilers}
      />
    </div>
  );
}
