'use client';

import { Button } from '@/app/ui/components/button';
import { CheckboxField, SearchField } from '@/app/ui/components/field';
import { HTMLAttributes, forwardRef, useMemo, useState } from 'react';

// `onToggle` shadows the DOM popover-toggle handler on HTMLAttributes, so it
// is omitted rather than renamed — the store-selection meaning is the one
// every caller uses.
// Below this many options the whole list fits without scrolling on the
// surfaces that render it, so a search field would only cost a row and a
// keyboard.
const SEARCH_MIN_OPTIONS = 8;

type StoreFilterPanelProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onToggle'
> & {
  storeOptions: string[];
  selectedStores: string[];
  onToggle: (name: string) => void;
  autoFocusSearch?: boolean;
  onClear?: () => void;
  onClose?: () => void;
};

// The store options themselves. Rendered floating by StoreFilterPopover and
// in-place by the mobile filters sheet, which supplies neither onClear nor
// onClose: its Clear and Done live in the sheet's own action bar.
export const StoreFilterPanel = forwardRef<
  HTMLDivElement,
  StoreFilterPanelProps
>(function StoreFilterPanel(
  {
    storeOptions,
    selectedStores,
    onToggle,
    autoFocusSearch = false,
    onClear,
    onClose,
    className,
    ...rest
  },
  ref
) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return storeOptions;
    return storeOptions.filter((name) => name.toLowerCase().includes(q));
  }, [query, storeOptions]);

  const count = selectedStores.length;

  return (
    <div
      ref={ref}
      className={['store-filter-panel', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {storeOptions.length >= SEARCH_MIN_OPTIONS && (
        <SearchField
          placeholder="Search stores..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          autoFocus={autoFocusSearch}
          aria-label="Search stores"
        />
      )}
      <ul className="store-filter-list">
        {filtered.length === 0 && (
          <li className="store-filter-empty">No matching stores</li>
        )}
        {filtered.map((name) => {
          const checked = selectedStores.includes(name);
          return (
            <li key={name}>
              <CheckboxField
                label={name}
                checked={checked}
                onChange={() => onToggle(name)}
              />
            </li>
          );
        })}
      </ul>
      {onClose && (
        <div className="store-filter-footer">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={count === 0}
          >
            Clear
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
});
