'use client';

import { SortKey } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  MdClose,
  MdGridView,
  MdSearch,
  MdViewList,
} from 'react-icons/md';
import PriceFilterPopover from './PriceFilterPopover';
import StoreFilterPopover from './StoreFilterPopover';

type BrowserMode = 'items' | 'list' | 'choose';

interface ItemsToolbarProps {
  mode: BrowserMode;
  storeOptions: string[];
  showStoreSort: boolean;
  showPriceSort: boolean;
  showPriceFilter: boolean;
}

const SORT_OPTIONS_ITEMS: { value: SortKey; label: string }[] = [
  { value: 'created_desc', label: 'Newest' },
  { value: 'created_asc', label: 'Oldest' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'store_asc', label: 'Store A–Z' },
  { value: 'store_desc', label: 'Store Z–A' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
];

const SORT_OPTIONS_LIST: { value: SortKey; label: string }[] = [
  { value: 'list_order', label: 'List order' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'store_asc', label: 'Store A–Z' },
  { value: 'store_desc', label: 'Store Z–A' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
];

const SORT_OPTIONS_CHOOSE: { value: SortKey; label: string }[] = [
  { value: 'created_desc', label: 'Newest' },
  { value: 'created_asc', label: 'Oldest' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'store_asc', label: 'Store A–Z' },
  { value: 'store_desc', label: 'Store Z–A' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
];

export default function ItemsToolbar({
  mode,
  storeOptions,
  showStoreSort,
  showPriceSort,
  showPriceFilter,
}: ItemsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultSort: SortKey = mode === 'list' ? 'list_order' : 'created_desc';
  const q = searchParams?.get('q') ?? '';
  const sort = (searchParams?.get('sort') as SortKey | null) ?? defaultSort;
  const selectedStores = searchParams?.getAll('store') ?? [];
  const purchases = searchParams?.get('purchases') ?? 'hide';
  const show = searchParams?.get('show') ?? 'all';
  const priceMin = searchParams?.get('price_min') ?? '';
  const priceMax = searchParams?.get('price_max') ?? '';
  const view = searchParams?.get('view') === 'list' ? 'list' : 'grid';

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    if (searchInput === q) return;
    const handle = setTimeout(() => {
      updateParams({ q: searchInput || null, page: null });
    }, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const updateParams = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const toggleStore = (name: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    const current = params.getAll('store');
    params.delete('store');
    const next = current.includes(name)
      ? current.filter((s) => s !== name)
      : [...current, name];
    for (const s of next) params.append('store', s);
    params.delete('page');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const clearStores = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('store');
    params.delete('page');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const applyPrice = (min: string, max: string) => {
    updateParams({
      price_min: min || null,
      price_max: max || null,
      page: null,
    });
  };

  const clearPrice = () => {
    updateParams({ price_min: null, price_max: null, page: null });
  };

  const sortOptions = useMemo(() => {
    const base =
      mode === 'list'
        ? SORT_OPTIONS_LIST
        : mode === 'choose'
          ? SORT_OPTIONS_CHOOSE
          : SORT_OPTIONS_ITEMS;
    return base.filter((o) => {
      if (!showStoreSort && o.value.startsWith('store_')) return false;
      if (!showPriceSort && o.value.startsWith('price_')) return false;
      return true;
    });
  }, [mode, showStoreSort, showPriceSort]);

  return (
    <div className="items-toolbar">
      <div className="items-toolbar-row">
        <div className="items-search">
          <MdSearch className="items-search-icon" />
          <input
            type="search"
            className="items-search-input"
            placeholder="Search items..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search items"
          />
          {searchInput && (
            <button
              type="button"
              className="items-search-clear"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              <MdClose />
            </button>
          )}
        </div>

        <label className="items-sort">
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={(e) =>
              updateParams({
                sort: e.target.value === defaultSort ? null : e.target.value,
                page: null,
              })
            }
            aria-label="Sort items"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {mode !== 'choose' && (
          <label className="items-sort">
            <span className="sr-only">Purchases</span>
            <select
              value={purchases}
              onChange={(e) =>
                updateParams({
                  purchases: e.target.value === 'hide' ? null : e.target.value,
                  page: null,
                })
              }
              aria-label="Purchases filter"
            >
              {mode === 'items' ? (
                <>
                  <option value="hide">Purchases: Hide</option>
                  <option value="reveal">Purchases: Reveal</option>
                  <option value="only">Purchases: Only purchased</option>
                  <option value="none">Purchases: Only not purchased</option>
                </>
              ) : (
                <>
                  <option value="hide">Purchases: All</option>
                  <option value="only">Purchases: Only purchased</option>
                  <option value="none">Purchases: Only not purchased</option>
                </>
              )}
            </select>
          </label>
        )}

        {mode === 'choose' && (
          <label className="items-sort">
            <span className="sr-only">Show</span>
            <select
              value={show}
              onChange={(e) =>
                updateParams({
                  show: e.target.value === 'all' ? null : e.target.value,
                  page: null,
                })
              }
              aria-label="Show items by list membership"
            >
              <option value="all">Show: All</option>
              <option value="on">Show: Only on the list</option>
              <option value="off">Show: Only not on the list</option>
            </select>
          </label>
        )}

        {storeOptions.length > 0 && (
          <StoreFilterPopover
            storeOptions={storeOptions}
            selectedStores={selectedStores}
            onToggle={toggleStore}
            onClear={clearStores}
          />
        )}

        {showPriceFilter && (
          <PriceFilterPopover
            min={priceMin}
            max={priceMax}
            onApply={applyPrice}
            onClear={clearPrice}
          />
        )}

        <div className="view-toggle" role="group" aria-label="View toggle">
          <button
            type="button"
            className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
            onClick={() =>
              updateParams({ view: view === 'grid' ? null : 'grid' })
            }
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            title="Grid view"
          >
            <MdGridView />
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => updateParams({ view: 'list' })}
            aria-label="List view"
            aria-pressed={view === 'list'}
            title="List view"
          >
            <MdViewList />
          </button>
        </div>
      </div>
    </div>
  );
}
