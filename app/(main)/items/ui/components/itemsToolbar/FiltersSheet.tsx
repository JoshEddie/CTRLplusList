'use client';

import { SelectField } from '@/app/ui/components/field';
import { SortKey } from '@/lib/types';
import { MdClose } from 'react-icons/md';
import PriceFilterPopover from '../PriceFilterPopover';
import StoreFilterPopover from '../StoreFilterPopover';
import { PurchasesSelect } from './PurchasesSelect';
import { BrowserMode, ParamPatch } from './types';

interface FiltersSheetProps {
  open: boolean;
  onClose: () => void;
  mode: BrowserMode;
  sort: SortKey;
  defaultSort: SortKey;
  sortOptions: Array<{ value: SortKey; label: string }>;
  purchases: string;
  show: string;
  storeOptions: string[];
  selectedStores: string[];
  showPriceFilter: boolean;
  priceMin: string;
  priceMax: string;
  updateParams: (patch: ParamPatch) => void;
  toggleStore: (name: string) => void;
  clearStores: () => void;
  applyPrice: (min: string, max: string) => void;
  clearPrice: () => void;
}

export function FiltersSheet({
  open,
  onClose,
  mode,
  sort,
  defaultSort,
  sortOptions,
  purchases,
  show,
  storeOptions,
  selectedStores,
  showPriceFilter,
  priceMin,
  priceMax,
  updateParams,
  toggleStore,
  clearStores,
  applyPrice,
  clearPrice,
}: FiltersSheetProps) {
  return (
    <div
      className={`items-toolbar-filters-group ${open ? 'is-open' : ''}`}
      role={open ? 'dialog' : undefined}
      aria-label={open ? 'Filters' : undefined}
    >
      <div className="items-toolbar-filters-sheet-header">
        <span className="items-toolbar-filters-sheet-title">Filters</span>
        <button
          type="button"
          className="items-toolbar-filters-sheet-close"
          onClick={onClose}
          aria-label="Close filters"
        >
          <MdClose />
        </button>
      </div>

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

      {mode !== 'choose' && (
        <PurchasesSelect
          mode={mode}
          purchases={purchases}
          onChange={(value) =>
            updateParams({
              purchases: value === 'hide' ? null : value,
              page: null,
            })
          }
        />
      )}

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
        onClick={onClose}
      >
        Done
      </button>
    </div>
  );
}
