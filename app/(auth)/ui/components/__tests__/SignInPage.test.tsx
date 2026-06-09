import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/auth';
import SignInPage from '../SignInPage';
import { makeSession } from './test-helpers';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/app/actions/user', () => ({
  signInUser: vi.fn(),
  signOutUser: vi.fn(),
}));
vi.mock('next/image', async () => ({
  default: (await import('./test-helpers')).MockNextImage,
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SignInPage', () => {
  it('AuthedSession_RedirectsToRoot', async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    await expect(SignInPage()).rejects.toThrow('REDIRECT:/');
    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('NoSession_RendersLogoAndGoogleSignInButton', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    render(await SignInPage());
    expect(screen.getByAltText('Ctrl+List')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in with google/i })
    ).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
