'use client';

import Empty from '@/app/ui/components/Empty';
import Header from '@/app/ui/components/Header';
import { ItemDisplay, ListTable } from '@/lib/types';
import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import Item from './Item';
import ItemFormContainer from './itemform/ItemFormContainer';

interface ItemsProps {
  items: ItemDisplay[];
  lists?: ListTable[];
  user_id?: string;
  user_name?: string | null;
  type?: string;
}

export default function Items({
  items,
  user_id,
  user_name,
  type = 'item',
  lists,
}: ItemsProps) {
  const [showNewItem, setShowNewItem] = useState(false);

  return (
    <>
      <Header title="Items">
        <button className="btn primary" onClick={() => setShowNewItem(true)}>
          <FaPlus size={14} />
          <span className="mobile-hide">New Item</span>
        </button>
      </Header>
      {items.length === 0 ? (
      <Empty type={type} setShowNewItem={setShowNewItem}/>) : (
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
      )}
      {showNewItem && <ItemFormContainer lists={lists || []} user_id={user_id || ''} onClose={() => setShowNewItem(false)} />}
    </>
  );
}
