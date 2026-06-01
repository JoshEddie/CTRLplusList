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
  it('Invoked_DelegatesToSignInWithGoogleProvider', async () => {
    await signInUser();
    expect(signIn).toHaveBeenCalledExactlyOnceWith('google');
  });

  it('Invoked_DoesNotCallSignOutOrRedirect', async () => {
    await signInUser();
    expect(signOut).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('signOutUser', () => {
  it('Invoked_CallsSignOutWithRedirectFalse', async () => {
    await expect(signOutUser()).rejects.toThrow(/__redirect:\/sign-in__/);
    expect(signOut).toHaveBeenCalledExactlyOnceWith({ redirect: false });
  });

  it('Invoked_RedirectsToSignIn', async () => {
    await expect(signOutUser()).rejects.toThrow(/__redirect:\/sign-in__/);
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/sign-in');
  });

  it('Invoked_ClearsSessionBeforeRedirect', async () => {
    await expect(signOutUser()).rejects.toThrow(/__redirect:\/sign-in__/);
    expect(vi.mocked(signOut).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(redirect).mock.invocationCallOrder[0],
    );
  });

  it('Invoked_DoesNotCallSignIn', async () => {
    await expect(signOutUser()).rejects.toThrow(/__redirect:\/sign-in__/);
    expect(signIn).not.toHaveBeenCalled();
  });
});
