import { Menu } from '@/app/ui/components/menu';
import type { ListTable } from '@/lib/types';
import type { ListVisibility } from '@/lib/visibility';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

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
    profile_id: 'owner-profile-1',
    shared: false,
    ...overrides,
  };
}

export function renderInMenu(node: ReactNode) {
  return render(
    <Menu open onClose={() => {}}>
      {node}
    </Menu>
  );
}
