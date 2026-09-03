import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAXIMAL_TIER } from '@/lib/spoilers';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { auth } from '@/lib/auth';
import { getItemsByListId, getItemsByProfile } from '@/lib/data/item';
import { getUserIdentity } from '@/lib/data/profile';
import { getUserIdByEmail } from '@/lib/data/user';
import ItemsContainer from '../ItemsContainer';
import { makeProfile } from '@/test/helpers/profile';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/profile', () => ({ getUserIdentity: vi.fn() }));
vi.mock('@/lib/data/user', () => ({
  getUserIdByEmail: vi.fn(),
}));
vi.mock('@/lib/data/item', () => ({
  getItemsByProfile: vi.fn(),
  getItemsByListId: vi.fn(),
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const cookieHolder = vi.hoisted(() => ({
  store: new Map<string, string>(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = cookieHolder.store.get(name);
      return value === undefined ? undefined : { value };
    },
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
      data-items={JSON.stringify(props.items)}
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
  cookieHolder.store.clear();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'viewer',
    name: 'Test Viewer',
  } as never);
  vi.mocked(getUserIdentity).mockResolvedValue({
    userId: 'viewer',
    selfProfile: makeProfile('self-viewer', 'Test Viewer'),
    activeProfile: makeProfile('self-viewer', 'Test Viewer'),
  });
  vi.mocked(getItemsByProfile).mockResolvedValue(VIEWER_ITEMS as never);
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
      expect(getItemsByProfile).toHaveBeenCalledWith('self-viewer');
      expect(getItemsByListId).not.toHaveBeenCalled();
      expect(screen.getByTestId('items')).toHaveAttribute(
        'data-item-count',
        '1'
      );
    });
  });

  describe('ListBranch', () => {
    it('ListIdWithViewerAndTier_ReadsListScopedWithBoth', async () => {
      cookieHolder.store.set('items_page_size', '48');
      render(
        await ItemsContainer({
          listId: 'list1',
          viewerSelfProfileId: 'v2',
          tier: MAXIMAL_TIER,
        })
      );
      expect(getItemsByListId).toHaveBeenCalledWith('list1', {
        viewerSelfProfileId: 'v2',
        tier: MAXIMAL_TIER,
        isOwner: undefined,
        heldClaimIds: undefined,
      });
      const browser = screen.getByTestId('items-browser');
      expect(browser).toHaveAttribute('data-mode', 'list');
      expect(browser).toHaveAttribute('data-item-count', '2');
      expect(browser).toHaveAttribute('data-initial-page-size', '48');
    });

    it('ListIdNoTier_DefaultsViewerToTheSelfProfile', async () => {
      render(await ItemsContainer({ listId: 'list1' }));
      expect(getItemsByListId).toHaveBeenCalledWith('list1', {
        viewerSelfProfileId: 'self-viewer',
        tier: undefined,
        isOwner: undefined,
        heldClaimIds: undefined,
      });
      expect(getItemsByProfile).not.toHaveBeenCalled();
    });
  });

  describe('OwnerFlag', () => {
    it('IsOwnerTrue_ForwardsIsOwnerToTheListRead', async () => {
      render(
        await ItemsContainer({
          listId: 'list1',
          isOwner: true,
          tier: MAXIMAL_TIER,
        })
      );
      expect(getItemsByListId).toHaveBeenCalledWith('list1', {
        viewerSelfProfileId: 'self-viewer',
        tier: MAXIMAL_TIER,
        isOwner: true,
        heldClaimIds: undefined,
      });
    });
  });

  describe('ListBranchUnauthenticated', () => {
    it('ListIdNoViewer_DoesNotRedirectReadsWithNoViewerProfileId', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      render(await ItemsContainer({ listId: 'list1' }));
      expect(redirectMock).not.toHaveBeenCalled();
      expect(getItemsByListId).toHaveBeenCalledWith('list1', {
        viewerSelfProfileId: undefined,
        tier: undefined,
        isOwner: undefined,
        heldClaimIds: undefined,
      });
    });
  });

  describe('GuestClaimOverlay', () => {
    const CLAIMED_LIST_ITEMS = [
      {
        id: 'i1',
        purchases: [
          { id: 'p1', by: 'other', name: 'Gifty', claimedByViewer: false },
          {
            id: 'p2',
            by: 'other',
            name: 'Someone',
            claimedByViewer: false,
          },
        ],
      },
    ];

    beforeEach(() => {
      vi.mocked(getItemsByListId).mockResolvedValue(
        CLAIMED_LIST_ITEMS as never
      );
      cookieHolder.store.set(
        'guest_claims',
        JSON.stringify({ id: 'g1', name: 'Gifty', purchases: ['p1'] })
      );
    });

    it('SessionlessWithCookie_MarksCookieListedClaimsAsViewerOwn', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);
      render(await ItemsContainer({ listId: 'list1' }));
      const items = JSON.parse(
        screen.getByTestId('items-browser').getAttribute('data-items') as string
      );
      expect(items[0].purchases).toEqual([
        { id: 'p1', by: 'self', name: 'Gifty', claimedByViewer: true },
        { id: 'p2', by: 'other', name: 'Someone', claimedByViewer: false },
      ]);
    });

    // The cookie is a guest's only handle on their own claims (ADR-0008), so
    // it is also what tells a soft-removed entry they hold apart from one they
    // may not see — and the read needs it BEFORE it decides which rows to
    // return, not after.
    it('SessionlessWithCookie_ForwardsTheCookiesClaimIdsAsHeldClaimIds', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);
      render(await ItemsContainer({ listId: 'list1' }));
      expect(getItemsByListId).toHaveBeenCalledWith('list1', {
        viewerSelfProfileId: undefined,
        tier: undefined,
        isOwner: undefined,
        heldClaimIds: ['p1'],
      });
    });

    it('AuthedWithLeftoverCookie_LeavesClaimsUntouched', async () => {
      render(await ItemsContainer({ listId: 'list1' }));
      const items = JSON.parse(
        screen.getByTestId('items-browser').getAttribute('data-items') as string
      );
      expect(items).toEqual(CLAIMED_LIST_ITEMS);
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
    it('SelfProfileName_ReachesTheChildInFull', async () => {
      render(await ItemsContainer({}));
      expect(screen.getByTestId('items')).toHaveAttribute(
        'data-user-name',
        'Test Viewer'
      );
    });
  });
});
