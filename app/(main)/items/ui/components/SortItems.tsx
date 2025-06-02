'use client';

import { updatePriority } from '@/app/actions/lists';
import Empty from '@/app/ui/components/Empty';
import { ItemDisplay } from '@/lib/types';
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
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { RxDragHandleDots1 } from 'react-icons/rx';
import Item from './Item';

interface ItemsProps {
  items: ItemDisplay[];
  listId: string;
  user_id?: string;
}

export default function SortItems({ items, listId, user_id }: ItemsProps) {
  const [itemsState, setItemsState] = useState(items);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setIsDragging(false);

    if (!over) {
      setActiveId(null);
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = getIndex(active.id);
      const newIndex = getIndex(over.id);
      
      setItemsState((items) => arrayMove(items, oldIndex, newIndex));
      updatePriority(active.id as string, over.id as string, listId);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setIsDragging(false);
    setActiveId(null);
  };

  return itemsState.length === 0 ? (
    <Empty type="item" />
  ) : (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={itemsState.map((item) => item.id)}
        strategy={rectSortingStrategy}
      >
        <div className="item-grid sortable">
          {itemsState.map((item) => {
            return (
              <SortableItem
                key={item.id}
                id={item.id}
                item={item}
                user_id={user_id}
                isAnyDragging={isDragging}
              />
            );
          })}
        </div>
      </SortableContext>

        <DragOverlay>
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
  user_id,
  isAnyDragging = false,
}: {
  id: string;
  item: ItemDisplay;
  className?: string;
  user_id?: string;
  isAnyDragging?: boolean;
}) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition,
    isDragging 
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
      data-dragging={isDragging ? "true" : undefined}
      {...attributes}
      className={`
        sortable-item 
        ${isDragging ? 'is-dragging' : ''} 
        ${isAnyDragging ? 'drag-active' : ''}
        ${className || ''}
      `.trim().replace(/\s+/g, ' ')}
    >
      <div 
        className="drag-handle" 
        {...listeners}
        aria-label="Drag to reorder"
      >
        <RxDragHandleDots1 size={40} className="drag-handle-icon"/>
      </div>
      <Item
        item={item}
        user_id={user_id}
      />
    </div>
  );
}
