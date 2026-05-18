'use client';

import Empty from '@/app/ui/components/Empty';
import Header from '@/app/ui/components/Header';
import { ItemDisplay, ListTable } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import ItemFormContainer from './itemform/ItemFormContainer';
import ItemsBrowser from './ItemsBrowser';

interface ItemsPageProps {
  items: ItemDisplay[];
  archivedItems?: ItemDisplay[];
  user_id?: string;
  user_name?: string | null;
  lists?: ListTable[];
  initialPageSize?: number;
}

type Tab = 'active' | 'archived';

export default function ItemsPage({
  items,
  archivedItems = [],
  user_id,
  user_name,
  lists,
  initialPageSize,
}: ItemsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showNewItem, setShowNewItem] = useState(false);

  const tab: Tab =
    searchParams?.get('tab') === 'archived' ? 'archived' : 'active';
  const source = tab === 'active' ? items : archivedItems;

  const setTab = (nextTab: Tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (nextTab === 'active') params.delete('tab');
    else params.set('tab', 'archived');
    params.delete('page');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <>
      <Header title="Items">
        <button className="btn primary" onClick={() => setShowNewItem(true)}>
          <FaPlus size={14} />
          <span className="mobile-hide">New Item</span>
        </button>
      </Header>

      <div
        className="items-tabs"
        role="tablist"
        aria-label="Filter items by archive state"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'active'}
          className={`items-tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          Active ({items.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'archived'}
          className={`items-tab ${tab === 'archived' ? 'active' : ''}`}
          onClick={() => setTab('archived')}
        >
          Archived ({archivedItems.length})
        </button>
      </div>

      {source.length === 0 ? (
        tab === 'active' ? (
          <Empty type="item" setShowNewItem={setShowNewItem} />
        ) : (
          <div className="empty-container">
            <h3>No archived items</h3>
            <p>Items you archive will appear here.</p>
          </div>
        )
      ) : (
        <ItemsBrowser
          items={source}
          mode="items"
          initialPageSize={initialPageSize}
          user_id={user_id}
          user_name={user_name}
          showArchiveAction
          archivedView={tab === 'archived'}
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
