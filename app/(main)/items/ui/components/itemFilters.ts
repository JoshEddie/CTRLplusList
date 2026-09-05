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

export interface ItemFilters {
  q: string;
  selectedStores: string[];
  priceMin: number;
  priceMax: number;
  hasPriceFilter: boolean;
}

export function parseItemFilters(
  searchParams: URLSearchParams | null
): ItemFilters {
  const q = (searchParams?.get('q') ?? '').toLowerCase().trim();
  const selectedStores = searchParams?.getAll('store') ?? [];
  const priceMin = parseFloat(searchParams?.get('price_min') ?? '');
  const priceMax = parseFloat(searchParams?.get('price_max') ?? '');
  const hasPriceFilter = Number.isFinite(priceMin) || Number.isFinite(priceMax);
  return { q, selectedStores, priceMin, priceMax, hasPriceFilter };
}

export function filterItems(
  items: ItemDisplay[],
  filters: ItemFilters
): ItemDisplay[] {
  const { q, selectedStores, priceMin, priceMax, hasPriceFilter } = filters;
  let result = items;
  if (q) {
    result = result.filter((item) =>
      `${item.name ?? ''} ${item.description ?? ''}`.toLowerCase().includes(q)
    );
  }
  if (selectedStores.length > 0) {
    const selectedSet = new Set(selectedStores);
    result = result.filter(
      (item) => !!item.store && selectedSet.has(item.store.name)
    );
  }
  if (hasPriceFilter) {
    const lo = Number.isFinite(priceMin) ? priceMin : -Infinity;
    const hi = Number.isFinite(priceMax) ? priceMax : Infinity;
    result = result.filter((item) => {
      const p = displayPrice(item);
      return Number.isFinite(p) && p >= lo && p <= hi;
    });
  }
  return result;
}

export function parseSort(
  searchParams: URLSearchParams | null,
  valid: readonly SortKey[],
  fallback: SortKey
): SortKey {
  const raw = searchParams?.get('sort') as SortKey | null;
  return raw && valid.includes(raw) ? raw : fallback;
}

export function parsePage(searchParams: URLSearchParams | null): number {
  const raw = parseInt(searchParams?.get('page') ?? '1', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

// A page past the end lands on the last one rather than on nothing.
export function pageOf<T>(
  rows: T[],
  requestedPage: number,
  pageSize: number
): { rows: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    page,
    totalPages,
  };
}

/** The items page's reading of a search string: filtered, sorted, and paged. `list_order` leaves the input order alone. */
export function browseItems(
  items: ItemDisplay[],
  searchParams: URLSearchParams | null,
  sort: SortKey,
  pageSize: number
): { rows: ItemDisplay[]; page: number; totalPages: number; matches: number } {
  const filtered = filterItems(items, parseItemFilters(searchParams));
  const sorted =
    sort === 'list_order'
      ? filtered
      : [...filtered].sort((a, b) => compareItems(a, b, sort));
  return {
    ...pageOf(sorted, parsePage(searchParams), pageSize),
    matches: sorted.length,
  };
}
