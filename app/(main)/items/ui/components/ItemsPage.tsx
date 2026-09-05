'use client';

import { Button } from '@/app/ui/components/button';
import Empty from '@/app/ui/components/Empty';
import { SWITCH_PROFILE_ACTION } from '@/lib/activeProfile';
import Header from '@/app/ui/components/Header';
import { HERO_TOOLBAR_SLOT_ID } from '@/app/(main)/lists/ui/components/ListHeroSurface';
import {
  ProfileMembershipView,
  ItemDisplay,
  ListTable,
  SpoilerTier,
} from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { Tabs } from '@/app/ui/components/tabs';
import ItemFormContainer from './itemform/ItemFormContainer';
import ItemsBrowser from './ItemsBrowser';

interface ItemsPageProps {
  items: ItemDisplay[];
  archivedItems?: ItemDisplay[];
  actor?: ProfileMembershipView;
  user_name?: string | null;
  lists?: ListTable[];
  initialPageSize?: number;
  // The active profile's name, present only for a viewer who runs more than
  // one. It names the profile on the creation surface, and its presence is
  // what offers the empty state a route to the Profiles page.
  actingAs?: string;
  tier?: SpoilerTier;
  baseline?: SpoilerTier;
}

type Tab = 'active' | 'archived';

const ITEMS_PANEL_ID = 'items-panel';

export default function ItemsPage({
  items,
  archivedItems = [],
  actor,
  user_name,
  lists,
  initialPageSize,
  actingAs,
  tier,
  baseline,
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
      {/* Sticky block pinning header + tabs + toolbar below the app nav.
          The toolbar rides along via ItemsBrowser's existing slot portal. */}
      <div className="pinned-page-chrome">
        <Header title="Items">
          <Button
            variant="primary"
            aria-label="New Item"
            onClick={() => setShowNewItem(true)}
          >
            <FaPlus size={14} />
            <span className="mobile-hide">New Item</span>
          </Button>
        </Header>

        <Tabs
          size="sm"
          aria-label="Filter items by archive state"
          items={[
            {
              label: `Active (${items.length})`,
              value: 'active',
              panelId: ITEMS_PANEL_ID,
            },
            {
              label: `Archived (${archivedItems.length})`,
              value: 'archived',
              panelId: ITEMS_PANEL_ID,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div id={HERO_TOOLBAR_SLOT_ID} />
      </div>

      <div id={ITEMS_PANEL_ID}>
        {source.length === 0 ? (
          tab === 'active' ? (
            <Empty
              type="item"
              setShowNewItem={setShowNewItem}
              secondaryAction={actingAs ? SWITCH_PROFILE_ACTION : undefined}
            />
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
            actor={actor}
            user_name={user_name}
            showArchiveAction
            archivedView={tab === 'archived'}
            tier={tier}
            baseline={baseline}
          />
        )}
      </div>
      {showNewItem && (
        <ItemFormContainer
          actingAs={actingAs}
          lists={lists || []}
          onClose={() => setShowNewItem(false)}
          onSuccess={() => setShowNewItem(false)}
        />
      )}
    </>
  );
}
