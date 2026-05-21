'use client';

import { Button } from '@/app/ui/components/button';
import { ItemDisplay, SortKey } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import Items from './Items';
import ItemsToolbar from './ItemsToolbar';
import Pagination from './Pagination';
import { compareItems, displayPrice } from './itemFilters';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from './paginationConstants';

type BrowserMode = 'items' | 'list';

interface ItemsBrowserProps {
  items: ItemDisplay[];
  mode: BrowserMode;
  initialPageSize?: number;
  user_id?: string;
  user_name?: string | null;
  showArchiveAction?: boolean;
  archivedView?: boolean;
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

function normalizePageSize(value: number | undefined): number {
  if (!value || !PAGE_SIZE_OPTIONS.includes(value as 12 | 24 | 48 | 96)) {
    return DEFAULT_PAGE_SIZE;
  }
  return value;
}

export default function ItemsBrowser({
  items,
  mode,
  initialPageSize,
  user_id,
  user_name,
  showArchiveAction,
  archivedView,
}: ItemsBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultSort: SortKey = mode === 'list' ? 'list_order' : 'created_desc';
  const validSorts = mode === 'list' ? VALID_SORT_LIST : VALID_SORT_ITEMS;

  const q = (searchParams?.get('q') ?? '').toLowerCase().trim();
  const rawSort = searchParams?.get('sort') as SortKey | null;
  const sort: SortKey =
    rawSort && validSorts.includes(rawSort) ? rawSort : defaultSort;
  const selectedStores = searchParams?.getAll('store') ?? [];
  const purchasesParam = searchParams?.get('purchases') ?? 'hide';
  const priceMin = parseFloat(searchParams?.get('price_min') ?? '');
  const priceMax = parseFloat(searchParams?.get('price_max') ?? '');
  const hasPriceFilter = Number.isFinite(priceMin) || Number.isFinite(priceMax);
  const rawPage = parseInt(searchParams?.get('page') ?? '1', 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const view: 'grid' | 'list' =
    searchParams?.get('view') === 'list' ? 'list' : 'grid';

  const [pageSize, setPageSize] = useState<number>(
    normalizePageSize(initialPageSize)
  );

  const handlePageSizeChange = (next: number) => {
    const normalized = normalizePageSize(next);
    setPageSize(normalized);
    document.cookie = `items_page_size=${normalized}; path=/; max-age=31536000; SameSite=Lax`;
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('page');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const storeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      for (const store of item.stores ?? []) {
        if (store.name) names.add(store.name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const hasAnyStore = storeOptions.length > 0;
  const hasAnyPrice = useMemo(
    () => items.some((item) => Number.isFinite(displayPrice(item))),
    [items]
  );

  const filteredSorted = useMemo(() => {
    let result = items;
    if (q) {
      result = result.filter((item) =>
        `${item.name ?? ''} ${item.description ?? ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    if (selectedStores.length > 0) {
      const selectedSet = new Set(selectedStores);
      result = result.filter((item) =>
        item.stores?.some((s) => selectedSet.has(s.name))
      );
    }
    if (purchasesParam === 'only') {
      result = result.filter((item) => item.hasPurchases);
    } else if (purchasesParam === 'none') {
      result = result.filter((item) => !item.hasPurchases);
    }
    if (hasPriceFilter) {
      const lo = Number.isFinite(priceMin) ? priceMin : -Infinity;
      const hi = Number.isFinite(priceMax) ? priceMax : Infinity;
      result = result.filter((item) => {
        const p = displayPrice(item);
        return Number.isFinite(p) && p >= lo && p <= hi;
      });
    }
    if (sort === 'list_order') return result;
    return [...result].sort((a, b) => compareItems(a, b, sort));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    q,
    selectedStores.join('|'),
    purchasesParam,
    hasPriceFilter,
    priceMin,
    priceMax,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const visible = filteredSorted.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('q');
    params.delete('store');
    params.delete('purchases');
    params.delete('price_min');
    params.delete('price_max');
    params.delete('page');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="items-browser">
      <ItemsToolbar
        mode={mode}
        storeOptions={storeOptions}
        showStoreSort={hasAnyStore}
        showPriceSort={hasAnyPrice}
        showPriceFilter={hasAnyPrice}
      />
      {filteredSorted.length === 0 ? (
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
            user_id={user_id}
            user_name={user_name}
            view={view}
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
