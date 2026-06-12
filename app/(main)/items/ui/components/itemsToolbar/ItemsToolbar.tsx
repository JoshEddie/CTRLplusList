'use client';

import { Chip } from '@/app/ui/components/chip';
import { PopoverTrigger } from '@/app/ui/components/popover-trigger';
import {
  SegmentedControl,
  SegmentedOption,
} from '@/app/ui/components/segmented-control';
import { useKeyboardOffset } from '@/app/ui/hooks/useKeyboardOffset';
import { SortKey } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MdGridView, MdTune, MdViewList } from 'react-icons/md';
import { FiltersSheet } from './FiltersSheet';
import { SearchInputControl } from './SearchInputControl';
import { BrowserMode, FilterState, ParamPatch } from './types';
import {
  buildChips,
  buildQueryUrl,
  countActiveFilters,
  patchedParams,
  sortOptionsFor,
  toggledStoreParams,
} from './utils';

interface ItemsToolbarProps {
  mode: BrowserMode;
  storeOptions: string[];
  showStoreSort: boolean;
  showPriceSort: boolean;
  showPriceFilter: boolean;
  showGridToggle?: boolean;
}

export default function ItemsToolbar({
  mode,
  storeOptions,
  showStoreSort,
  showPriceSort,
  showPriceFilter,
  showGridToggle = true,
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

  const [filtersOpen, setFiltersOpen] = useState(false);

  useKeyboardOffset(filtersOpen);

  const updateParams = useCallback(
    (patch: ParamPatch) => {
      router.replace(
        buildQueryUrl(pathname, patchedParams(searchParams, patch))
      );
    },
    [searchParams, router, pathname]
  );

  const commitSearch = useCallback(
    (next: string) => updateParams({ q: next || null, page: null }),
    [updateParams]
  );

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filtersOpen]);

  const toggleStore = useCallback(
    (name: string) => {
      router.replace(
        buildQueryUrl(pathname, toggledStoreParams(searchParams, name))
      );
    },
    [searchParams, router, pathname]
  );

  const clearStores = () => updateParams({ store: null, page: null });

  const applyPrice = (min: string, max: string) =>
    updateParams({ price_min: min || null, price_max: max || null, page: null });

  const clearPrice = () =>
    updateParams({ price_min: null, price_max: null, page: null });

  const sortOptions = useMemo(
    () => sortOptionsFor(mode, showStoreSort, showPriceSort),
    [mode, showStoreSort, showPriceSort]
  );

  const filterState: FilterState = {
    mode,
    sort,
    defaultSort,
    purchases,
    show,
    selectedStores,
    priceMin,
    priceMax,
  };

  const chips = buildChips(filterState, {
    updateParams,
    removeStore: toggleStore,
    clearPrice,
  });

  const filterCount = countActiveFilters(filterState);

  return (
    <div
      className={`items-toolbar ${!showGridToggle ? 'hide-grid-toggle' : ''}`}
    >
      <div className="items-toolbar-row">
        <div className="items-search items-toolbar-cell--search">
          <SearchInputControl key={q} initialQ={q} onCommit={commitSearch} />
        </div>

        <PopoverTrigger
          className="items-toolbar-cell--filters"
          icon={<MdTune />}
          label="Filters"
          count={filterCount || undefined}
          active={filterCount > 0}
          onClick={() => setFiltersOpen(true)}
          aria-label="Open filters"
          aria-expanded={filtersOpen}
          aria-haspopup="dialog"
        />

        <FiltersSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          mode={mode}
          sort={sort}
          defaultSort={defaultSort}
          sortOptions={sortOptions}
          purchases={purchases}
          show={show}
          storeOptions={storeOptions}
          selectedStores={selectedStores}
          showPriceFilter={showPriceFilter}
          priceMin={priceMin}
          priceMax={priceMax}
          updateParams={updateParams}
          toggleStore={toggleStore}
          clearStores={clearStores}
          applyPrice={applyPrice}
          clearPrice={clearPrice}
        />

        {filtersOpen && (
          <div
            className="items-toolbar-filters-scrim"
            onClick={() => setFiltersOpen(false)}
            role="presentation"
          />
        )}

        {showGridToggle && (
          <div className="items-toolbar-cell--view">
            <SegmentedControl
              value={view}
              onChange={(v) => updateParams({ view: v === 'grid' ? null : v })}
              tone="light"
              aria-label="View toggle"
            >
              <SegmentedOption
                value="grid"
                aria-label="Grid view"
                title="Grid view"
              >
                <MdGridView />
              </SegmentedOption>
              <SegmentedOption
                value="list"
                aria-label="List view"
                title="List view"
              >
                <MdViewList />
              </SegmentedOption>
            </SegmentedControl>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div
          className="items-toolbar-chips"
          role="region"
          aria-label="Active filters"
        >
          {chips.map((c) => (
            <Chip
              key={c.key}
              onRemove={c.onClear}
              removeLabel={`Remove filter: ${c.label}`}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
