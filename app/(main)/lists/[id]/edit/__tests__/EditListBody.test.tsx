import { ROLES } from '@/lib/data/profile.roles';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getList } from '@/lib/data/list';
import { authedIdentity } from '@/lib/data/user.session';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import EditListBody from '../EditListBody';

vi.mock('@/lib/data/list', () => ({ getList: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedIdentity: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/(main)/lists/ui/components/ListForm', () => ({
  default: (p: {
    list?: { id: string };
    isEditing?: boolean;
    deleteDisabled?: boolean;
  }) => (
    <div
      data-testid="list-form"
      data-list-id={p.list?.id ?? ''}
      data-editing={String(!!p.isEditing)}
      data-delete-disabled={String(!!p.deleteDisabled)}
    />
  ),
}));

function props(id = 'l1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedIdentity).mockResolvedValue(
    makeIdentity('u1', makeProfile('self-u1'))
  );
  vi.mocked(getList).mockResolvedValue({ id: 'l1', profile_id: 'self-u1' } as never);
});

describe('EditListBody', () => {
  describe('Guards', () => {
    it('UnresolvedViewer_RedirectsToRoot', async () => {
      vi.mocked(authedIdentity).mockResolvedValue(null);
      await expect(EditListBody(props())).rejects.toThrow('REDIRECT:/');
    });
  });

  it('Authed_LoadsListAndRendersListFormInEditMode', async () => {
    render(await EditListBody(props('l1')));
    expect(getList).toHaveBeenCalledWith('l1');
    const form = screen.getByTestId('list-form');
    expect(form).toHaveAttribute('data-list-id', 'l1');
    expect(form).toHaveAttribute('data-editing', 'true');
  });

  describe('Manager', () => {
    beforeEach(() => {
      vi.mocked(authedIdentity).mockResolvedValue(
        makeIdentity(
          'mgr-1',
          makeProfile('mgr-self'),
          makeProfile('self-u1', 'Owner', ROLES.manager)
        )
      );
    });

    it('Manager_DeleteDisabledPassedToForm', async () => {
      render(await EditListBody(props('l1')));
      const form = screen.getByTestId('list-form');
      expect(form).toHaveAttribute('data-delete-disabled', 'true');
    });
  });

  describe('Owner', () => {
    it('Owner_DeleteNotDisabled', async () => {
      render(await EditListBody(props('l1')));
      const form = screen.getByTestId('list-form');
      expect(form).toHaveAttribute('data-delete-disabled', 'false');
    });
  });
});
