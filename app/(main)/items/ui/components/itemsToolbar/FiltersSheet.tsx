'use client';

import { Button } from '@/app/ui/components/button';
import { SelectField } from '@/app/ui/components/field';
import { PopoverTrigger } from '@/app/ui/components/popover-trigger';
import { SortKey } from '@/lib/types';
import { MouseEvent, useEffect, useRef, useState } from 'react';
import { MdAttachMoney, MdFilterList } from 'react-icons/md';
import {
  PriceFilterPanel,
  PriceValues,
  flushPriceValues,
} from '../PriceFilterPanel';
import PriceFilterPopover from '../PriceFilterPopover';
import { StoreFilterPanel } from '../StoreFilterPanel';
import StoreFilterPopover from '../StoreFilterPopover';
import { BrowserMode, ParamPatch } from './types';

type Facet = 'stores' | 'price';

const FACET_TITLES: Record<Facet, string> = {
  stores: 'Stores',
  price: 'Price',
};

interface FiltersSheetProps {
  open: boolean;
  onClose: () => void;
  mode: BrowserMode;
  sort: SortKey;
  defaultSort: SortKey;
  sortOptions: Array<{ value: SortKey; label: string }>;
  show: string;
  storeOptions: string[];
  selectedStores: string[];
  showPriceFilter: boolean;
  priceMin: string;
  priceMax: string;
  filterCount: number;
  updateParams: (patch: ParamPatch) => void;
  toggleStore: (name: string) => void;
  clearStores: () => void;
  applyPrice: (min: string, max: string) => void;
  clearPrice: () => void;
  clearAll: () => void;
}

export function FiltersSheet({
  open,
  onClose,
  mode,
  sort,
  defaultSort,
  sortOptions,
  show,
  storeOptions,
  selectedStores,
  showPriceFilter,
  priceMin,
  priceMax,
  filterCount,
  updateParams,
  toggleStore,
  clearStores,
  applyPrice,
  clearPrice,
  clearAll,
}: FiltersSheetProps) {
  // Which facet the sheet has drilled into. Only the sheet's own rows set it,
  // and those are display:none above the sheet breakpoint, so the desktop
  // toolbar can never reach a drilled state.
  const [activeFacet, setActiveFacet] = useState<Facet | null>(null);
  // Bumped by Clear all so the price panel remounts with empty inputs even
  // when the URL already carried no price — otherwise a value typed but not
  // yet debounced survives the clear and commits itself 400ms later.
  const [priceGeneration, setPriceGeneration] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const priceValuesRef = useRef<PriceValues>({ min: priceMin, max: priceMax });

  useEffect(() => {
    if (!open) return;
    if (activeFacet) panelRef.current?.focus();
    else returnFocusRef.current?.focus();
  }, [open, activeFacet]);

  // Every exit from the price panel commits the same way closing the desktop
  // popover does. Back and Done call this directly; the unmount cleanup below
  // covers the paths the sheet doesn't own (Escape, scrim, navigation away).
  const flushPrice = () => {
    if (activeFacet !== 'price') return;
    flushPriceValues(
      priceValuesRef.current,
      { min: priceMin, max: priceMax },
      applyPrice
    );
  };

  const flushRef = useRef(flushPrice);
  useEffect(() => {
    flushRef.current = flushPrice;
  });
  useEffect(() => () => flushRef.current(), []);

  const drillIntoStores = (e: MouseEvent<HTMLButtonElement>) => {
    returnFocusRef.current = e.currentTarget;
    setActiveFacet('stores');
  };

  const drillIntoPrice = (e: MouseEvent<HTMLButtonElement>) => {
    returnFocusRef.current = e.currentTarget;
    setActiveFacet('price');
  };

  const handleBack = () => {
    flushPrice();
    setActiveFacet(null);
  };

  const handleClose = () => {
    flushPrice();
    onClose();
  };

  const handleClearAll = () => {
    priceValuesRef.current = { min: '', max: '' };
    setPriceGeneration((g) => g + 1);
    clearAll();
  };

  const sheetTitle = activeFacet ? FACET_TITLES[activeFacet] : 'Filters';

  return (
    <div
      className={`items-toolbar-filters-group ${open ? 'is-open modal-shell' : ''}`}
      data-facet={activeFacet ?? undefined}
      role={open ? 'dialog' : undefined}
      aria-label={open ? sheetTitle : undefined}
    >
      {/* <div className="items-toolbar-filters-sheet-header">
        {activeFacet ? (
          <Button
            variant="ghost"
            onClick={handleBack}
            aria-label="Back to filters"
            className="filterBack"
            size="sm"
          >
            <MdArrowBack aria-hidden />
            Back
          </Button>
        ) : (
          ''
        )}
        <div className="items-toolbar-filters-sheet-title">{sheetTitle}</div>
      </div> */}

      {/* Toolbar selects render as bare SelectField with aria-label only
          (labels are implied by the option text itself). */}
      <div className="items-toolbar-cell--sort">
        <SelectField
          value={sort}
          onChange={(e) =>
            updateParams({
              sort: e.target.value === defaultSort ? null : e.target.value,
              page: null,
            })
          }
          aria-label="Sort items"
          options={sortOptions.map((o) => ({ value: o.value, label: o.label }))}
        />
      </div>

      {mode === 'choose' && (
        <div className="items-toolbar-cell--purchases">
          <SelectField
            value={show}
            onChange={(e) =>
              updateParams({
                show: e.target.value === 'all' ? null : e.target.value,
                page: null,
              })
            }
            aria-label="Show items by list membership"
            options={[
              { value: 'all', label: 'All' },
              { value: 'on', label: 'Only on the list' },
              { value: 'off', label: 'Only not on the list' },
            ]}
          />
        </div>
      )}

      {storeOptions.length > 0 && (
        <div className="items-toolbar-cell--stores">
          <StoreFilterPopover
            storeOptions={storeOptions}
            selectedStores={selectedStores}
            onToggle={toggleStore}
            onClear={clearStores}
          />
          <PopoverTrigger
            className="items-toolbar-filters-drill"
            icon={<MdFilterList />}
            label="Stores"
            count={selectedStores.length || undefined}
            active={selectedStores.length > 0}
            onClick={drillIntoStores}
            aria-label="Filter by store"
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
          <PopoverTrigger
            className="items-toolbar-filters-drill"
            icon={<MdAttachMoney />}
            label="Price"
            count={priceMin || priceMax ? 1 : undefined}
            active={Boolean(priceMin || priceMax)}
            onClick={drillIntoPrice}
            aria-label="Filter by price"
          />
        </div>
      )}

      {activeFacet === 'stores' && (
        <StoreFilterPanel
          ref={panelRef}
          tabIndex={-1}
          className="items-toolbar-filters-active-panel"
          storeOptions={storeOptions}
          selectedStores={selectedStores}
          onToggle={toggleStore}
        />
      )}

      {activeFacet === 'price' && (
        <PriceFilterPanel
          key={`${priceMin}|${priceMax}|${priceGeneration}`}
          ref={panelRef}
          tabIndex={-1}
          className="items-toolbar-filters-active-panel"
          initialMin={priceMin}
          initialMax={priceMax}
          valuesRef={priceValuesRef}
          onApply={applyPrice}
        />
      )}

      <div className="items-toolbar-filters-sheet-actions">
                {activeFacet ? (
          <Button
            variant="ghost"
            onClick={handleBack}
            aria-label="Back to filters"
            // className="filterBack"
            // size="sm"
          >
            {/* <MdArrowBack aria-hidden /> */}
            Back
          </Button>
        ) : (
        <Button
          variant="ghost"
          onClick={handleClearAll}
          disabled={filterCount === 0}
        >
          Clear
        </Button>
        )}
        <Button
          variant="primary"
          className="items-toolbar-filters-sheet-done"
          onClick={handleClose}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
