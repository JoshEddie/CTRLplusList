'use client';

import ItemFormContainer from '@/app/(main)/items/ui/components/itemform/ItemFormContainer';
import { ListTable } from '@/lib/types';
import { useMemo, useState, type ReactNode } from 'react';
import ListOwnerBand from './ListOwnerBand';
import {
  OWNER_PANEL_ID,
  OWNER_TAB_IDS,
  OwnerTabsContext,
  type OwnerTab,
} from './ownerTabs';

// The owner's two surfaces are both server-rendered and swapped here rather
// than behind a search param: only the selected one mounts, so the toolbar
// portal has one claimant, and no href builder has to carry the filters
// across a tab change.
export default function ListOwnerTabs({
  listId,
  inListCount,
  lists,
  actingAs,
  library,
  children,
}: {
  listId: string;
  inListCount: number;
  /** The picker's options for a newly created item. */
  lists: ListTable[];
  actingAs?: string;
  /** The item library, scoped to this list's entries. */
  library: ReactNode;
  /** The list's own item surface. */
  children: ReactNode;
}) {
  // A list with nothing on it opens on the library: what an owner can put on
  // it is the only thing there is to see.
  const [tab, setTab] = useState<OwnerTab>(
    inListCount === 0 ? 'library' : 'list'
  );
  const [creating, setCreating] = useState(false);

  const api = useMemo(
    () => ({
      showLibrary: () => setTab('library'),
      createItem: () => setCreating(true),
    }),
    []
  );

  return (
    <OwnerTabsContext.Provider value={api}>
      <ListOwnerBand
        tab={tab}
        onTabChange={setTab}
        inListCount={inListCount}
        onCreate={api.createItem}
        onChooseExisting={api.showLibrary}
      />
      <div
        id={OWNER_PANEL_ID}
        role="tabpanel"
        aria-labelledby={OWNER_TAB_IDS[tab]}
      >
        {tab === 'list' ? children : library}
      </div>
      {creating && (
        <ItemFormContainer
          lists={lists}
          defaultListId={listId}
          actingAs={actingAs}
          onClose={() => setCreating(false)}
          // The form's save attaches the entry at quantity 1 and refreshes;
          // there is no separate add for this surface to perform.
          onSuccess={() => setCreating(false)}
        />
      )}
    </OwnerTabsContext.Provider>
  );
}
