import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getList, getUserIdByEmail, isBlocked } from '@/lib/dal';
import ListItemsSection from '../ListItemsSection';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/dal', () => ({
  getList: vi.fn(),
  getUserIdByEmail: vi.fn(),
  isBlocked: vi.fn(),
  isFollowing: vi.fn(),
}));
// guardListViewable (lib/listAccess) statically imports `@/db`, which calls
// neon() at module load. The query path (isItemViewable) is never reached here,
// so an empty stub satisfies the import without a live connection string.
vi.mock('@/db', () => ({ db: {} }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/(main)/items/ui/components/SortItemsContainer', () => ({
  default: (p: { listId: string; isOwner?: boolean; showSpoilers?: boolean }) => (
    <div
      data-testid="sort-items-container"
      data-list-id={p.listId}
      data-is-owner={String(p.isOwner)}
      data-show-spoilers={String(p.showSpoilers)}
    />
  ),
}));
vi.mock('@/app/(main)/items/ui/components/ItemsContainer', () => ({
  default: (p: {
    listId: string;
    isListOwner?: boolean;
    viewerId?: string;
    showSpoilers?: boolean;
  }) => (
    <div
      data-testid="items-container"
      data-list-id={p.listId}
      data-is-list-owner={String(p.isListOwner)}
      data-viewer-id={p.viewerId ?? ''}
      data-show-spoilers={String(p.showSpoilers)}
    />
  ),
}));

function props(id = 'l1', sp: Record<string, string> = {}) {
  return {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(sp),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'u1',
    name: 'Owner',
  } as never);
  vi.mocked(isBlocked).mockResolvedValue(false as never);
  vi.mocked(getList).mockResolvedValue({
    id: 'l1',
    user_id: 'u1',
    visibility: 'public',
  } as never);
});

describe('ListItemsSection', () => {
  it('Owner_MountsSortItemsContainerWithSpoilers', async () => {
    vi.mocked(getList).mockResolvedValue({
      id: 'l1',
      user_id: 'u1',
      visibility: 'private',
    } as never);
    render(await ListItemsSection(props('l1', { spoilers: '1' })));
    const c = screen.getByTestId('sort-items-container');
    expect(c).toHaveAttribute('data-list-id', 'l1');
    expect(c).toHaveAttribute('data-is-owner', 'true');
    expect(c).toHaveAttribute('data-show-spoilers', 'true');
  });

  it('Viewer_MountsItemsContainerWithViewerId', async () => {
    vi.mocked(getUserIdByEmail).mockResolvedValue({
      id: 'u2',
      name: 'Viewer',
    } as never);
    render(await ListItemsSection(props('l1')));
    const c = screen.getByTestId('items-container');
    expect(c).toHaveAttribute('data-viewer-id', 'u2');
    expect(c).toHaveAttribute('data-is-list-owner', 'false');
  });

  it('OwnerPreviewMode_MountsItemsContainerAsListOwner', async () => {
    render(await ListItemsSection(props('l1', { preview: 'viewer' })));
    const c = screen.getByTestId('items-container');
    expect(c).toHaveAttribute('data-is-list-owner', 'true');
    expect(c).toHaveAttribute('data-viewer-id', 'u1');
  });

  it('OwnerOnlyListNonOwner_RendersNothing', async () => {
    vi.mocked(getUserIdByEmail).mockResolvedValue({
      id: 'u2',
      name: 'Viewer',
    } as never);
    vi.mocked(getList).mockResolvedValue({
      id: 'l1',
      user_id: 'u1',
      visibility: 'private',
    } as never);
    const { container } = render(await ListItemsSection(props('l1')));
    expect(container).toBeEmptyDOMElement();
  });

  describe('GuardRedirects', () => {
    it('MissingListAuthedViewer_RedirectsToLists', async () => {
      vi.mocked(getList).mockResolvedValue(null as never);
      await expect(ListItemsSection(props('l1'))).rejects.toThrow(
        'REDIRECT:/lists'
      );
    });

    it('MissingListUnauthenticated_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      vi.mocked(getList).mockResolvedValue(null as never);
      await expect(ListItemsSection(props('l1'))).rejects.toThrow('REDIRECT:/');
    });

    it('BlockedViewer_RedirectsToLists', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue({
        id: 'u2',
        name: 'Viewer',
      } as never);
      vi.mocked(isBlocked).mockResolvedValue(true as never);
      await expect(ListItemsSection(props('l1'))).rejects.toThrow(
        'REDIRECT:/lists'
      );
    });
  });
});
