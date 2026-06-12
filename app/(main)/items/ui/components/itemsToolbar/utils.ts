import { SortKey } from '@/lib/types';
import {
  PURCHASES_LABELS_ITEMS,
  PURCHASES_LABELS_LIST,
  SHOW_LABELS,
  SORT_KEYS_BY_MODE,
  SORT_LABELS,
} from './toolbarConstants';
import { BrowserMode, ChipDescriptor, FilterState, ParamPatch } from './types';

export function buildQueryUrl(
  pathname: string,
  params: URLSearchParams
): string {
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function patchedParams(
  searchParams: URLSearchParams | null,
  patch: ParamPatch
): URLSearchParams {
  const params = new URLSearchParams(searchParams?.toString() || '');
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
  }
  return params;
}

export function toggledStoreParams(
  searchParams: URLSearchParams | null,
  name: string
): URLSearchParams {
  const params = new URLSearchParams(searchParams?.toString() || '');
  const current = params.getAll('store');
  params.delete('store');
  const next = current.includes(name)
    ? current.filter((s) => s !== name)
    : [...current, name];
  for (const s of next) params.append('store', s);
  params.delete('page');
  return params;
}

export function sortOptionsFor(
  mode: BrowserMode,
  showStoreSort: boolean,
  showPriceSort: boolean
): Array<{ value: SortKey; label: string }> {
  return SORT_KEYS_BY_MODE[mode]
    .filter((key) => {
      if (!showStoreSort && key.startsWith('store_')) return false;
      if (!showPriceSort && key.startsWith('price_')) return false;
      return true;
    })
    .map((key) => ({ value: key, label: SORT_LABELS[key] }));
}

export function priceChipLabel(priceMin: string, priceMax: string): string {
  if (priceMin && priceMax) return `$${priceMin}–$${priceMax}`;
  if (priceMin) return `$${priceMin}+`;
  return `Up to $${priceMax}`;
}

export function countActiveFilters(s: FilterState): number {
  return (
    (s.sort !== s.defaultSort ? 1 : 0) +
    (s.mode !== 'choose' && s.purchases !== 'hide' ? 1 : 0) +
    (s.mode === 'choose' && s.show !== 'all' ? 1 : 0) +
    s.selectedStores.length +
    (s.priceMin || s.priceMax ? 1 : 0)
  );
}

export function buildChips(
  s: FilterState,
  handlers: {
    updateParams: (patch: ParamPatch) => void;
    removeStore: (name: string) => void;
    clearPrice: () => void;
  }
): ChipDescriptor[] {
  const chips: ChipDescriptor[] = [];
  if (s.sort !== s.defaultSort) {
    chips.push({
      key: 'sort',
      label: SORT_LABELS[s.sort],
      onClear: () => handlers.updateParams({ sort: null, page: null }),
    });
  }
  if (s.mode !== 'choose' && s.purchases !== 'hide') {
    const labelMap =
      s.mode === 'items' ? PURCHASES_LABELS_ITEMS : PURCHASES_LABELS_LIST;
    const label = labelMap[s.purchases];
    if (label) {
      chips.push({
        key: 'purchases',
        label,
        onClear: () => handlers.updateParams({ purchases: null, page: null }),
      });
    }
  }
  if (s.mode === 'choose' && s.show !== 'all') {
    const label = SHOW_LABELS[s.show];
    if (label) {
      chips.push({
        key: 'show',
        label,
        onClear: () => handlers.updateParams({ show: null, page: null }),
      });
    }
  }
  for (const store of s.selectedStores) {
    chips.push({
      key: `store:${store}`,
      label: store,
      onClear: () => handlers.removeStore(store),
    });
  }
  if (s.priceMin || s.priceMax) {
    chips.push({
      key: 'price',
      label: priceChipLabel(s.priceMin, s.priceMax),
      onClear: handlers.clearPrice,
    });
  }
  return chips;
}
