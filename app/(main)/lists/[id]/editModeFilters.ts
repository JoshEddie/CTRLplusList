import {
  compareItems,
  displayPrice,
} from '@/app/(main)/items/ui/components/itemFilters';
import { ItemDisplay, SortKey } from '@/lib/types';

const VALID_SORT_KEYS: SortKey[] = [
  'created_desc',
  'created_asc',
  'name_asc',
  'name_desc',
  'store_asc',
  'store_desc',
  'price_asc',
  'price_desc',
];

export type ShowFilter = 'all' | 'on' | 'off';

export interface EditModeFilters {
  q: string;
  sort: SortKey;
  show: ShowFilter;
  selectedStores: string[];
  priceMin: number;
  priceMax: number;
  hasPriceFilter: boolean;
}

export function parseEditModeFilters(
  searchParams: URLSearchParams | null
): EditModeFilters {
  const q = (searchParams?.get('q') ?? '').toLowerCase().trim();
  const rawSort = searchParams?.get('sort') as SortKey | null;
  const sort: SortKey =
    rawSort && VALID_SORT_KEYS.includes(rawSort) ? rawSort : 'name_asc';
  const rawShow = searchParams?.get('show');
  const show: ShowFilter =
    rawShow === 'on' || rawShow === 'off' ? rawShow : 'all';
  const selectedStores = searchParams?.getAll('store') ?? [];
  const priceMin = parseFloat(searchParams?.get('price_min') ?? '');
  const priceMax = parseFloat(searchParams?.get('price_max') ?? '');
  const hasPriceFilter = Number.isFinite(priceMin) || Number.isFinite(priceMax);
  return { q, sort, show, selectedStores, priceMin, priceMax, hasPriceFilter };
}

export function collectStoreOptions(items: ItemDisplay[]): string[] {
  const names = new Set<string>();
  for (const item of items) {
    if (item.store?.name) names.add(item.store.name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function filterAndSortEditModeItems(
  items: ItemDisplay[],
  selected: ReadonlySet<string>,
  filters: EditModeFilters
): ItemDisplay[] {
  const { q, sort, show, selectedStores, priceMin, priceMax, hasPriceFilter } =
    filters;
  let result = items;
  if (show === 'on') {
    result = result.filter((item) => selected.has(item.id));
  } else if (show === 'off') {
    result = result.filter((item) => !selected.has(item.id));
  }
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
  return [...result].sort((a, b) => compareItems(a, b, sort));
}
