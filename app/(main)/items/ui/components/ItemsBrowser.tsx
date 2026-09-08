'use client';

import { Button } from '@/app/ui/components/button';
import {
  ProfileMembershipView,
  ItemDisplay,
  SortKey,
  SpoilerTier,
} from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import Items from './Items';
import ToolbarSlot from './itemsToolbar/ToolbarSlot';
import Pagination from './Pagination';
import { browseItems, parseSort } from './itemFilters';
import { useItemsPageSize } from './useItemsPageSize';

type BrowserMode = 'items' | 'list';

const EMPTY: ReadonlySet<string> = new Set();

interface ItemsBrowserProps {
  items: ItemDisplay[];
  mode: BrowserMode;
  initialPageSize?: number;
  actor?: ProfileMembershipView;
  user_name?: string | null;
  showArchiveAction?: boolean;
  archivedView?: boolean;
  /** The viewer's resolved tier, and the baseline the library toggle writes deltas against. Baseline is present only where the toggle renders (the library). */
  tier?: SpoilerTier;
  baseline?: SpoilerTier;
  /** Rendered instead of the rows when there are no items at all — as opposed to none surviving the filters. */
  emptyState?: ReactNode;
}

const VALID_SORT_ITEMS: SortKey[] = [
  'created_desc',
  'created_asc',
  'name_asc',
  'name_desc',
  'store_asc',
  'store_desc',
  'price_asc',
  'price_desc',
];

const VALID_SORT_LIST: SortKey[] = [
  'list_order',
  'name_asc',
  'name_desc',
  'store_asc',
  'store_desc',
  'price_asc',
  'price_desc',
];

export default function ItemsBrowser({
  items,
  mode,
  initialPageSize,
  actor,
  user_name,
  showArchiveAction,
  archivedView,
  tier,
  baseline,
  emptyState,
}: ItemsBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultSort: SortKey = mode === 'list' ? 'list_order' : 'created_desc';
  const validSorts = mode === 'list' ? VALID_SORT_LIST : VALID_SORT_ITEMS;

  const sort = parseSort(searchParams, validSorts, defaultSort);
  const view: 'grid' | 'list' =
    searchParams?.get('view') === 'list' ? 'list' : 'grid';

  const [pageSize, handlePageSizeChange] = useItemsPageSize(initialPageSize);

  // Entries the owner has stepped to 0 since this surface was read. The cards
  // stay put at 0 by design, so `items` still carries them and the ends below
  // would otherwise go on naming a row that no longer exists — a move against
  // it is a write that cannot land.
  const [offList, setOffList] = useState<ReadonlySet<string>>(EMPTY);
  const handleEntryPresence = useCallback((itemId: string, onList: boolean) => {
    setOffList((prev) => {
      if (prev.has(itemId) !== onList) return prev;
      const next = new Set(prev);
      if (onList) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  // Read off the whole list rather than the page: moving to the top of the
  // list's own order means the top of the list, not the top of what a filter
  // left standing. Absent under any other sort, which the move would silently
  // rewrite, and on a list too short to have two ends.
  const onList = useMemo(
    () => items.filter((item) => !offList.has(item.id)),
    [items, offList]
  );
  const listEnds =
    mode === 'list' && sort === 'list_order' && onList.length > 1
      ? { first: onList[0].id, last: onList[onList.length - 1].id }
      : undefined;

  const {
    rows: visible,
    page,
    totalPages,
    matches,
  } = useMemo(
    () => browseItems(items, searchParams, sort, pageSize),
    [items, searchParams, sort, pageSize]
  );

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('q');
    params.delete('store');
    params.delete('price_min');
    params.delete('price_max');
    params.delete('page');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="items-browser">
      <ToolbarSlot items={items} mode={mode} tier={tier} baseline={baseline} />
      {items.length === 0 && emptyState ? (
        emptyState
      ) : matches === 0 ? (
        <div className="items-empty-filtered">
          <p>No items match your filters.</p>
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <Items
            items={visible}
            actor={actor}
            user_name={user_name}
            view={view}
            tier={tier}
            showArchiveAction={showArchiveAction}
            archivedView={archivedView}
            listEnds={listEnds}
            onEntryPresence={handleEntryPresence}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
}
