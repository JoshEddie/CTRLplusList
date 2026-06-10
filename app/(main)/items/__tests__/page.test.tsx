import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth';
import { getItemsByUser } from '@/lib/data/item';
import { getListsByUser } from '@/lib/data/list';
import { getUserIdByEmail } from '@/lib/data/user';
import Home from '../page';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/user', () => ({
  getUserIdByEmail: vi.fn(),
}));
vi.mock('@/lib/data/item', () => ({
  getItemsByUser: vi.fn(),
}));
vi.mock('@/lib/data/list', () => ({
  getListsByUser: vi.fn(),
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
    user_id?: string;
    user_name?: string | null;
    lists?: unknown[];
    initialPageSize?: number;
  }) => (
    <div
      data-testid="items-page"
      data-active-count={props.items.length}
      data-archived-count={props.archivedItems?.length ?? 0}
      data-initial-page-size={String(props.initialPageSize)}
      data-user-id={props.user_id ?? ''}
      data-user-name={props.user_name ?? ''}
      data-lists-count={props.lists?.length ?? 0}
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
  cookieHolder.value = undefined;
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'viewer',
    name: 'Test Viewer',
  } as never);
  vi.mocked(getItemsByUser).mockImplementation(
    async (_id: string, opts?: { filter?: string }) =>
      (opts?.filter === 'archived' ? ARCHIVED : ACTIVE) as never
  );
  vi.mocked(getListsByUser).mockResolvedValue([
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

    it('ViewerResolved_RendersMainItemsLibraryWrappingItemsPage', async () => {
      render(await callPage());
      const main = screen.getByRole('main');
      expect(main).toHaveClass('container', 'container--items-library');
      expect(main).toContainElement(screen.getByTestId('items-page'));
    });
  });

  describe('SpoilerParam', () => {
    it('PurchasesReveal_ReadsWithShowSpoilersTrue', async () => {
      await callPage({ purchases: 'reveal' });
      expect(getItemsByUser).toHaveBeenCalledWith('viewer', {
        filter: 'active',
        showSpoilers: true,
      });
      expect(getItemsByUser).toHaveBeenCalledWith('viewer', {
        filter: 'archived',
        showSpoilers: true,
      });
    });

    it('PurchasesOnly_ReadsWithShowSpoilersTrue', async () => {
      await callPage({ purchases: 'only' });
      expect(getItemsByUser).toHaveBeenCalledWith('viewer', {
        filter: 'active',
        showSpoilers: true,
      });
    });

    it('PurchasesHide_ReadsWithShowSpoilersFalse', async () => {
      await callPage({ purchases: 'hide' });
      expect(getItemsByUser).toHaveBeenCalledWith('viewer', {
        filter: 'active',
        showSpoilers: false,
      });
    });

    it('PurchasesAbsent_ReadsWithShowSpoilersFalse', async () => {
      await callPage();
      expect(getItemsByUser).toHaveBeenCalledWith('viewer', {
        filter: 'archived',
        showSpoilers: false,
      });
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
      expect(getItemsByUser).toHaveBeenCalledWith(
        'viewer',
        expect.objectContaining({ filter: 'active' })
      );
      expect(getItemsByUser).toHaveBeenCalledWith(
        'viewer',
        expect.objectContaining({ filter: 'archived' })
      );
      const stub = screen.getByTestId('items-page');
      expect(stub).toHaveAttribute('data-active-count', '2');
      expect(stub).toHaveAttribute('data-archived-count', '1');
    });
  });

  describe('ViewerDisplay', () => {
    it('TwoTokenName_DerivesFirstAndLastInitial', async () => {
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-user-name',
        'Test V'
      );
    });

    it('OneTokenName_UsesFirstToken', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue({
        id: 'viewer',
        name: 'Madonna',
      } as never);
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-user-name',
        'Madonna'
      );
    });

    it('NoName_DerivesEmpty', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue({
        id: 'viewer',
        name: null,
      } as never);
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-user-name',
        ''
      );
    });

    it('Render_ForwardsListsToItemsPage', async () => {
      render(await callPage());
      expect(screen.getByTestId('items-page')).toHaveAttribute(
        'data-lists-count',
        '3'
      );
      expect(getListsByUser).toHaveBeenCalledWith('viewer');
    });
  });
});
