import { SortKey } from '@/lib/types';

export type BrowserMode = 'items' | 'list' | 'edit';

export type ParamPatch = Record<string, string | null>;

export interface FilterState {
  mode: BrowserMode;
  sort: SortKey;
  defaultSort: SortKey;
  selectedStores: string[];
  priceMin: string;
  priceMax: string;
}

export interface ChipDescriptor {
  key: string;
  label: string;
  onClear: () => void;
}
