import type { ItemDisplay } from '@/lib/types';

// A store whose three fields all clear `storeComplete` — the state that unlocks
// Buy & Claim. Shared so a price or link that stops qualifying breaks every
// suite that leans on it at once.
export const LINKED_STORE = {
  name: 'Amazon',
  link: 'https://a.example',
  price: '35.50',
};

// An entry quantity no case in these suites can fill, for the many tests whose
// subject is not capacity. Named so "not fully claimed" reads as the intent
// rather than as an arbitrary number repeated across two suites.
export const AMPLE_QUANTITY = 99;

// Defaults to a row read through a list entry, which is what every claim
// surface but the item library hands the card. `claimed_units` follows the
// projected claims unless a case sets it — one claim covers one unit, so a
// fixture that says otherwise is stating something deliberate.
export function makeItem(overrides: Record<string, unknown> = {}): ItemDisplay {
  const merged: Record<string, unknown> & { purchases?: unknown[] } = {
    id: 'i1',
    name: 'Gift',
    description: '',
    image_url: '',
    profile_id: 'owner',
    list_id: 'l1',
    quantity: 1,
    store: null,
    purchases: [] as unknown[],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
  return {
    ...merged,
    claimed_units: merged.claimed_units ?? merged.purchases?.length ?? 0,
  } as never;
}
