import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { auth } from '@/lib/auth';
import { getItemsByListId, getUserIdByEmail } from '@/lib/dal';
import SortItemsContainer from '../SortItemsContainer';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/dal', () => ({
  getItemsByListId: vi.fn(),
  getUserIdByEmail: vi.fn(),
}));

vi.mock('../SortItems', () => ({
  default: (p: { items: unknown[]; user_id?: string; listId: string }) => (
    <div
      data-testid="sort-items"
      data-item-count={String(p.items.length)}
      data-user-id={p.user_id ?? ''}
      data-list-id={p.listId}
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
  vi.mocked(getItemsByListId).mockResolvedValue([
    { id: 'x1' },
    { id: 'x2' },
  ] as never);
});

describe('SortItemsContainer', () => {
  it('Authenticated_ReadsViewerScopedAndRendersSortItems', async () => {
    render(
      await SortItemsContainer({ listId: 'l1', isOwner: true, showSpoilers: true })
    );
    expect(getItemsByListId).toHaveBeenCalledWith('l1', {
      viewerId: 'u1',
      isOwner: true,
      showSpoilers: true,
    });
    const sort = screen.getByTestId('sort-items');
    expect(sort).toHaveAttribute('data-item-count', '2');
    expect(sort).toHaveAttribute('data-user-id', 'u1');
    expect(sort).toHaveAttribute('data-list-id', 'l1');
  });

  it('Unauthenticated_ReadsWithoutViewerIdAndOwnerFalse', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    render(await SortItemsContainer({ listId: 'l1' }));
    expect(getUserIdByEmail).not.toHaveBeenCalled();
    expect(getItemsByListId).toHaveBeenCalledWith('l1', {
      viewerId: undefined,
      isOwner: false,
      showSpoilers: false,
    });
    expect(screen.getByTestId('sort-items')).toHaveAttribute(
      'data-user-id',
      ''
    );
  });

  it('Render_SuspenseFallbackIsPageLoadingIndicator', async () => {
    const tree = (await SortItemsContainer({ listId: 'l1' })) as unknown as El;
    expect(tree.type).toBe(Suspense);
    const fallback = tree.props.fallback as El;
    expect(fallback.type).toBe(LoadingIndicator);
    expect(fallback.props.size).toBe('page');
  });
});
