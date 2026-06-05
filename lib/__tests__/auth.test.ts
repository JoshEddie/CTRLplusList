import { afterEach, describe, expect, it, vi } from 'vitest';

// Real NextAuth, the Drizzle adapter, the Google provider, and the DB module
// are all mocked so the test exercises ONLY the bypass seam in lib/auth.ts.
// `realAuth` is the sentinel the flag-off path must delegate to.
const { realAuth } = vi.hoisted(() => ({ realAuth: vi.fn() }));

vi.mock('next-auth', () => ({
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: realAuth,
  }),
}));
vi.mock('next-auth/providers/google', () => ({ default: {} }));
vi.mock('@auth/drizzle-adapter', () => ({ DrizzleAdapter: () => ({}) }));
vi.mock('@/db', () => ({ db: {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

async function loadAuth() {
  return import('../auth');
}

describe('authBypass', () => {
  it('BypassOnIdentityUnset_ReturnsDefaultViewerSession', async () => {
    vi.stubEnv('USE_PG_DRIVER', '1');

    const { auth, BYPASS_USER_ID, BYPASS_USER_EMAIL } = await loadAuth();
    const session = await auth();

    expect(session?.user?.id).toBe(BYPASS_USER_ID);
    expect(session?.user?.email).toBe(BYPASS_USER_EMAIL);
    expect(realAuth).not.toHaveBeenCalled();
  });

  it('BypassOnIdentityGuest_ResolvesToNull', async () => {
    vi.stubEnv('USE_PG_DRIVER', '1');
    vi.stubEnv('BYPASS_SESSION_USER', 'guest');

    const { auth } = await loadAuth();

    expect(await auth()).toBeNull();
    expect(realAuth).not.toHaveBeenCalled();
  });

  it('BypassOnOtherSeededIdentity_ReturnsSessionForThatId', async () => {
    vi.stubEnv('USE_PG_DRIVER', '1');
    vi.stubEnv('BYPASS_SESSION_USER', 'dev-friend-alice');

    const { auth, BYPASS_USER_ID } = await loadAuth();
    const session = await auth();

    expect(session?.user?.id).toBe('dev-friend-alice');
    expect(session?.user?.id).not.toBe(BYPASS_USER_ID);
  });

  it('BypassOff_DelegatesToRealNextAuth', async () => {
    vi.stubEnv('USE_PG_DRIVER', '');
    realAuth.mockResolvedValue({
      user: { id: 'real-google-user' },
      expires: '2025-01-01T00:00:00.000Z',
    });

    const { auth, BYPASS_USER_ID } = await loadAuth();
    const session = await auth();

    expect(realAuth).toHaveBeenCalledTimes(1);
    expect(session?.user?.id).toBe('real-google-user');
    expect(session?.user?.id).not.toBe(BYPASS_USER_ID);
  });
});
