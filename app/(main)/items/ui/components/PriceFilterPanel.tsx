'use client';

import { Button } from '@/app/ui/components/button';
import { PriceField } from '@/app/ui/components/field';
import {
  HTMLAttributes,
  RefObject,
  forwardRef,
  useEffect,
  useState,
} from 'react';

const DEBOUNCE_MS = 400;

export type PriceValues = { min: string; max: string };

const toNumber = (s: string): number | null => {
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const toString = (n: number): string => (n === 0 ? '' : n.toFixed(2));

// True only when both bounds are non-empty AND max < min (strict). Equal
// values are valid (e.g. $20–$20 = "exactly $20").
export const isInvertedPair = (min: string, max: string): boolean => {
  if (!min || !max) return false;
  const lo = parseFloat(min);
  const hi = parseFloat(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false;
  return hi < lo;
};

// Commit any edit the debounce has not fired yet — but only if valid. Invalid
// state is discarded silently; the URL still reflects the last valid commit
// (which the panel re-sources from props on next open via its key remount).
// Every path that leaves the panel runs this: the popover's Done and outside
// dismiss, and the sheet's back and Done.
export function flushPriceValues(
  values: PriceValues,
  committed: PriceValues,
  onApply: (min: string, max: string) => void
): void {
  const diverged = values.min !== committed.min || values.max !== committed.max;
  if (diverged && !isInvertedPair(values.min, values.max)) {
    onApply(values.min, values.max);
  }
}

type PriceFilterPanelProps = HTMLAttributes<HTMLDivElement> & {
  initialMin: string;
  initialMax: string;
  valuesRef: RefObject<PriceValues>;
  onApply: (min: string, max: string) => void;
  autoFocusMin?: boolean;
  onClear?: () => void;
  onClose?: () => void;
};

// Owns local edit state. Callers key it on `${min}|${max}` so an external URL
// change while it is open remounts it with the new values rather than
// stomping in-progress typing via a sync effect. Rendered floating by
// PriceFilterPopover and in-place by the mobile filters sheet, which supplies
// neither onClear nor onClose: its Clear and Done live in the sheet's own
// action bar.
export const PriceFilterPanel = forwardRef<
  HTMLDivElement,
  PriceFilterPanelProps
>(function PriceFilterPanel(
  {
    initialMin,
    initialMax,
    valuesRef,
    onApply,
    autoFocusMin = false,
    onClear,
    onClose,
    className,
    ...rest
  },
  ref
) {
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
    onClear?.();
  };

  return (
    <div
      ref={ref}
      className={['store-filter-panel price-filter-panel', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
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
          autoFocus={autoFocusMin}
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
      {onClose && (
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
      )}
    </div>
  );
});
