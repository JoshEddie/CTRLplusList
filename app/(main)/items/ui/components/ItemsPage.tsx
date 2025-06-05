'use client';

import Empty from '@/app/ui/components/Empty';
import Header from '@/app/ui/components/Header';
import { ItemDisplay, ListTable } from '@/lib/types';
import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import ItemFormContainer from './itemform/ItemFormContainer';
import Items from './Items';

interface ItemsPageProps {
  items: ItemDisplay[];
  user_id?: string;
  user_name?: string | null;
  lists?: ListTable[];
}

export default function ItemsPage({
  items,
  user_id,
  user_name,
  lists,
}: ItemsPageProps) {
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
        <Empty type="item" setShowNewItem={setShowNewItem} />
      ) : (
        <Items
          items={items}
          user_id={user_id}
          user_name={user_name}
        />
      )}
      {showNewItem && (
        <ItemFormContainer
          lists={lists || []}
          user_id={user_id || ''}
          onClose={() => setShowNewItem(false)}
        />
      )}
    </>
  );
}
