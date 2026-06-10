import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getItemById } from '@/lib/data/item';
import { getListsByUser } from '@/lib/data/list';
import { getUserIdByEmail } from '@/lib/data/user';
import ItemFormBody from '../ItemFormBody';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/item', () => ({
  getItemById: vi.fn(),
}));
vi.mock('@/lib/data/list', () => ({
  getListsByUser: vi.fn(),
}));
vi.mock('@/lib/data/user', () => ({
  getUserIdByEmail: vi.fn(),
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/(main)/items/ui/components/itemform/ItemForm', () => ({
  default: (p: {
    user_id: string;
    item: { id: string };
    lists: unknown[];
    returnTo?: string;
  }) => (
    <div
      data-testid="item-form"
      data-user-id={p.user_id}
      data-item-id={p.item.id}
      data-lists-count={String(p.lists.length)}
      data-return-to={p.returnTo ?? ''}
    />
  ),
}));

function props(id = 'i1', sp: { returnTo?: string } = {}) {
  return {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(sp),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'owner@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({
    id: 'u1',
    name: 'Owner',
  } as never);
  vi.mocked(getItemById).mockResolvedValue({ id: 'i1', name: 'Gift' } as never);
  vi.mocked(getListsByUser).mockResolvedValue([
    { id: 'l1' },
    { id: 'l2' },
  ] as never);
});

describe('ItemFormBody', () => {
  describe('Guards', () => {
    it('Unauthenticated_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      await expect(ItemFormBody(props())).rejects.toThrow('REDIRECT:/');
    });

    it('NoUser_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null as never);
      await expect(ItemFormBody(props())).rejects.toThrow('REDIRECT:/');
    });

    it('NoItemNoReturnTo_RedirectsToItems', async () => {
      vi.mocked(getItemById).mockResolvedValue(null as never);
      await expect(ItemFormBody(props())).rejects.toThrow('REDIRECT:/items');
    });

    it('NoItemValidReturnTo_RedirectsToReturnTo', async () => {
      vi.mocked(getItemById).mockResolvedValue(null as never);
      await expect(
        ItemFormBody(props('i1', { returnTo: '/lists/l1' }))
      ).rejects.toThrow('REDIRECT:/lists/l1');
    });

    it.each(['//evil.example', 'https://evil.example', '/a\\b', 'evil'])(
      'NoItemUnsafeReturnTo%#_RedirectsToItems',
      async (returnTo) => {
        vi.mocked(getItemById).mockResolvedValue(null as never);
        await expect(ItemFormBody(props('i1', { returnTo }))).rejects.toThrow(
          'REDIRECT:/items'
        );
      }
    );
  });

  describe('Owner', () => {
    it('LoadsItem_ForwardsItemListsUserAndSanitizedReturnTo', async () => {
      render(await ItemFormBody(props('i1', { returnTo: '/lists/l1' })));
      expect(getItemById).toHaveBeenCalledWith('i1', 'u1');
      const form = screen.getByTestId('item-form');
      expect(form).toHaveAttribute('data-item-id', 'i1');
      expect(form).toHaveAttribute('data-user-id', 'u1');
      expect(form).toHaveAttribute('data-lists-count', '2');
      expect(form).toHaveAttribute('data-return-to', '/lists/l1');
    });
  });
});
