import {
  compareItems,
  displayPrice,
} from '@/app/(main)/items/ui/components/itemFilters';
import { ItemDisplay } from '@/lib/types';
import type { StagedEntry } from './editModeChanges';

export interface EditModeFilters {
  q: string;
  selectedStores: string[];
  priceMin: number;
  priceMax: number;
  hasPriceFilter: boolean;
}

export function parseEditModeFilters(
  searchParams: URLSearchParams | null
): EditModeFilters {
  const q = (searchParams?.get('q') ?? '').toLowerCase().trim();
  const selectedStores = searchParams?.getAll('store') ?? [];
  const priceMin = parseFloat(searchParams?.get('price_min') ?? '');
  const priceMax = parseFloat(searchParams?.get('price_max') ?? '');
  const hasPriceFilter = Number.isFinite(priceMin) || Number.isFinite(priceMax);
  return { q, selectedStores, priceMin, priceMax, hasPriceFilter };
}

// Client-side twin of `hasActiveFilter`: any narrowing suspends reorder,
// because a drag across hidden rows would write a position nobody can see.
export function hasEditModeFilter(filters: EditModeFilters): boolean {
  return (
    filters.q !== '' ||
    filters.selectedStores.length > 0 ||
    filters.hasPriceFilter
  );
}

export function filterEditModeItems(
  items: ItemDisplay[],
  filters: EditModeFilters
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

export interface EditModePartition {
  /** Members in staged position order, narrowed by the filters. */
  inList: ItemDisplay[];
  /** The rest of the library by name, narrowed by the filters. */
  notInList: ItemDisplay[];
  inListTotal: number;
  notInListTotal: number;
}

// An entry naming an item the library has not delivered yet (one just created,
// ahead of the refresh that carries it) is skipped rather than rendered blank.
export function partitionEditModeItems(
  items: ItemDisplay[],
  entries: StagedEntry[],
  filters: EditModeFilters
): EditModePartition {
  const byId = new Map(items.map((item) => [item.id, item]));
  const members = new Set(entries.map((entry) => entry.item_id));
  const inList = entries.flatMap((entry) => byId.get(entry.item_id) ?? []);
  const notInList = items
    .filter((item) => !members.has(item.id))
    .sort((a, b) => compareItems(a, b, 'name_asc'));
  return {
    inList: filterEditModeItems(inList, filters),
    notInList: filterEditModeItems(notInList, filters),
    inListTotal: inList.length,
    notInListTotal: notInList.length,
  };
}
