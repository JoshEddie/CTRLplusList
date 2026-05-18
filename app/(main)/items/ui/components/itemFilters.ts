import { ItemDisplay, SortKey } from '@/lib/types';

export function firstStoreName(item: ItemDisplay): string {
  const stores = item.stores;
  if (!stores || stores.length === 0) return '';
  return [...stores].map((s) => s.name).sort()[0] ?? '';
}

export function firstStorePrice(item: ItemDisplay): number {
  const raw = item.stores?.[0]?.price;
  if (raw == null || raw === '') return NaN;
  return Number(raw);
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
      const aPrice = firstStorePrice(a);
      const bPrice = firstStorePrice(b);
      const aMissing = !Number.isFinite(aPrice);
      const bMissing = !Number.isFinite(bPrice);
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      return sort === 'price_asc' ? aPrice - bPrice : bPrice - aPrice;
    }
  }
}
