import { getItemsByProfile } from '@/lib/data/item';
import { makeProfile } from '@/test/helpers/profile';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListLibraryPanel from '../ListLibraryPanel';
import { OwnerTabsContext } from '../ownerTabs';

vi.mock('@/lib/data/item', () => ({ getItemsByProfile: vi.fn() }));
vi.mock('@/app/(main)/items/utils', () => ({
  readItemsPageSize: vi.fn(async () => 48),
}));

const membership = vi.hoisted(() => ({
  rows: [] as { item_id: string; quantity: number }[],
}));
vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => Promise.resolve(membership.rows) }),
    }),
  },
}));

vi.mock('@/app/(main)/items/ui/components/ItemsBrowser', () => ({
  default: (p: {
    items: Record<string, unknown>[];
    mode: string;
    claimless?: boolean;
    initialPageSize?: number;
    actor?: { id: string };
    emptyState?: React.ReactNode;
  }) => (
    <div
      data-testid="browser"
      data-mode={p.mode}
      data-claimless={String(!!p.claimless)}
      data-page-size={String(p.initialPageSize)}
      data-actor={p.actor?.id ?? ''}
      data-item-ids={p.items.map((i) => i.id).join(',')}
      data-entry-lists={p.items.map((i) => i.list_id).join(',')}
      data-quantities={p.items.map((i) => i.quantity).join(',')}
      data-rollup-keys={p.items
        .flatMap((i) => Object.keys(i))
        .filter((k) => ['purchases', 'claimed_units', 'num_lists'].includes(k))
        .join(',')}
    >
      {p.items.length === 0 ? p.emptyState : null}
    </div>
  ),
}));

const item = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  profile_id: 'p1',
  archived_at: null,
  purchases: [{ id: 'c1' }],
  claimed_units: 2,
  quantity: 9,
  num_lists: 3,
  ...extra,
});

const browser = () => screen.getByTestId('browser');

// The panel only ever renders inside the band, whose context its empty state
// reaches for.
const renderPanel = async () =>
  render(
    <OwnerTabsContext.Provider
      value={{ showLibrary: vi.fn(), createItem: vi.fn() }}
    >
      {await ListLibraryPanel({
        listId: 'l1',
        actor: makeProfile('p1', 'Owner'),
      })}
    </OwnerTabsContext.Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  membership.rows = [{ item_id: 'i1', quantity: 4 }];
  vi.mocked(getItemsByProfile).mockResolvedValue([
    item('i1'),
    item('i2'),
  ] as never);
});

describe('ListLibraryPanel', () => {
  it('Default_BrowsesTheProfilesLibraryClaimlessAtTheStoredPageSize', async () => {
    await renderPanel();
    expect(browser()).toHaveAttribute('data-mode', 'items');
    expect(browser()).toHaveAttribute('data-claimless', 'true');
    expect(browser()).toHaveAttribute('data-page-size', '48');
    expect(browser()).toHaveAttribute('data-actor', 'p1');
    expect(getItemsByProfile).toHaveBeenCalledWith('p1', { filter: 'all' });
  });

  it('Default_ReadsEveryCardThroughThisListAtItsOwnQuantity', async () => {
    await renderPanel();
    expect(browser()).toHaveAttribute('data-item-ids', 'i1,i2');
    expect(browser()).toHaveAttribute('data-entry-lists', 'l1,l1');
    expect(browser()).toHaveAttribute('data-quantities', '4,0');
  });

  it('Default_StripsTheRolledUpAskListCountAndClaims', async () => {
    await renderPanel();
    expect(browser()).toHaveAttribute('data-rollup-keys', '');
  });

  it('ArchivedItems_HiddenUnlessTheListHoldsThem', async () => {
    membership.rows = [{ item_id: 'i2', quantity: 1 }];
    vi.mocked(getItemsByProfile).mockResolvedValue([
      item('i1', { archived_at: new Date('2025-01-01') }),
      item('i2', { archived_at: new Date('2025-01-01') }),
    ] as never);
    await renderPanel();
    expect(browser()).toHaveAttribute('data-item-ids', 'i2');
  });

  it('EmptyLibrary_OffersTheCreateItemDoor', async () => {
    vi.mocked(getItemsByProfile).mockResolvedValue([] as never);
    await renderPanel();
    expect(
      screen.getByRole('heading', { name: 'No items in your library yet' })
    ).toBeInTheDocument();
  });
});
