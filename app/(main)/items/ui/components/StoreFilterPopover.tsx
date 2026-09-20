'use client';

import { PopoverTrigger } from '@/app/ui/components/popover-trigger';
import { usePopoverDismiss } from '@/app/ui/hooks/usePopoverDismiss';
import { useRef, useState } from 'react';
import { MdFilterList } from 'react-icons/md';
import { StoreFilterPanel } from './StoreFilterPanel';

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
  const rootRef = useRef<HTMLDivElement>(null);

  usePopoverDismiss({
    open,
    onClose: () => setOpen(false),
    ref: rootRef,
  });

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
        <StoreFilterPanel
          role="dialog"
          aria-label="Filter by store"
          storeOptions={storeOptions}
          selectedStores={selectedStores}
          onToggle={onToggle}
          autoFocusSearch
          onClear={onClear}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
