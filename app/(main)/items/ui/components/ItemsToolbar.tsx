'use client';

import { SortKey } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  MdClose,
  MdGridView,
  MdSearch,
  MdTune,
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

const SORT_LABELS: Record<SortKey, string> = {
  list_order: 'List order',
  created_desc: 'Newest',
  created_asc: 'Oldest',
  name_asc: 'Name A–Z',
  name_desc: 'Name Z–A',
  store_asc: 'Store A–Z',
  store_desc: 'Store Z–A',
  price_asc: 'Price Low',
  price_desc: 'Price High',
};

const SHARED_SORT_KEYS: SortKey[] = [
  'name_asc',
  'name_desc',
  'store_asc',
  'store_desc',
  'price_asc',
  'price_desc',
];

const SORT_KEYS_BY_MODE: Record<BrowserMode, SortKey[]> = {
  items: ['created_desc', 'created_asc', ...SHARED_SORT_KEYS],
  list: ['list_order', ...SHARED_SORT_KEYS],
  choose: ['created_desc', 'created_asc', ...SHARED_SORT_KEYS],
};

const PURCHASES_LABELS_ITEMS: Record<string, string> = {
  reveal: 'Purchases: Reveal',
  only: 'Only purchased',
  none: 'Only not purchased',
};

const PURCHASES_LABELS_LIST: Record<string, string> = {
  only: 'Only purchased',
  none: 'Only not purchased',
};

const SHOW_LABELS: Record<string, string> = {
  on: 'On the list',
  off: 'Not on the list',
};

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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filtersOpen]);

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

  const removeStore = (name: string) => {
    toggleStore(name);
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
    return SORT_KEYS_BY_MODE[mode]
      .filter((key) => {
        if (!showStoreSort && key.startsWith('store_')) return false;
        if (!showPriceSort && key.startsWith('price_')) return false;
        return true;
      })
      .map((key) => ({ value: key, label: SORT_LABELS[key] }));
  }, [mode, showStoreSort, showPriceSort]);

  // Active filter chips (mobile mostly, but render on all viewports beneath toolbar).
  const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (sort !== defaultSort) {
    chips.push({
      key: 'sort',
      label: SORT_LABELS[sort],
      onClear: () => updateParams({ sort: null, page: null }),
    });
  }
  if (mode !== 'choose' && purchases !== 'hide') {
    const labelMap =
      mode === 'items' ? PURCHASES_LABELS_ITEMS : PURCHASES_LABELS_LIST;
    const label = labelMap[purchases];
    if (label) {
      chips.push({
        key: 'purchases',
        label,
        onClear: () => updateParams({ purchases: null, page: null }),
      });
    }
  }
  if (mode === 'choose' && show !== 'all') {
    const label = SHOW_LABELS[show];
    if (label) {
      chips.push({
        key: 'show',
        label,
        onClear: () => updateParams({ show: null, page: null }),
      });
    }
  }
  for (const s of selectedStores) {
    chips.push({
      key: `store:${s}`,
      label: s,
      onClear: () => removeStore(s),
    });
  }
  if (priceMin || priceMax) {
    const label = priceMin && priceMax
      ? `$${priceMin}–$${priceMax}`
      : priceMin
        ? `$${priceMin}+`
        : `Up to $${priceMax}`;
    chips.push({ key: 'price', label, onClear: clearPrice });
  }

  // Count of active non-default filters for the mobile Filters button badge.
  const filterCount =
    (sort !== defaultSort ? 1 : 0) +
    (mode !== 'choose' && purchases !== 'hide' ? 1 : 0) +
    (mode === 'choose' && show !== 'all' ? 1 : 0) +
    selectedStores.length +
    (priceMin || priceMax ? 1 : 0);

  return (
    <div className="items-toolbar">
      <div className="items-toolbar-row">
        <div className="items-search items-toolbar-cell--search">
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

        <button
          type="button"
          className={`items-toolbar-filters-trigger items-toolbar-cell--filters ${filterCount > 0 ? 'active' : ''}`}
          onClick={() => setFiltersOpen(true)}
          aria-label="Open filters"
          aria-expanded={filtersOpen}
        >
          <MdTune />
          <span>Filters</span>
          {filterCount > 0 && (
            <span className="items-toolbar-filters-badge">{filterCount}</span>
          )}
        </button>

        <div
          className={`items-toolbar-filters-group ${filtersOpen ? 'is-open' : ''}`}
          role={filtersOpen ? 'dialog' : undefined}
          aria-label={filtersOpen ? 'Filters' : undefined}
        >
          <div className="items-toolbar-filters-sheet-header">
            <span className="items-toolbar-filters-sheet-title">Filters</span>
            <button
              type="button"
              className="items-toolbar-filters-sheet-close"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              <MdClose />
            </button>
          </div>

          <label className="items-sort items-toolbar-cell--sort">
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
            <label className="items-sort items-toolbar-cell--purchases">
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
                    <option value="only">Only purchased</option>
                    <option value="none">Only not purchased</option>
                  </>
                ) : (
                  <>
                    <option value="hide">Purchases: All</option>
                    <option value="only">Only purchased</option>
                    <option value="none">Only not purchased</option>
                  </>
                )}
              </select>
            </label>
          )}

          {mode === 'choose' && (
            <label className="items-sort items-toolbar-cell--purchases">
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
            <div className="items-toolbar-cell--stores">
              <StoreFilterPopover
                storeOptions={storeOptions}
                selectedStores={selectedStores}
                onToggle={toggleStore}
                onClear={clearStores}
              />
            </div>
          )}

          {showPriceFilter && (
            <div className="items-toolbar-cell--price">
              <PriceFilterPopover
                min={priceMin}
                max={priceMax}
                onApply={applyPrice}
                onClear={clearPrice}
              />
            </div>
          )}

          <button
            type="button"
            className="items-toolbar-filters-sheet-done"
            onClick={() => setFiltersOpen(false)}
          >
            Done
          </button>
        </div>

        {filtersOpen && (
          <button
            type="button"
            className="items-toolbar-filters-scrim"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close filters"
            tabIndex={-1}
          />
        )}

        <div className="view-toggle items-toolbar-cell--view" role="group" aria-label="View toggle">
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

      {chips.length > 0 && (
        <div className="items-toolbar-chips" role="region" aria-label="Active filters">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              className="items-toolbar-chip"
              onClick={c.onClear}
              aria-label={`Remove filter: ${c.label}`}
            >
              <span>{c.label}</span>
              <MdClose aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
