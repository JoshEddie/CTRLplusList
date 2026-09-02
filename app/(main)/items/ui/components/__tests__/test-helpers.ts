import type { ItemDisplay } from '@/lib/types';

// A store whose three fields all clear `storeComplete` — the state that unlocks
// Buy & Claim. Shared so a price or link that stops qualifying breaks every
// suite that leans on it at once.
export const LINKED_STORE = {
  name: 'Amazon',
  link: 'https://a.example',
  price: '35.50',
};

export function makeItem(overrides: Record<string, unknown> = {}): ItemDisplay {
  return {
    id: 'i1',
    name: 'Gift',
    description: '',
    image_url: '',
    profile_id: 'owner',
    quantity_limit: 1,
    store: null,
    purchases: [],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as never;
}
