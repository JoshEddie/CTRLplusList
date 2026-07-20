// The single store-validity contract: the deck's tier rows, the card display
// filtering, and the server actions' create/update validation all consume
// these helpers, so "complete store" cannot drift between surfaces.

export type Tier = 'good' | 'warn' | 'error';

export interface TierResult {
  tier: Tier;
  note: string;
}

// Optional $, integer or up to two decimals: a price is "good" only when it
// parses to a real amount (rejects forms Number() accepts, e.g. `1e5`).
export const PRICE_PATTERN = /^\$?[0-9]+(\.[0-9][0-9]?)?$/;

export function priceTier(price: string | null | undefined): TierResult {
  const value = (price ?? '').trim();
  if (!value) {
    return { tier: 'error', note: 'Add a price so people know the cost.' };
  }
  if (!PRICE_PATTERN.test(value)) {
    return { tier: 'error', note: 'Use a number like 19.99.' };
  }
  return { tier: 'good', note: '' };
}

export function isValidProductUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface StoreFields {
  name: string;
  link: string;
  price: string;
}

export function storeComplete(
  store: StoreFields | null | undefined
): boolean {
  return (
    !!store?.name?.trim() &&
    isValidProductUrl(store.link) &&
    priceTier(store.price).tier === 'good'
  );
}

// The display/persist-valid predicate: FULL (navigable, storeComplete) or
// PRICED (price only — link exactly '', name blank, good price). Requiring an
// empty (not merely invalid) link keeps dormant legacy rows with broken
// non-empty links filtered out — they never resurrect as valid.
export function storeValid(store: StoreFields | null | undefined): boolean {
  if (storeComplete(store)) return true;
  return (
    store?.link === '' &&
    (store?.name?.trim() ?? '') === '' &&
    priceTier(store.price).tier === 'good'
  );
}

// PRICE_PATTERN accepts an optional leading `$`, which Number() does not.
export function priceAmount(price: string | number): number {
  return typeof price === 'string'
    ? Number(price.replace(/^\$/, ''))
    : price;
}

export function primaryStore<T extends StoreFields>(
  rows: T[] | null | undefined
): T | null {
  const valid = (rows ?? [])
    .filter(storeValid)
    .sort((a, b) => priceAmount(a.price) - priceAmount(b.price));
  return valid[0] ?? rows?.[0] ?? null;
}
