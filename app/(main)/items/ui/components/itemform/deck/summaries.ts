import { storeTier } from './utils';
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

export function storeSubtext(item: ItemViewModel): string {
  const store = item.stores[0];
  return store && storeTier(store).tier === 'good'
    ? store.name
    : 'Add where to buy it';
}
