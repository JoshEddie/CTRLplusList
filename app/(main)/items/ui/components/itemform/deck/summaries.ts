import { sortedValidStores } from '../../utils';
import type { ItemViewModel } from './viewModel';

// "Not on a list · Qty 1", "Birthday · Unlimited" — quantity surfaced alongside
// list membership on the Preview action row (D7, correction #5).
export function listsQtySubtext(item: ItemViewModel): string {
  const lists = item.lists.length
    ? item.lists.map((l) => l.label).join(', ')
    : 'Not on a list';
  const qty = item.qty === null ? 'Unlimited' : `Qty ${item.qty}`;
  return `${lists} · ${qty}`;
}

export function storesSubtext(item: ItemViewModel): string {
  const stores = sortedValidStores(item.stores);
  if (stores.length === 0) return 'Add where to buy it';
  if (stores.length === 1) return stores[0].name;
  return `${stores[0].name} +${stores.length - 1} more`;
}
