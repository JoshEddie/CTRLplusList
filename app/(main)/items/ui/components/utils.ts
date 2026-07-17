import { storeComplete } from '@/lib/storeValidity';
import { ItemStoreTable, PurchaseView } from '@/lib/types';

export function claimLabel(claim: PurchaseView): string {
  const name = claim.by === 'self' ? 'You' : claim.firstName;
  return claim.claimerFirstName
    ? `${name} — added by ${claim.claimerFirstName}`
    : name;
}

export function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0];
}

// PRICE_PATTERN accepts an optional leading `$`, which Number() does not.
function priceAmount(price: string | number): number {
  return typeof price === 'string'
    ? Number(price.replace(/^\$/, ''))
    : price;
}

export function sortedValidStores(
  stores: ItemStoreTable[] | null | undefined
): ItemStoreTable[] {
  return (stores ?? [])
    .filter(storeComplete)
    .sort((a, b) => priceAmount(a.price) - priceAmount(b.price));
}

export function lowestPricedStore(
  stores: ItemStoreTable[] | null | undefined
): ItemStoreTable | null {
  return sortedValidStores(stores)[0] ?? null;
}

export function formatStorePrice(price: string | number): string {
  return `$${priceAmount(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

