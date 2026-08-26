import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actingAsName } from '@/lib/data/profile.active';
import { authedIdentity } from '@/lib/data/user.session';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import NewList from '../page';

vi.mock('@/lib/data/user.session', () => ({ authedIdentity: vi.fn() }));
vi.mock('@/lib/data/profile.active', () => ({ actingAsName: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/(main)/lists/ui/components/ListForm', () => ({
  default: (p: { list?: unknown; actingAs?: string }) => (
    <div
      data-testid="list-form"
      data-has-list={String(!!p.list)}
      data-acting-as={p.actingAs ?? ''}
    />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedIdentity).mockResolvedValue(
    makeIdentity('u1', makeProfile('p-self', 'Ada'))
  );
  vi.mocked(actingAsName).mockResolvedValue(undefined);
});

describe('NewList', () => {
  describe('Guards', () => {
    it('UnresolvedViewer_RedirectsToRoot', async () => {
      vi.mocked(authedIdentity).mockResolvedValue(null);
      await expect(NewList()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
    });
  });

  it('AuthedOwner_RendersListFormInCreateMode', async () => {
    render(await NewList());
    const form = screen.getByTestId('list-form');
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute('data-has-list', 'false');
    expect(form).toHaveAttribute('data-acting-as', '');
  });

  it('MultiProfileViewer_ForwardsTheActiveProfilesNameToTheForm', async () => {
    vi.mocked(actingAsName).mockResolvedValue('Kiddo');

    render(await NewList());

    expect(screen.getByTestId('list-form')).toHaveAttribute(
      'data-acting-as',
      'Kiddo'
    );
  });
});
