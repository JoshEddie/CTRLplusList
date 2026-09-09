'use client';

import ItemFormContainer from '@/app/(main)/items/ui/components/itemform/ItemFormContainer';
import { ListTable } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import ListOwnerBand from './ListOwnerBand';
import {
  OWNER_PANEL_ID,
  OWNER_TAB_IDS,
  OwnerTabsContext,
  type OwnerTab,
} from './ownerTabs';

// The owner's surfaces are all server-rendered and swapped here rather than
// behind a search param: only the selected one mounts, so the toolbar portal
// has one claimant, and no href builder has to carry the filters across a tab
// change.
export default function ListOwnerTabs({
  listId,
  inListCount,
  lists,
  actingAs,
  library,
  reorder,
  children,
}: {
  listId: string;
  inListCount: number;
  /** The picker's options for a newly created item. */
  lists: ListTable[];
  actingAs?: string;
  /** The item library, scoped to this list's entries. */
  library: ReactNode;
  /** The list's order, arrangeable a move at a time. */
  reorder: ReactNode;
  /** The list's own item surface. */
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // A list with nothing on it opens on the library: what an owner can put on
  // it is the only thing there is to see.
  const [tab, setTab] = useState<OwnerTab>(
    inListCount === 0 ? 'library' : 'list'
  );
  const [creating, setCreating] = useState(false);

  // One entry has no order to arrange, and a drop needs a visible neighbour to
  // compute a midpoint against.
  const canReorder = inListCount > 1;

  const api = useMemo(
    () => ({
      showList: () => setTab('list'),
      showLibrary: () => setTab('library'),
      // The sort goes with the tab. The reorder surface reads position order
      // whatever the param says, so leaving a sort on would strand it: Done
      // returns to the list still sorted by something else, hiding the order
      // just arranged.
      showReorder: canReorder
        ? () => {
            const params = new URLSearchParams(searchParams?.toString() || '');
            if (params.has('sort')) {
              params.delete('sort');
              const query = params.toString();
              router.replace(query ? `${pathname}?${query}` : pathname);
            }
            setTab('reorder');
          }
        : undefined,
      createItem: () => setCreating(true),
    }),
    [canReorder, pathname, router, searchParams]
  );

  // The tab survives a list emptied down to one entry, so the panel falls back
  // rather than rendering a surface no tab is selected against.
  const active: OwnerTab = tab === 'reorder' && !canReorder ? 'list' : tab;

  return (
    <OwnerTabsContext.Provider value={api}>
      <ListOwnerBand
        tab={active}
        onTabChange={setTab}
        inListCount={inListCount}
        showReorder={canReorder}
        onCreate={api.createItem}
        onChooseExisting={api.showLibrary}
      />
      <div
        id={OWNER_PANEL_ID}
        role="tabpanel"
        aria-labelledby={OWNER_TAB_IDS[active]}
      >
        {active === 'list' && children}
        {active === 'library' && library}
        {active === 'reorder' && reorder}
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
