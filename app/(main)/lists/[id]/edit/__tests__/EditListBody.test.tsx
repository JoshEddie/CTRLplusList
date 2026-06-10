import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getList } from '@/lib/data/list';
import { getUserIdByEmail } from '@/lib/data/user';
import EditListBody from '../EditListBody';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/list', () => ({ getList: vi.fn() }));
vi.mock('@/lib/data/user', () => ({ getUserIdByEmail: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/(main)/lists/ui/components/ListForm', () => ({
  default: (p: { list?: { id: string }; isEditing?: boolean }) => (
    <div
      data-testid="list-form"
      data-list-id={p.list?.id ?? ''}
      data-editing={String(!!p.isEditing)}
    />
  ),
}));

function props(id = 'l1') {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'owner@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'u1' } as never);
  vi.mocked(getList).mockResolvedValue({ id: 'l1', user_id: 'u1' } as never);
});

describe('EditListBody', () => {
  describe('Guards', () => {
    it('Unauthenticated_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      await expect(EditListBody(props())).rejects.toThrow('REDIRECT:/');
    });

    it('AuthedNoUserRow_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null as never);
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
});
