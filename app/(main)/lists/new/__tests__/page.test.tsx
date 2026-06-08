import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/dal';
import NewList from '../page';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/dal', () => ({ getUserIdByEmail: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/(main)/lists/ui/components/ListForm', () => ({
  default: (p: { list?: unknown }) => (
    <div data-testid="list-form" data-has-list={String(!!p.list)} />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'owner@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'u1' } as never);
});

describe('NewList', () => {
  describe('Guards', () => {
    it('Unauthenticated_RedirectsToRoot', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      await expect(NewList()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
    });

    it('AuthedNoUserRow_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null as never);
      await expect(NewList()).rejects.toThrow('REDIRECT:/');
    });
  });

  it('AuthedOwner_RendersListFormInCreateMode', async () => {
    render(await NewList());
    const form = screen.getByTestId('list-form');
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute('data-has-list', 'false');
  });
});
