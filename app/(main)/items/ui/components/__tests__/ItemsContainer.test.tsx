import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAXIMAL_TIER } from '@/lib/spoilers';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { auth } from '@/lib/auth';
import { getItemsByListId } from '@/lib/data/item';
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
  getItemsByListId: vi.fn(),
}));

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

type El = { type: unknown; props: Record<string, unknown> };

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
  vi.mocked(getItemsByListId).mockResolvedValue(LIST_ITEMS as never);
});

describe('ItemsContainer', () => {
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
      });
    });
  });

  describe('ListBranchUnauthenticated', () => {
    it('ListIdNoViewer_ReadsWithNoViewerProfileId', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      render(await ItemsContainer({ listId: 'list1' }));
      expect(getItemsByListId).toHaveBeenCalledWith('list1', {
        viewerSelfProfileId: undefined,
        tier: undefined,
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

    it('AuthedWithLeftoverCookie_LeavesClaimsUntouched', async () => {
      render(await ItemsContainer({ listId: 'list1' }));
      const items = JSON.parse(
        screen.getByTestId('items-browser').getAttribute('data-items') as string
      );
      expect(items).toEqual(CLAIMED_LIST_ITEMS);
    });
  });

  describe('Suspense', () => {
    it('ListBranch_FallbackIsPageLoadingIndicator', async () => {
      const tree = (await ItemsContainer({ listId: 'list1' })) as unknown as El;
      expect(tree.type).toBe(Suspense);
      const fallback = tree.props.fallback as El;
      expect(fallback.type).toBe(LoadingIndicator);
      expect(fallback.props.size).toBe('page');
    });
  });

  describe('ViewerDisplay', () => {
    it('SelfProfileName_ReachesTheChildInFull', async () => {
      render(await ItemsContainer({ listId: 'list1' }));
      expect(screen.getByTestId('items-browser')).toHaveAttribute(
        'data-user-name',
        'Test Viewer'
      );
    });
  });
});
