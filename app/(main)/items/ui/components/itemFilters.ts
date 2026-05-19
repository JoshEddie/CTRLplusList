import { ItemDisplay, SortKey } from '@/lib/types';

export function firstStoreName(item: ItemDisplay): string {
  const stores = item.stores;
  if (!stores || stores.length === 0) return '';
  return [...stores].map((s) => s.name).sort()[0] ?? '';
}

export function displayPrice(item: ItemDisplay): number {
  const stores = item.stores ?? [];
  let lowest = NaN;
  for (const s of stores) {
    if (!s?.name || !s?.link) continue;
    const n = Number(s.price);
    if (!Number.isFinite(n)) continue;
    if (!Number.isFinite(lowest) || n < lowest) lowest = n;
  }
  return lowest;
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
    case 'store_desc': {
      const aStore = firstStoreName(a);
      const bStore = firstStoreName(b);
      if (!aStore && !bStore) return 0;
      if (!aStore) return 1;
      if (!bStore) return -1;
      return sort === 'store_asc'
        ? aStore.localeCompare(bStore)
        : bStore.localeCompare(aStore);
    }
    case 'price_asc':
    case 'price_desc': {
      const aPrice = displayPrice(a);
      const bPrice = displayPrice(b);
      const aMissing = !Number.isFinite(aPrice);
      const bMissing = !Number.isFinite(bPrice);
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      return sort === 'price_asc' ? aPrice - bPrice : bPrice - aPrice;
    }
  }
}
