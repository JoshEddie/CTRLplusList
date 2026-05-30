'use client';

import { Button } from '@/app/ui/components/button';
import { PriceField } from '@/app/ui/components/field';
import { PopoverTrigger } from '@/app/ui/components/popover-trigger';
import { usePopoverDismiss } from '@/app/ui/hooks/usePopoverDismiss';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { MdAttachMoney } from 'react-icons/md';

interface PriceFilterPopoverProps {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
  onClear: () => void;
}

const DEBOUNCE_MS = 400;

const toNumber = (s: string): number | null => {
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const toString = (n: number): string => (n === 0 ? '' : n.toFixed(2));

// True only when both bounds are non-empty AND max < min (strict). Equal
// values are valid (e.g. $20–$20 = "exactly $20").
const isInvertedPair = (min: string, max: string): boolean => {
  if (!min || !max) return false;
  const lo = parseFloat(min);
  const hi = parseFloat(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false;
  return hi < lo;
};

// Inner panel owns local edit state. Parent keys it on `${min}|${max}` so an
// external URL change while the popover is open remounts the panel with the
// new values rather than stomping in-progress typing via a sync effect.
function PriceFilterPanel({
  initialMin,
  initialMax,
  valuesRef,
  onApply,
  onClear,
  onClose,
}: {
  initialMin: string;
  initialMax: string;
  valuesRef: RefObject<{ min: string; max: string }>;
  onApply: (min: string, max: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [localMin, setLocalMin] = useState(initialMin);
  const [localMax, setLocalMax] = useState(initialMax);
  // Which input the user most recently edited — drives which field gets the
  // <FieldError> when the pair is inverted. Defaults to 'max' for the
  // (impossible per "never commit invalid") case where props arrive inverted.
  const [lastEdited, setLastEdited] = useState<'min' | 'max'>('max');
  // Whether the inline error is currently surfaced. Asymmetric per design
  // Decision 2: appears only when the debounce timer fires on an inverted
  // pair (so transient mid-typing inversions don't flash an error); clears
  // live the moment the pair becomes valid (so the user isn't stuck waiting
  // another 400ms after they fix it).
  const [errorShown, setErrorShown] = useState(false);

  useEffect(() => {
    valuesRef.current = { min: localMin, max: localMax };
  }, [localMin, localMax, valuesRef]);

  const inverted = isInvertedPair(localMin, localMax);

  // Live-clear: the moment the pair becomes valid, drop the error so the
  // user sees instant feedback. Also resets the gate so the next inversion
  // requires its own debounce fire before re-surfacing. Derived during
  // render (React 19 pattern) to avoid an effect-and-cascading-render cycle.
  if (!inverted && errorShown) setErrorShown(false);

  // Trailing-edge debounce: once the user has stopped typing for
  // DEBOUNCE_MS, either commit (valid) or surface the error (invalid).
  // Skip when local matches the mount-time props (no diff to commit — also
  // avoids a phantom commit on remount-after-commit, since the panel is
  // keyed on `${min}|${max}`).
  useEffect(() => {
    if (localMin === initialMin && localMax === initialMax) return;
    const handle = setTimeout(() => {
      if (isInvertedPair(localMin, localMax)) {
        setErrorShown(true);
      } else {
        onApply(localMin, localMax);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [localMin, localMax, initialMin, initialMax, onApply]);

  const showError = errorShown && inverted;
  const minError =
    showError && lastEdited === 'min' ? 'Min must be at most Max' : undefined;
  const maxError =
    showError && lastEdited === 'max' ? 'Max must be at least Min' : undefined;

  const activeCount = (initialMin ? 1 : 0) + (initialMax ? 1 : 0);

  const handleClear = () => {
    setLocalMin('');
    setLocalMax('');
    onClear();
  };

  return (
    <div
      className="store-filter-panel price-filter-panel"
      role="dialog"
      aria-label="Filter by price"
    >
      <div className="price-filter-inputs">
        <PriceField
          label="Min"
          amount={toNumber(localMin)}
          onChange={(v) => {
            setLastEdited('min');
            setLocalMin(toString(v));
          }}
          error={minError}
          autoFocus
        />
        <PriceField
          label="Max"
          amount={toNumber(localMax)}
          onChange={(v) => {
            setLastEdited('max');
            setLocalMax(toString(v));
          }}
          error={maxError}
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
        <Button variant="primary" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

export default function PriceFilterPopover({
  min,
  max,
  onApply,
  onClear,
}: PriceFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<{ min: string; max: string }>({ min, max });

  // Close path used by both the Done button and usePopoverDismiss. Flushes
  // any divergent local state to the URL — but only if valid. Invalid state
  // is discarded silently; the URL still reflects the last valid commit
  // (which the panel will re-source from props on next open via the
  // `${min}|${max}` key remount).
  const handleClose = useCallback(() => {
    const { min: lMin, max: lMax } = valuesRef.current;
    const diverged = lMin !== min || lMax !== max;
    if (diverged && !isInvertedPair(lMin, lMax)) {
      onApply(lMin, lMax);
    }
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
          initialMin={min}
          initialMax={max}
          valuesRef={valuesRef}
          onApply={onApply}
          onClear={onClear}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
