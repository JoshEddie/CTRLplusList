'use client';

import { Button } from '@/app/ui/components/button';
import { CheckboxField, SearchField } from '@/app/ui/components/field';
import { PopoverTrigger } from '@/app/ui/components/popover-trigger';
import { usePopoverDismiss } from '@/app/ui/hooks/usePopoverDismiss';
import { useMemo, useRef, useState } from 'react';
import { MdFilterList } from 'react-icons/md';

interface StoreFilterPopoverProps {
  storeOptions: string[];
  selectedStores: string[];
  onToggle: (name: string) => void;
  onClear: () => void;
}

export default function StoreFilterPopover({
  storeOptions,
  selectedStores,
  onToggle,
  onClear,
}: StoreFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  usePopoverDismiss({
    open,
    onClose: () => setOpen(false),
    ref: rootRef,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return storeOptions;
    return storeOptions.filter((name) => name.toLowerCase().includes(q));
  }, [query, storeOptions]);

  const count = selectedStores.length;

  return (
    <div className="store-filter-popover" ref={rootRef}>
      <PopoverTrigger
        icon={<MdFilterList />}
        label="Stores"
        count={count || undefined}
        active={count > 0}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      />
      {open && (
        <div
          className="store-filter-panel"
          role="dialog"
          aria-label="Filter by store"
        >
          <SearchField
            placeholder="Search stores..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            autoFocus
            aria-label="Search stores"
          />
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
          <div className="store-filter-footer">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={count === 0}
            >
              Clear
            </Button>
            <Button variant="primary" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
