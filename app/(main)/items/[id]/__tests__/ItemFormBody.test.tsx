import { ROLES } from '@/lib/data/profile.roles';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getItemById } from '@/lib/data/item';
import { getListsByProfile } from '@/lib/data/list';
import { authedIdentity } from '@/lib/data/user.session';
import ItemFormBody from '../ItemFormBody';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';

vi.mock('@/lib/data/item', () => ({
  getItemById: vi.fn(),
}));
vi.mock('@/lib/data/list', () => ({
  getListsByProfile: vi.fn(),
}));
vi.mock('@/lib/data/user.session', () => ({ authedIdentity: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/(main)/items/ui/components/itemform/ItemFormContainer', () => ({
  default: (p: {
    item: { id: string };
    lists: unknown[];
    returnTo?: string;
    deleteDisabled?: boolean;
  }) => (
    <div
      data-testid="item-form"
      data-item-id={p.item.id}
      data-lists-count={String(p.lists.length)}
      data-return-to={p.returnTo ?? ''}
      data-delete-disabled={String(!!p.deleteDisabled)}
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
  vi.mocked(authedIdentity).mockResolvedValue(
    makeIdentity('u1', makeProfile('p1', 'Owner'))
  );
  vi.mocked(getItemById).mockResolvedValue({ id: 'i1', name: 'Gift' } as never);
  vi.mocked(getListsByProfile).mockResolvedValue([
    { id: 'l1' },
    { id: 'l2' },
  ] as never);
});

describe('ItemFormBody', () => {
  describe('Guards', () => {
    it('Unauthenticated_RedirectsToRoot', async () => {
      vi.mocked(authedIdentity).mockResolvedValue(null);
      await expect(ItemFormBody(props())).rejects.toThrow('REDIRECT:/');
      expect(getItemById).not.toHaveBeenCalled();
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
    it('LoadsItem_ForwardsItemListsProfileAndSanitizedReturnTo', async () => {
      render(await ItemFormBody(props('i1', { returnTo: '/lists/l1' })));
      expect(getItemById).toHaveBeenCalledWith('i1', 'p1');
      expect(getListsByProfile).toHaveBeenCalledWith('p1');
      const form = screen.getByTestId('item-form');
      expect(form).toHaveAttribute('data-item-id', 'i1');
      expect(form).toHaveAttribute('data-lists-count', '2');
      expect(form).toHaveAttribute('data-return-to', '/lists/l1');
    });

    it('Owner_DeleteNotDisabled', async () => {
      render(await ItemFormBody(props()));
      expect(screen.getByTestId('item-form')).toHaveAttribute(
        'data-delete-disabled',
        'false'
      );
    });
  });

  describe('Manager', () => {
    beforeEach(() => {
      vi.mocked(authedIdentity).mockResolvedValue(
        makeIdentity(
          'mgr-1',
          makeProfile('mgr-self'),
          makeProfile('p1', 'Owner', ROLES.manager)
        )
      );
    });

    it('Manager_DeleteDisabledPassedToForm', async () => {
      render(await ItemFormBody(props()));
      const form = screen.getByTestId('item-form');
      expect(form).toHaveAttribute('data-delete-disabled', 'true');
    });
  });
});
