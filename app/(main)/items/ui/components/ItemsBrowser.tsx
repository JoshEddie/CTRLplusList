'use client';

import { Button } from '@/app/ui/components/button';
import {
  ProfileMembershipView,
  ItemDisplay,
  SortKey,
  SpoilerTier,
} from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import Items from './Items';
import ToolbarSlot from './itemsToolbar/ToolbarSlot';
import Pagination from './Pagination';
import { browseItems, parseSort } from './itemFilters';
import { useItemsPageSize } from './useItemsPageSize';

type BrowserMode = 'items' | 'list';

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
