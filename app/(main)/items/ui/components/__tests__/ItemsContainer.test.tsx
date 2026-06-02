import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { auth } from '@/lib/auth';
import { getItemsByListId, getItemsByUser, getUserIdByEmail } from '@/lib/dal';
import ItemsContainer from '../ItemsContainer';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/dal', () => ({
  getUserIdByEmail: vi.fn(),
  getItemsByUser: vi.fn(),
  getItemsByListId: vi.fn(),
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const cookieHolder = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === 'items_page_size' && cookieHolder.value !== undefined
        ? { value: cookieHolder.value }
        : undefined,
  })),
}));

vi.mock('../ItemsBrowser', () => ({
  default: (props: {
    mode: string;
    items: unknown[];
    initialPageSize?: number;
    user_name?: string | null;
  }) => (
    <div
      data-testid="items-browser"
      data-mode={props.mode}
      data-item-count={props.items.length}
      data-initial-page-size={String(props.initialPageSize)}
      data-user-name={props.user_name ?? ''}
    />
  ),
}));
vi.mock('../Items', () => ({
  default: (props: { items: unknown[]; user_name?: string | null }) => (
    <div
      data-testid="items"
      data-item-count={props.items.length}
      data-user-name={props.user_name ?? ''}
    />
  ),
}));

type El = { type: unknown; props: Record<string, unknown> };

const VIEWER_ITEMS = [{ id: 'u1' }];
const LIST_ITEMS = [{ id: 'li1' }, { id: 'li2' }];

beforeEach(() => {
  vi.clearAllMocks();
  cookieHolder.value = undefined;
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'viewer',
    name: 'Test Viewer',
  } as never);
  vi.mocked(getItemsByUser).mockResolvedValue(VIEWER_ITEMS as never);
  vi.mocked(getItemsByListId).mockResolvedValue(LIST_ITEMS as never);
});

describe('ItemsContainer', () => {
  describe('AuthGuard', () => {
    it('NoListIdAndNoUser_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      await expect(ItemsContainer({})).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
    });
  });

  describe('LibraryBranch', () => {
    it('NoListId_ReadsViewerItemsAndRendersItemsInsideSuspense', async () => {
      const tree = (await ItemsContainer({})) as unknown as El;
      expect(tree.type).toBe(Suspense);
      render(tree as never);
      expect(getItemsByUser).toHaveBeenCalledWith('viewer');
      expect(getItemsByListId).not.toHaveBeenCalled();
      expect(screen.getByTestId('items')).toHaveAttribute(
        'data-item-count',
        '1'
      );
    });
  });

  describe('ListBranch', () => {
    it('ListIdWithViewerOwnerSpoiler_ReadsListScopedWithThoseFlags', async () => {
      cookieHolder.value = '48';
      render(
        await ItemsContainer({
          listId: 'list1',
          isListOwner: true,
          viewerId: 'v2',
          showSpoilers: true,
        })
      );
      expect(getItemsByListId).toHaveBeenCalledWith('list1', {
        viewerId: 'v2',
        isOwner: true,
        showSpoilers: true,
      });
      const browser = screen.getByTestId('items-browser');
      expect(browser).toHaveAttribute('data-mode', 'list');
      expect(browser).toHaveAttribute('data-item-count', '2');
      expect(browser).toHaveAttribute('data-initial-page-size', '48');
    });

    it('ListIdNoFlags_DefaultsViewerToUserOwnerFalseSpoilerFalse', async () => {
      render(await ItemsContainer({ listId: 'list1' }));
      expect(getItemsByListId).toHaveBeenCalledWith('list1', {
        viewerId: 'viewer',
        isOwner: false,
        showSpoilers: false,
      });
      expect(getItemsByUser).not.toHaveBeenCalled();
    });
  });

  describe('ListBranchUnauthenticated', () => {
    it('ListIdNoViewer_DoesNotRedirectReadsWithNoViewerId', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      render(await ItemsContainer({ listId: 'list1' }));
      expect(redirectMock).not.toHaveBeenCalled();
      expect(getItemsByListId).toHaveBeenCalledWith('list1', {
        viewerId: undefined,
        isOwner: false,
        showSpoilers: false,
      });
    });
  });

  describe('Suspense', () => {
    it('LibraryBranch_FallbackIsPageLoadingIndicator', async () => {
      const tree = (await ItemsContainer({})) as unknown as El;
      expect(tree.type).toBe(Suspense);
      const fallback = tree.props.fallback as El;
      expect(fallback.type).toBe(LoadingIndicator);
      expect(fallback.props.size).toBe('page');
    });
  });

  describe('ViewerDisplay', () => {
    it('FirstLastInitial_ReachesChild', async () => {
      render(await ItemsContainer({}));
      expect(screen.getByTestId('items')).toHaveAttribute(
        'data-user-name',
        'Test V'
      );
    });
  });
});
