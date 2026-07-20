import { priceAmount, storeComplete } from '@/lib/storeValidity';
import { ItemDisplay, SortKey } from '@/lib/types';

export function storeName(item: ItemDisplay): string {
  return item.store?.name ?? '';
}

export function displayPrice(item: ItemDisplay): number {
  const store = item.store;
  if (!store || !storeComplete(store)) return NaN;
  return priceAmount(store.price);
}

function compareByStore(a: ItemDisplay, b: ItemDisplay, sort: SortKey): number {
  const aStore = storeName(a);
  const bStore = storeName(b);
  if (!aStore && !bStore) return 0;
  if (!aStore) return 1;
  if (!bStore) return -1;
  return sort === 'store_asc'
    ? aStore.localeCompare(bStore)
    : bStore.localeCompare(aStore);
}

function compareByPrice(a: ItemDisplay, b: ItemDisplay, sort: SortKey): number {
  const aPrice = displayPrice(a);
  const bPrice = displayPrice(b);
  const aMissing = !Number.isFinite(aPrice);
  const bMissing = !Number.isFinite(bPrice);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return sort === 'price_asc' ? aPrice - bPrice : bPrice - aPrice;
}

export function compareItems(
  a: ItemDisplay,
  b: ItemDisplay,
  sort: SortKey
): number {
  switch (sort) {
    case 'list_order':
      return 0;
    case 'created_asc':
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case 'created_desc':
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case 'name_asc':
      return a.name.localeCompare(b.name);
    case 'name_desc':
      return b.name.localeCompare(a.name);
    case 'store_asc':
    case 'store_desc':
      return compareByStore(a, b, sort);
    case 'price_asc':
    case 'price_desc':
      return compareByPrice(a, b, sort);
  }
}
