import type { ListTable } from '@/lib/types';
import type { ListVisibility } from '@/lib/visibility';

export type TestList = ListTable & { visibility?: ListVisibility };

/**
 * Build a `ListTable`-shaped fixture for the hero component tests. Defaults to
 * an owner-only (private), occasion-less, single-day list; override any field
 * per test. Shared by ListDetails / ShareButton / EditListAction tests.
 */
export function makeList(overrides: Partial<TestList> = {}): TestList {
  return {
    id: 'list-1',
    name: 'Birthday Wishlist',
    subtitle: null,
    occasion: '',
    date: new Date('2030-01-01T00:00:00Z'),
    created_at: new Date('2030-01-01T00:00:00Z'),
    updated_at: new Date('2030-01-01T00:00:00Z'),
    user_id: 'owner-1',
    shared: false,
    ...overrides,
  };
}
