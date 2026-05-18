'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return storeOptions;
    return storeOptions.filter((name) => name.toLowerCase().includes(q));
  }, [query, storeOptions]);

  const count = selectedStores.length;

  return (
    <div className="store-filter-popover" ref={rootRef}>
      <button
        type="button"
        className={`store-filter-trigger ${count > 0 ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MdFilterList />
        <span>Stores</span>
        {count > 0 && <span className="store-filter-badge">{count}</span>}
      </button>
      {open && (
        <div className="store-filter-panel" role="dialog" aria-label="Filter by store">
          <input
            type="search"
            className="store-filter-search"
            placeholder="Search stores..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <ul className="store-filter-list">
            {filtered.length === 0 && (
              <li className="store-filter-empty">No matching stores</li>
            )}
            {filtered.map((name) => {
              const checked = selectedStores.includes(name);
              return (
                <li key={name}>
                  <label className="store-filter-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(name)}
                    />
                    <span>{name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="store-filter-footer">
            <button
              type="button"
              className="store-filter-clear"
              onClick={onClear}
              disabled={count === 0}
            >
              Clear
            </button>
            <button
              type="button"
              className="store-filter-done"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
