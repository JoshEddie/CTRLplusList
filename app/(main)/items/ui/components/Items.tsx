'use client';

import { ItemDisplay } from '@/lib/types';
import Item from './Item';

interface ItemsProps {
  items: ItemDisplay[];
  user_id?: string;
  user_name?: string | null;
}

export default function Items({
  items,
  user_id,
  user_name,
}: ItemsProps) {

  return (
    <div className="item-grid">
      {items.map((item) => {
        return (
          <Item
            key={item.id}
            item={item}
            user_id={user_id}
            user_name={user_name}
          />
        );
      })}
    </div>
  );
}
