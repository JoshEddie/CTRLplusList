import { type ItemData } from '@/lib/data/item.schema';
import { priceTier, storeComplete } from '@/lib/storeValidity';
import { type ActionResponse } from '@/lib/types';

// Input-side tri-state store cap (item-store-links, non-link-item-states):
// at most one store, in one of three shapes — BARE (nothing entered → zero
// rows), PRICED (price only, no name/link), or FULL (storeComplete). Symmetric
// name⇄link coupling: either present requires the other; a present link also
// requires a good price. The actions mirror the client gate so the API can't
// persist what the UI forbids. Legacy multi-store rows collapse via positional
// sync on the first edit-save. Success carries the 0-or-1 normalized rows
// updateItemStores writes.
export type NormalizedStore = {
  name: string;
  link: string;
  price: string;
  price_fetched_at: string | null;
  canonical_url: string | null;
  currency: string | null;
};

function rejectStore(message: string): { failure: ActionResponse } {
  return {
    failure: {
      success: false,
      message: 'Validation failed',
      errors: { store: [message] },
    },
  };
}

export function validateStore(
  raw: ItemData['store']
):
  | { failure: ActionResponse; stores?: undefined }
  | { failure?: undefined; stores: NormalizedStore[] } {
  const name = raw?.name ?? '';
  const link = raw?.link ?? '';
  const price = raw?.price ?? '';
  const nameEmpty = name.trim() === '';
  const linkEmpty = link.trim() === '';
  const priceEmpty = price.trim() === '';

  if (nameEmpty && linkEmpty) {
    if (priceEmpty) return { stores: [] };
    if (priceTier(price).tier !== 'good') {
      return rejectStore('A price needs to be a number like 19.99');
    }
    return {
      stores: [
        {
          name: '',
          link: '',
          price,
          price_fetched_at: null,
          canonical_url: null,
          currency: null,
        },
      ],
    };
  }

  if (nameEmpty) return rejectStore('A store needs a name');
  if (linkEmpty) return rejectStore('A store name needs a link');

  const store: NormalizedStore = {
    name,
    link,
    price,
    price_fetched_at: raw?.price_fetched_at ?? null,
    canonical_url: raw?.canonical_url ?? null,
    currency: raw?.currency ?? null,
  };
  if (!storeComplete(store)) {
    return rejectStore('A store needs a name, a link, and a price');
  }
  return { stores: [store] };
}
