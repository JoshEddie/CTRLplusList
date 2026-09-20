'use client';

import { PopoverTrigger } from '@/app/ui/components/popover-trigger';
import { usePopoverDismiss } from '@/app/ui/hooks/usePopoverDismiss';
import { useCallback, useRef, useState } from 'react';
import { MdAttachMoney } from 'react-icons/md';
import {
  PriceFilterPanel,
  PriceValues,
  flushPriceValues,
} from './PriceFilterPanel';

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
  const rootRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<PriceValues>({ min, max });

  // Close path used by both the Done button and usePopoverDismiss.
  const handleClose = useCallback(() => {
    flushPriceValues(valuesRef.current, { min, max }, onApply);
    setOpen(false);
  }, [min, max, onApply]);

  usePopoverDismiss({ open, onClose: handleClose, ref: rootRef });

  const activeCount = (min ? 1 : 0) + (max ? 1 : 0);

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
        <PriceFilterPanel
          key={`${min}|${max}`}
          role="dialog"
          aria-label="Filter by price"
          initialMin={min}
          initialMax={max}
          valuesRef={valuesRef}
          onApply={onApply}
          autoFocusMin
          onClear={onClear}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
