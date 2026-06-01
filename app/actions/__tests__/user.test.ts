import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signIn, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';

vi.mock('@/lib/auth', () => ({ signIn: vi.fn(), signOut: vi.fn() }));

// Real Next `redirect()` throws to abort the request; production code relies on
// nothing running after it. The mock mirrors that with a tagged sentinel the
// test catches via `rejects.toThrow`.
class RedirectSignal extends Error {
  constructor(public target: string) {
    super(`__redirect:${target}__`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new RedirectSignal(target);
  }),
}));

const { signInUser, signOutUser } = await import('@/app/actions/user');

beforeEach(() => {
  vi.mocked(signIn).mockReset();
  vi.mocked(signOut).mockReset();
  vi.mocked(redirect).mockClear();
});

describe('signInUser', () => {
  it('Invoked_DelegatesToGoogleProvider', async () => {
    await signInUser();
    expect(signIn).toHaveBeenCalledWith('google');
  });
});

describe('signOutUser', () => {
  it('Invoked_SignsOutWithoutRedirectThenRedirectsToSignIn', async () => {
    await expect(signOutUser()).rejects.toThrow(/__redirect:\/sign-in__/);
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(redirect).toHaveBeenCalledWith('/sign-in');
  });
});
