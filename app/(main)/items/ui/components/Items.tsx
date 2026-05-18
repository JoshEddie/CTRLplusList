'use client';

import { ItemDisplay } from '@/lib/types';
import Item from './Item';

interface ItemsProps {
  items: ItemDisplay[];
  user_id?: string;
  user_name?: string | null;
  showArchiveAction?: boolean;
  archivedView?: boolean;
}

export default function Items({
  items,
  user_id,
  user_name,
  showArchiveAction,
  archivedView,
}: ItemsProps) {
  return (
    <div className="item-grid-container">
      <div className="item-grid">
        {items.map((item) => {
          return (
            <Item
              key={item.id}
              item={item}
              user_id={user_id}
              user_name={user_name}
              showArchiveAction={showArchiveAction}
              archivedView={archivedView}
            />
          );
        })}
      </div>
    </div>
  );
}
