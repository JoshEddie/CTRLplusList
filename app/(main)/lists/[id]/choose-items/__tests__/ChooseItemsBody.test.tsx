import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getItemsByUser } from '@/lib/data/item';
import { getList, getListsByUser } from '@/lib/data/list';
import { getUserIdByEmail } from '@/lib/data/user';
import ChooseItemsBody from '../ChooseItemsBody';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/item', () => ({ getItemsByUser: vi.fn() }));
vi.mock('@/lib/data/list', () => ({
  getList: vi.fn(),
  getListsByUser: vi.fn(),
}));
vi.mock('@/lib/data/user', () => ({ getUserIdByEmail: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const membership = vi.hoisted(() => ({ rows: [] as { item_id: string }[] }));
vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => Promise.resolve(membership.rows) }),
    }),
  },
}));

vi.mock('../ChooseItemsForm', () => ({
  default: (p: {
    list_id: string;
    list_name: string;
    items: { id: string }[];
    initialSelectedIds: string[];
    isNew: boolean;
    user_id: string;
    lists: unknown[];
  }) => (
    <div
      data-testid="choose-form"
      data-list-id={p.list_id}
      data-list-name={p.list_name}
      data-item-ids={p.items.map((i) => i.id).join(',')}
      data-selected={p.initialSelectedIds.join(',')}
      data-is-new={String(p.isNew)}
      data-user-id={p.user_id}
      data-lists-count={String(p.lists.length)}
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
  membership.rows = [];
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'owner@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'u1',
    name: 'Owner',
  } as never);
  vi.mocked(getList).mockResolvedValue({
    id: 'l1',
    name: 'My List',
    user_id: 'u1',
  } as never);
  vi.mocked(getItemsByUser).mockResolvedValue([
    { id: 'a1', name: 'Active', archived_at: null },
    { id: 'a2', name: 'ArchivedOff', archived_at: new Date() },
    { id: 'a3', name: 'ArchivedOn', archived_at: new Date() },
  ] as never);
  vi.mocked(getListsByUser).mockResolvedValue([
    { id: 'l1' },
    { id: 'l2' },
  ] as never);
});

describe('ChooseItemsBody', () => {
  describe('Guards', () => {
    it('Unauthenticated_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      await expect(ChooseItemsBody(props())).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
    });

    it('NoUser_RedirectsToLists', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null as never);
      await expect(ChooseItemsBody(props())).rejects.toThrow('REDIRECT:/lists');
    });

    it('NoList_RedirectsToLists', async () => {
      vi.mocked(getList).mockResolvedValue(null as never);
      await expect(ChooseItemsBody(props())).rejects.toThrow('REDIRECT:/lists');
    });

    it('NonOwner_RedirectsToListDetail', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        name: 'My List',
        user_id: 'someone-else',
      } as never);
      await expect(ChooseItemsBody(props('l1'))).rejects.toThrow(
        'REDIRECT:/lists/l1'
      );
    });
  });

  describe('Owner', () => {
    it('LoadsActiveAndArchivedOnList_ForwardsMembershipAndProps', async () => {
      membership.rows = [{ item_id: 'a3' }];
      render(await ChooseItemsBody(props('l1')));
      expect(getItemsByUser).toHaveBeenCalledWith('u1', { filter: 'all' });
      const form = screen.getByTestId('choose-form');
      // a2 (archived, not on list) filtered out; a1 (active) + a3 (archived but on list) kept.
      expect(form).toHaveAttribute('data-item-ids', 'a1,a3');
      expect(form).toHaveAttribute('data-selected', 'a3');
      expect(form).toHaveAttribute('data-list-id', 'l1');
      expect(form).toHaveAttribute('data-list-name', 'My List');
      expect(form).toHaveAttribute('data-user-id', 'u1');
      expect(form).toHaveAttribute('data-lists-count', '2');
      expect(form).toHaveAttribute('data-is-new', 'false');
    });

    it('NewFlag_ForwardsIsNewTrue', async () => {
      render(await ChooseItemsBody(props('l1', { new: '1' })));
      expect(screen.getByTestId('choose-form')).toHaveAttribute(
        'data-is-new',
        'true'
      );
    });
  });
});
