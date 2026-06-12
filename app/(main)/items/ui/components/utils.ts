import { ItemStoreTable, PurchaseView } from '@/lib/types';
import { useCallback, useRef, useState } from 'react';

export function claimLabel(claim: PurchaseView): string {
  const name = claim.by === 'self' ? 'You' : claim.firstName;
  return claim.claimerFirstName
    ? `${name} — added by ${claim.claimerFirstName}`
    : name;
}

// Hover grace so a glance-away-then-back doesn't snap a hover-opened
// popover shut. Shared by the card chip row and the modal store row.
const COLLAPSE_DELAY_MS = 220;

export function useHoverOpenMenu() {
  const [open, setOpen] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelCollapseAndOpen = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    setOpen(true);
  }, []);

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      setOpen(false);
      collapseTimer.current = null;
    }, COLLAPSE_DELAY_MS);
  }, []);

  return { open, setOpen, cancelCollapseAndOpen, scheduleCollapse };
}

export function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0];
}

export function isValidStore(store: ItemStoreTable | null | undefined): boolean {
  return !!store?.name && !!store?.link && !Number.isNaN(Number(store.price));
}

export function sortedValidStores(
  stores: ItemStoreTable[] | null | undefined
): ItemStoreTable[] {
  return (stores ?? [])
    .filter(isValidStore)
    .sort((a, b) => Number(a.price) - Number(b.price));
}

export function lowestPricedStore(
  stores: ItemStoreTable[] | null | undefined
): ItemStoreTable | null {
  return sortedValidStores(stores)[0] ?? null;
}

export function formatStorePrice(price: string | number): string {
  return `$${Number(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
