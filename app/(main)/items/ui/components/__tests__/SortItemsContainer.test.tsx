import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNextHeaders } from '@/test/helpers/next-headers';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { auth } from '@/lib/auth';
import { getItemsByListId } from '@/lib/data/item';
import { getUserIdentity } from '@/lib/data/profile';
import { getUserIdByEmail } from '@/lib/data/user';
import SortItemsContainer from '../SortItemsContainer';
import { MAXIMAL_TIER, PROTECTED_TIER } from '@/lib/spoilers';
import { makeProfile } from '@/test/helpers/profile';

mockNextHeaders();

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/item', () => ({
  getItemsByListId: vi.fn(),
}));
vi.mock('@/lib/data/profile', () => ({ getUserIdentity: vi.fn() }));
vi.mock('@/lib/data/user', () => ({
  getUserIdByEmail: vi.fn(),
}));

vi.mock('../itemsToolbar/ToolbarSlot', () => ({
  default: (p: { mode: string }) => (
    <div data-testid="toolbar-slot" data-mode={p.mode} />
  ),
}));
vi.mock('../SortItems', () => ({
  default: (p: {
    items: unknown[];
    actor?: { id: string };
    listId: string;
    tier?: string;
  }) => (
    <div
      data-testid="sort-items"
      data-item-count={String(p.items.length)}
      data-profile-id={p.actor?.id ?? ''}
      data-list-id={p.listId}
      data-tier={String(p.tier)}
    />
  ),
}));

type El = { type: unknown; props: Record<string, unknown> };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'owner@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'u1',
    name: 'Owner',
  } as never);
  vi.mocked(getUserIdentity).mockResolvedValue({
    userId: 'u1',
    selfProfile: makeProfile('p1', 'Owner'),
    activeProfile: makeProfile('p1', 'Owner'),
  });
  vi.mocked(getItemsByListId).mockResolvedValue([
    { id: 'x1' },
    { id: 'x2' },
  ] as never);
});

describe('SortItemsContainer', () => {
  it('Authenticated_ReadsViewerScopedWithTierAndRendersSortItems', async () => {
    render(
      await SortItemsContainer({
        listId: 'l1',
        tier: MAXIMAL_TIER,
      })
    );
    expect(getItemsByListId).toHaveBeenCalledWith('l1', {
      viewerSelfProfileId: 'p1',
      tier: MAXIMAL_TIER,
      isOwner: true,
    });
    const sort = screen.getByTestId('sort-items');
    expect(sort).toHaveAttribute('data-item-count', '2');
    expect(sort).toHaveAttribute('data-profile-id', 'p1');
    expect(sort).toHaveAttribute('data-list-id', 'l1');
    expect(sort).toHaveAttribute('data-tier', MAXIMAL_TIER);
  });

  it('Render_MountsToolbarAheadOfTheSortableList', async () => {
    render(await SortItemsContainer({ listId: 'l1', tier: PROTECTED_TIER }));
    const toolbar = screen.getByTestId('toolbar-slot');
    expect(toolbar).toHaveAttribute('data-mode', 'list');
    expect(
      toolbar.compareDocumentPosition(screen.getByTestId('sort-items')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('Unauthenticated_ReadsWithoutViewerProfileId', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    render(await SortItemsContainer({ listId: 'l1', tier: PROTECTED_TIER }));
    expect(getUserIdByEmail).not.toHaveBeenCalled();
    expect(getItemsByListId).toHaveBeenCalledWith('l1', {
      viewerSelfProfileId: undefined,
      tier: PROTECTED_TIER,
      isOwner: true,
    });
    expect(screen.getByTestId('sort-items')).toHaveAttribute(
      'data-profile-id',
      ''
    );
  });

  it('Render_SuspenseFallbackIsPageLoadingIndicator', async () => {
    const tree = (await SortItemsContainer({
      listId: 'l1',
      tier: PROTECTED_TIER,
    })) as unknown as El;
    expect(tree.type).toBe(Suspense);
    const fallback = tree.props.fallback as El;
    expect(fallback.type).toBe(LoadingIndicator);
    expect(fallback.props.size).toBe('page');
  });
});
