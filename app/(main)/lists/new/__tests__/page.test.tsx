import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authedUserId } from '@/lib/data/user.session';
import NewList from '../page';

vi.mock('@/lib/data/user.session', () => ({ authedUserId: vi.fn() }));

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
  vi.mocked(authedUserId).mockResolvedValue('u1');
});

describe('NewList', () => {
  describe('Guards', () => {
    it('UnresolvedViewer_RedirectsToRoot', async () => {
      vi.mocked(authedUserId).mockResolvedValue(null);
      await expect(NewList()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
    });
  });

  it('AuthedOwner_RendersListFormInCreateMode', async () => {
    render(await NewList());
    const form = screen.getByTestId('list-form');
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute('data-has-list', 'false');
  });
});
