'use client';

import { Button } from '@/app/ui/components/button';
import { PriceField } from '@/app/ui/components/field';
import { PopoverTrigger } from '@/app/ui/components/popover-trigger';
import { usePopoverDismiss } from '@/app/ui/hooks/usePopoverDismiss';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MdAttachMoney } from 'react-icons/md';

interface PriceFilterPopoverProps {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
  onClear: () => void;
}

const toNumber = (s: string): number | null => {
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const toString = (n: number): string => (n === 0 ? '' : n.toFixed(2));

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

  const handleClose = useCallback(() => {
    if (localMin !== min || localMax !== max) {
      onApply(localMin, localMax);
    }
    setOpen(false);
  }, [localMin, localMax, min, max, onApply]);

  usePopoverDismiss({ open, onClose: handleClose, ref: rootRef });

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
      <PopoverTrigger
        icon={<MdAttachMoney />}
        label="Price"
        count={activeCount || undefined}
        active={activeCount > 0}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      />
      {open && (
        <div
          className="store-filter-panel price-filter-panel"
          role="dialog"
          aria-label="Filter by price"
        >
          <div className="price-filter-inputs">
            <PriceField
              label="Min"
              amount={toNumber(localMin)}
              onChange={(v) => setLocalMin(toString(v))}
              autoFocus
            />
            <PriceField
              label="Max"
              amount={toNumber(localMax)}
              onChange={(v) => setLocalMax(toString(v))}
            />
          </div>
          <div className="store-filter-footer">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={activeCount === 0 && !localMin && !localMax}
            >
              Clear
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
