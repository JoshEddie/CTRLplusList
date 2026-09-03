import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getItemsByProfile } from '@/lib/data/item';
import { getList, getListsByProfile } from '@/lib/data/list';
import { getUserIdentity } from '@/lib/data/profile';
import { getUserIdByEmail } from '@/lib/data/user';
import ChooseItemsBody from '../ChooseItemsBody';
import { makeProfile } from '@/test/helpers/profile';

vi.mock('@/lib/data/profile.active', () => ({ actingAsName: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/item', () => ({ getItemsByProfile: vi.fn() }));
vi.mock('@/lib/data/list', () => ({
  getList: vi.fn(),
  getListsByProfile: vi.fn(),
}));
vi.mock('@/lib/data/profile', () => ({ getUserIdentity: vi.fn() }));
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
    items: Record<string, unknown>[];
    initialSelectedIds: string[];
    isNew: boolean;
    actor: { id: string };
    lists: unknown[];
  }) => (
    <div
      data-testid="choose-form"
      data-list-id={p.list_id}
      data-list-name={p.list_name}
      data-item-ids={p.items.map((i) => i.id).join(',')}
      data-claim-keys={p.items
        .flatMap((i) => Object.keys(i))
        .filter((k) => k === 'purchases' || k === 'hasPurchases')
        .join(',')}
      data-selected={p.initialSelectedIds.join(',')}
      data-is-new={String(p.isNew)}
      data-profile-id={p.actor.id}
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
  vi.mocked(getUserIdentity).mockResolvedValue({
    userId: 'u1',
    selfProfile: makeProfile('p1', 'Owner'),
    activeProfile: makeProfile('p1', 'Owner'),
  });
  vi.mocked(getList).mockResolvedValue({
    id: 'l1',
    name: 'My List',
    profile_id: 'p1',
  } as never);
  vi.mocked(getItemsByProfile).mockResolvedValue([
    {
      id: 'a1',
      name: 'Active',
      archived_at: null,
      hasPurchases: true,
      // Both shapes the read can hand back: another party's claim, and one the
      // owner holds themselves — which no tier would have withheld.
      purchases: [
        { id: 'c1', by: 'other', claimedByViewer: false },
        { id: 'c2', by: 'self', name: 'Owner', claimedByViewer: true },
      ],
    },
    { id: 'a2', name: 'ArchivedOff', archived_at: new Date() },
    {
      id: 'a3',
      name: 'ArchivedOn',
      archived_at: new Date(),
      hasPurchases: false,
      purchases: [],
    },
  ] as never);
  vi.mocked(getListsByProfile).mockResolvedValue([
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

    it('NoProfile_RedirectsToLists', async () => {
      vi.mocked(getUserIdentity).mockResolvedValue(null);
      await expect(ChooseItemsBody(props())).rejects.toThrow('REDIRECT:/lists');
      expect(getItemsByProfile).not.toHaveBeenCalled();
    });

    it('NoList_RedirectsToLists', async () => {
      vi.mocked(getList).mockResolvedValue(null as never);
      await expect(ChooseItemsBody(props())).rejects.toThrow('REDIRECT:/lists');
    });

    it('NonOwner_RedirectsToListDetail', async () => {
      vi.mocked(getList).mockResolvedValue({
        id: 'l1',
        name: 'My List',
        profile_id: 'someone-else',
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
      expect(getItemsByProfile).toHaveBeenCalledWith('p1', { filter: 'all' });
      const form = screen.getByTestId('choose-form');
      // a2 (archived, not on list) filtered out; a1 (active) + a3 (archived but on list) kept.
      expect(form).toHaveAttribute('data-item-ids', 'a1,a3');
      expect(form).toHaveAttribute('data-selected', 'a3');
      expect(form).toHaveAttribute('data-list-id', 'l1');
      expect(form).toHaveAttribute('data-list-name', 'My List');
      expect(form).toHaveAttribute('data-profile-id', 'p1');
      expect(form).toHaveAttribute('data-lists-count', '2');
      expect(form).toHaveAttribute('data-is-new', 'false');
    });

    it('ItemsCarryingClaims_ForwardsNoPurchaseKeys', async () => {
      membership.rows = [{ item_id: 'a3' }];
      render(await ChooseItemsBody(props('l1')));
      const form = screen.getByTestId('choose-form');
      // Anchors the empty claim keys below: no rows forwarded produces the
      // same empty string, so the absence has to be read against a payload
      // that carried the claims to begin with.
      expect(form).toHaveAttribute('data-item-ids', 'a1,a3');
      expect(form).toHaveAttribute('data-claim-keys', '');
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
