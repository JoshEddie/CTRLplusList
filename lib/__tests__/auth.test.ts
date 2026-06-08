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

  it('BypassOnWithRequestArgs_PassesThroughToRealNextAuth', async () => {
    // args.length > 0 (route-handler/middleware overload) bypasses the bypass:
    // even with the flag on, auth(req, ctx) must delegate to real NextAuth.
    vi.stubEnv('USE_PG_DRIVER', '1');
    realAuth.mockReturnValue('REAL_HANDLER_RESULT');

    const { auth } = await loadAuth();
    const req = { url: 'http://localhost/api' };
    const ctx = { params: {} };
    const result = (auth as unknown as (...a: unknown[]) => unknown)(req, ctx);

    expect(realAuth).toHaveBeenCalledWith(req, ctx);
    expect(result).toBe('REAL_HANDLER_RESULT');
  });
});

describe('signInCallback', () => {
  it('GivenAndFamilyName_SetsFullDisplayName', async () => {
    const { signInCallback } = await loadAuth();
    const user = { name: 'Default' };

    const ok = await signInCallback({
      user,
      profile: { given_name: 'Ada', family_name: 'Lovelace' },
    });

    expect(ok).toBe(true);
    expect(user.name).toBe('Ada Lovelace');
  });

  it('GivenNameOnly_SetsGivenName', async () => {
    const { signInCallback } = await loadAuth();
    const user = { name: 'Default' };

    await signInCallback({ user, profile: { given_name: 'Ada' } });

    expect(user.name).toBe('Ada');
  });

  it('NeitherName_LeavesUserNameUnchanged', async () => {
    const { signInCallback } = await loadAuth();
    const user = { name: 'Default' };

    const ok = await signInCallback({ user, profile: {} });

    expect(ok).toBe(true);
    expect(user.name).toBe('Default');
  });
});

describe('jwtCallback', () => {
  it('TriggerUpdate_CopiesSessionNameToToken', async () => {
    const { jwtCallback } = await loadAuth();
    const token = { name: 'old' };

    const result = jwtCallback({
      token,
      user: {},
      trigger: 'update',
      session: { user: { name: 'new' } },
    });

    expect(result).toBe(token);
    expect(token.name).toBe('new');
  });

  it('NoUpdateTrigger_LeavesTokenNameUnchanged', async () => {
    const { jwtCallback } = await loadAuth();
    const token = { name: 'old' };

    jwtCallback({ token, user: {}, trigger: 'signIn' });

    expect(token.name).toBe('old');
  });
});

describe('sessionCallback', () => {
  it('AnySession_ReturnsSessionUnchanged', async () => {
    const { sessionCallback } = await loadAuth();
    const session = {
      user: { id: 'u1', name: 'Alice' },
      expires: '2099-01-01T00:00:00.000Z',
    };

    const result = await sessionCallback({
      session,
    } as Parameters<typeof sessionCallback>[0]);

    expect(result).toBe(session);
  });
});
