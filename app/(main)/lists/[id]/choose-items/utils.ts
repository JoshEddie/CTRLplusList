import {
  compareItems,
  displayPrice,
} from '@/app/(main)/items/ui/components/itemFilters';
import { ItemDisplay, SortKey } from '@/lib/types';

const VALID_SORT_CHOOSE: SortKey[] = [
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

export interface ChooseItemsFilters {
  q: string;
  sort: SortKey;
  show: ShowFilter;
  selectedStores: string[];
  priceMin: number;
  priceMax: number;
  hasPriceFilter: boolean;
}

export function parseChooseItemsFilters(
  searchParams: URLSearchParams | null
): ChooseItemsFilters {
  const q = (searchParams?.get('q') ?? '').toLowerCase().trim();
  const rawSort = searchParams?.get('sort') as SortKey | null;
  const sort: SortKey =
    rawSort && VALID_SORT_CHOOSE.includes(rawSort) ? rawSort : 'name_asc';
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
    for (const store of item.stores ?? []) {
      if (store.name) names.add(store.name);
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function filterAndSortChooseItems(
  items: ItemDisplay[],
  selected: Set<string>,
  filters: ChooseItemsFilters
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
    result = result.filter((item) =>
      item.stores?.some((s) => selectedSet.has(s.name))
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

export function chooseItemsSaveLabel(
  mode: 'create' | 'manage',
  totalSelected: number
): string {
  if (mode === 'manage') return 'Save changes';
  return totalSelected > 0
    ? `Add ${totalSelected} item${totalSelected !== 1 ? 's' : ''} to list →`
    : 'Skip';
}
