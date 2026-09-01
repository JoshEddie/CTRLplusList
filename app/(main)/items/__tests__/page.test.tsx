import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth';
import { getItemsByProfile } from '@/lib/data/item';
import { getListsByProfile } from '@/lib/data/list';
import { getUserIdentity } from '@/lib/data/profile';
import { getSpoilerBaseline } from '@/lib/data/profile.members';
import { getUserIdByEmail } from '@/lib/data/user';
import { PROTECTED_TIER } from '@/lib/spoilers';
import Home from '../page';
import { makeProfile } from '@/test/helpers/profile';

vi.mock('@/lib/data/profile.active', () => ({ actingAsName: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/user', () => ({
  getUserIdByEmail: vi.fn(),
}));
vi.mock('@/lib/data/profile', () => ({
  getUserIdentity: vi.fn(),
}));
vi.mock('@/lib/data/profile.members', () => ({
  getSpoilerBaseline: vi.fn(),
}));
vi.mock('@/lib/data/item', () => ({
  getItemsByProfile: vi.fn(),
}));
vi.mock('@/lib/data/list', () => ({
  getListsByProfile: vi.fn(),
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const cookieHolder = vi.hoisted(() => ({
  value: undefined as string | undefined,
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === 'items_page_size' && cookieHolder.value !== undefined
        ? { value: cookieHolder.value }
        : undefined,
  })),
}));

vi.mock('../ui/components/ItemsPage', () => ({
  default: (props: {
    items: unknown[];
    archivedItems?: unknown[];
    actor?: { id: string };
    user_name?: string | null;
    lists?: unknown[];
    initialPageSize?: number;
    tier?: string;
    baseline?: string;
  }) => (
    <div
      data-testid="items-page"
      data-active-count={props.items.length}
      data-archived-count={props.archivedItems?.length ?? 0}
      data-initial-page-size={String(props.initialPageSize)}
      data-profile-id={props.actor?.id ?? ''}
      data-user-name={props.user_name ?? ''}
      data-lists-count={props.lists?.length ?? 0}
      data-tier={String(props.tier)}
      data-baseline={String(props.baseline)}
    />
  ),
}));

const ACTIVE = [{ id: 'a1' }, { id: 'a2' }];
const ARCHIVED = [{ id: 'r1' }];

function callPage(
  params: { [key: string]: string | string[] | undefined } = {}
) {
  return Home({ searchParams: Promise.resolve(params) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSpoilerBaseline).mockResolvedValue(PROTECTED_TIER);
  cookieHolder.value = undefined;
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'viewer',
    name: 'Test Viewer',
  } as never);
  vi.mocked(getUserIdentity).mockResolvedValue({
    userId: 'viewer',
    selfProfile: makeProfile('viewer-profile', 'Test Viewer'),
    activeProfile: makeProfile('viewer-profile', 'Test Viewer'),
  });
  vi.mocked(getItemsByProfile).mockImplementation(
    async (_id: string, opts?: { filter?: string }) =>
      (opts?.filter === 'archived' ? ARCHIVED : ACTIVE) as never
  );
  vi.mocked(getListsByProfile).mockResolvedValue([
    { id: 'l1' },
    { id: 'l2' },
    { id: 'l3' },
  ] as never);
});

describe('Page', () => {
  describe('AuthGuard', () => {
    it('NoSessionEmail_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      await expect(callPage()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getUserIdByEmail).not.toHaveBeenCalled();
    });

    it('EmailResolvesToNoUser_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null);
      await expect(callPage()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
    });

    it('UserHasNoProfile_RedirectsToRoot', async () => {
      vi.mocked(getUserIdentity).mockResolvedValue(null);
      await expect(callPage()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getItemsByProfile).not.toHaveBeenCalled();
    });

    it('ViewerResolved_RendersMainItemsLibraryWrappingItemsPage', async () => {
      render(await callPage());
      const main = screen.getByRole('main');
      expect(main).toHaveClass('container', 'container--items-library');
      expect(main).toContainElement(screen.getByTestId('items-page'));
    });

    it('ViewerResolved_ForwardsActingProfileId', async () => {
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-profile-id',
        'viewer-profile'
      );
    });

    it('ActingAsAManagedProfile_ReadsThatProfileButNamesTheHuman', async () => {
      vi.mocked(getUserIdentity).mockResolvedValue({
        userId: 'viewer',
        selfProfile: makeProfile('viewer-profile', 'Test Viewer'),
        activeProfile: makeProfile('kiddo', 'Kiddo Smith'),
      });

      render(await callPage());

      expect(getItemsByProfile).toHaveBeenCalledWith('kiddo', {
        filter: 'active',
        tier: PROTECTED_TIER,
      });
      expect(getListsByProfile).toHaveBeenCalledWith('kiddo');
      const page = screen.getByTestId('items-page');
      expect(page).toHaveAttribute('data-profile-id', 'kiddo');
      expect(page).toHaveAttribute('data-user-name', 'Test Viewer');
    });
  });

  describe('SpoilerTier', () => {
    it('Render_ResolvesFromTheMembershipOnTheActingProfile', async () => {
      await callPage();
      expect(getSpoilerBaseline).toHaveBeenCalledWith(
        'viewer',
        'viewer-profile'
      );
      expect(getItemsByProfile).toHaveBeenCalledWith('viewer-profile', {
        filter: 'active',
        tier: PROTECTED_TIER,
      });
      expect(getItemsByProfile).toHaveBeenCalledWith('viewer-profile', {
        filter: 'archived',
        tier: PROTECTED_TIER,
      });
    });

    it('NoSpoilerParam_ForwardsBaselineTierAndBaselineToItemsPage', async () => {
      render(await callPage());
      const page = screen.getByTestId('items-page');
      expect(page).toHaveAttribute('data-tier', PROTECTED_TIER);
      expect(page).toHaveAttribute('data-baseline', PROTECTED_TIER);
    });

    it('SpoilerParam_RaisesTheTierForThisRequestAlone', async () => {
      await callPage({ spoiler: 'claims' });
      expect(getItemsByProfile).toHaveBeenCalledWith('viewer-profile', {
        filter: 'active',
        tier: 'claims',
      });
    });

    it('SpoilerParam_ForwardsRaisedTierButUnchangedBaselineToItemsPage', async () => {
      render(await callPage({ spoiler: 'claims' }));
      const page = screen.getByTestId('items-page');
      expect(page).toHaveAttribute('data-tier', 'claims');
      expect(page).toHaveAttribute('data-baseline', PROTECTED_TIER);
    });
  });

  describe('PageSizeCookie', () => {
    it('ValidOptionCookie_SeedsInitialPageSize', async () => {
      cookieHolder.value = '48';
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-initial-page-size',
        '48'
      );
    });

    it('OffListCookie_NormalizesToDefault24', async () => {
      cookieHolder.value = '7';
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-initial-page-size',
        '24'
      );
    });

    it('AbsentCookie_NormalizesToDefault24', async () => {
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-initial-page-size',
        '24'
      );
    });
  });

  describe('DualLoad', () => {
    it('Render_ReadsAndForwardsActiveAndArchivedSets', async () => {
      render(await callPage());
      expect(getItemsByProfile).toHaveBeenCalledWith(
        'viewer-profile',
        expect.objectContaining({ filter: 'active' })
      );
      expect(getItemsByProfile).toHaveBeenCalledWith(
        'viewer-profile',
        expect.objectContaining({ filter: 'archived' })
      );
      const stub = screen.getByTestId('items-page');
      expect(stub).toHaveAttribute('data-active-count', '2');
      expect(stub).toHaveAttribute('data-archived-count', '1');
    });
  });

  describe('ViewerDisplay', () => {
    it('SelfProfileName_ReachesTheChildInFull', async () => {
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-user-name',
        'Test Viewer'
      );
    });

    it('Render_ForwardsListsToItemsPage', async () => {
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-lists-count',
        '3'
      );
      expect(getListsByProfile).toHaveBeenCalledWith('viewer-profile');
    });
  });
});
