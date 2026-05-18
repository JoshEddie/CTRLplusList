'use client';

import { useEffect, useRef, useState } from 'react';
import { MdAttachMoney } from 'react-icons/md';

interface PriceFilterPopoverProps {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
  onClear: () => void;
}

export default function PriceFilterPopover({
  min,
  max,
  onApply,
  onClear,
}: PriceFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalMin(min);
    setLocalMax(max);
  }, [min, max]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        if (localMin !== min || localMax !== max) {
          onApply(localMin, localMax);
        }
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocalMin(min);
        setLocalMax(max);
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, localMin, localMax, min, max, onApply]);

  const activeCount = (min ? 1 : 0) + (max ? 1 : 0);

  const handleApply = () => {
    onApply(localMin, localMax);
    setOpen(false);
  };

  const handleClear = () => {
    setLocalMin('');
    setLocalMax('');
    onClear();
  };

  return (
    <div className="store-filter-popover" ref={rootRef}>
      <button
        type="button"
        className={`store-filter-trigger ${activeCount > 0 ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MdAttachMoney />
        <span>Price</span>
        {activeCount > 0 && (
          <span className="store-filter-badge">{activeCount}</span>
        )}
      </button>
      {open && (
        <div
          className="store-filter-panel price-filter-panel"
          role="dialog"
          aria-label="Filter by price"
        >
          <div className="price-filter-inputs">
            <label className="price-filter-field">
              <span>Min</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
                autoFocus
              />
            </label>
            <label className="price-filter-field">
              <span>Max</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="No max"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
              />
            </label>
          </div>
          <div className="store-filter-footer">
            <button
              type="button"
              className="store-filter-clear"
              onClick={handleClear}
              disabled={activeCount === 0 && !localMin && !localMax}
            >
              Clear
            </button>
            <button
              type="button"
              className="store-filter-done"
              onClick={handleApply}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
