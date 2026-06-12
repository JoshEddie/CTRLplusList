import { SortKey } from '@/lib/types';
import { BrowserMode } from './types';

export const SORT_LABELS: Record<SortKey, string> = {
  list_order: 'List order',
  created_desc: 'Newest',
  created_asc: 'Oldest',
  name_asc: 'Name A–Z',
  name_desc: 'Name Z–A',
  store_asc: 'Store A–Z',
  store_desc: 'Store Z–A',
  price_asc: 'Price Low',
  price_desc: 'Price High',
};

export const SHARED_SORT_KEYS: SortKey[] = [
  'name_asc',
  'name_desc',
  'store_asc',
  'store_desc',
  'price_asc',
  'price_desc',
];

export const SORT_KEYS_BY_MODE: Record<BrowserMode, SortKey[]> = {
  items: ['created_desc', 'created_asc', ...SHARED_SORT_KEYS],
  list: ['list_order', ...SHARED_SORT_KEYS],
  choose: ['created_desc', 'created_asc', ...SHARED_SORT_KEYS],
};

export const PURCHASES_LABELS_ITEMS: Record<string, string> = {
  reveal: 'Purchases: Reveal',
  only: 'Only purchased',
  none: 'Only not purchased',
};

export const PURCHASES_LABELS_LIST: Record<string, string> = {
  only: 'Only purchased',
  none: 'Only not purchased',
};

export const SHOW_LABELS: Record<string, string> = {
  on: 'On the list',
  off: 'Not on the list',
};
