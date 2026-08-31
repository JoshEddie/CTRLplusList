'use client';

import { ProfileMembershipView, ItemDisplay } from '@/lib/types';
import Item from './Item';

interface ItemsProps {
  items: ItemDisplay[];
  actor?: ProfileMembershipView;
  user_name?: string | null;
  view?: 'grid' | 'list';
  showSpoilers?: boolean;
  showArchiveAction?: boolean;
  archivedView?: boolean;
}

export default function Items({
  items,
  actor,
  user_name,
  view = 'grid',
  showSpoilers,
  showArchiveAction,
  archivedView,
}: ItemsProps) {
  return (
    <div className="item-grid-container">
      <div className={view === 'list' ? 'item-list' : 'item-grid'}>
        {items.map((item) => {
          return (
            <Item
              key={item.id}
              item={item}
              actor={actor}
              user_name={user_name}
              showSpoilers={showSpoilers}
              showArchiveAction={showArchiveAction}
              archivedView={archivedView}
            />
          );
        })}
      </div>
    </div>
  );
}
