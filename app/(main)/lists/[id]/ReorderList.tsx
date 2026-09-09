'use client';

import { useSortableSensors } from '@/app/(main)/items/ui/components/useSortableSensors';
import { HERO_FREEZE_ATTR } from '@/app/(main)/lists/ui/components/ListHeroSurface';
import { Button } from '@/app/ui/components/button';
import { updatePriority } from '@/lib/data/listItems.actions';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay } from '@/lib/types';
import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { useOwnerTabs } from './ownerTabs';
import ReorderRow from './ReorderRow';

// The whole list, unpaged and unfiltered, in the order it holds: an entry has
// to be draggable from anywhere in it to anywhere else, and a sort or a filter
// would be an order this surface cannot write.
//
// Every move commits as it is made, so there is no Save and nothing to lose by
// stopping partway. The write is pairwise — the moved entry takes a position
// between its target and the neighbour it is travelling from — which is why
// both affordances name a target row rather than an index.
export default function ReorderList({
  listId,
  items,
}: {
  listId: string;
  items: ItemDisplay[];
}) {
  const { showList } = useOwnerTabs();
  const dndId = useId();
  const sensors = useSortableSensors();
  const [order, setOrder] = useState(items);
  const [, startTransition] = useTransition();
  // The same ticket the card's entry writes use: a refused move must not
  // revert an order the owner has since moved past.
  const latest = useRef(0);

  // The hero holds whatever state it is already in for the length of a drag.
  // The chrome expands again after sustained upward travel, and dragging
  // toward the top of a long list produces exactly that through the drag
  // library's auto-scroll — the header would grow mid-drag and slide every
  // drop target down under the pointer. Signalled through the DOM because the
  // chrome writes its own classes there rather than re-rendering.
  const freeze = () =>
    document.documentElement.setAttribute(HERO_FREEZE_ATTR, '');
  const thaw = () => document.documentElement.removeAttribute(HERO_FREEZE_ATTR);
  useEffect(() => thaw, []);

  const move = (itemId: string, targetId: string) => {
    const from = order.findIndex((item) => item.id === itemId);
    const to = order.findIndex((item) => item.id === targetId);
    const previous = order;
    const ticket = ++latest.current;
    setOrder(arrayMove(order, from, to));
    startTransition(async () => {
      const result = await updatePriority(itemId, targetId, listId);
      if (ticket !== latest.current || result.success) return;
      setOrder(previous);
      toast.error(result.message);
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    thaw();
    if (!over || active.id === over.id) return;
    move(String(active.id), String(over.id));
  };

  return (
    <section className="reorder-panel">
      <div className="reorder-panel-head">
        <p className="reorder-panel-hint">{getMessage('reorder_hint')}</p>
        <Button variant="primary" size="sm" onClick={showList}>
          {getMessage('reorder_done_label')}
        </Button>
      </div>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={freeze}
        onDragEnd={handleDragEnd}
        onDragCancel={thaw}
      >
        <SortableContext
          items={order.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="reorder-list">
            {order.map((item, index) => (
              <ReorderRow
                key={item.id}
                item={item}
                position={index + 1}
                isFirst={index === 0}
                isLast={index === order.length - 1}
                onMoveUp={() => move(item.id, order[index - 1].id)}
                onMoveDown={() => move(item.id, order[index + 1].id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
