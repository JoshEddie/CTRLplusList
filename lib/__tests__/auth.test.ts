import { getTableName } from 'drizzle-orm';

import { SELF_MEMBERSHIP_PER_USER_IDX } from '@/db/schema';
import type { NextAuthConfig } from 'next-auth';
import type { PgTable } from 'drizzle-orm/pg-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Real NextAuth, the Drizzle adapter, the Google provider, and the DB module
// are all mocked so the test exercises ONLY the bypass seam in lib/auth.ts.
// `realAuth` is the sentinel the flag-off path must delegate to.
// `nextAuthConfig` captures the config lib/auth.ts hands to NextAuth, so the
// event wiring can be driven without the real callback machinery; `insertedRows`
// stands in for the database the createUser event writes through.
const { realAuth, nextAuthConfig, insertedRows, recordingDb } = vi.hoisted(
  () => ({
    realAuth: vi.fn(),
    nextAuthConfig: { current: undefined as NextAuthConfig | undefined },
    insertedRows: [] as { table: unknown; values: unknown }[],
    // Stands in for the database the createUser event writes through. The
    // write is one data-modifying CTE, so the profile row arrives through the
    // `$with` body and the membership row through the insert-select's
    // projection.
    recordingDb: (rows: { table: unknown; values: unknown }[]) => ({
      $with: () => ({
        as: (body: unknown) => ({ id: 'created.id', body }),
      }),
      insert: (table: unknown) => ({
        values: (values: unknown) => ({
          returning: () => {
            rows.push({ table, values });
            return {};
          },
        }),
      }),
      select: (fields: unknown) => ({ from: () => ({ fields }) }),
      with: () => ({
        insert: (table: unknown) => ({
          select: (query: { fields: unknown }) => {
            rows.push({ table, values: query.fields });
            return Promise.resolve();
          },
        }),
      }),
    }),
  })
);

vi.mock('next-auth', () => ({
  default: (config: NextAuthConfig) => {
    nextAuthConfig.current = config;
    return {
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: realAuth,
    };
  },
}));
vi.mock('next-auth/providers/google', () => ({ default: {} }));
vi.mock('@auth/drizzle-adapter', () => ({ DrizzleAdapter: () => ({}) }));
vi.mock('@/db', () => ({ db: recordingDb(insertedRows) }));

afterEach(() => {
  insertedRows.length = 0;
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

describe('createUserEvent', () => {
  it('NewAccount_WritesNanoidProfileAndSelfMembershipThroughTheAppDb', async () => {
    await loadAuth();

    await nextAuthConfig.current?.events?.createUser?.({
      user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' },
    });

    expect(
      insertedRows.map(({ table }) => getTableName(table as PgTable))
    ).toEqual(['profiles', 'profile_members']);
    const profile = insertedRows[0].values as { id: string; name: string };
    expect(profile.name).toBe('Ada Lovelace');
    expect(profile.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(profile).not.toHaveProperty('user_id');
  });
});

describe('createSelfProfile', () => {
  // The membership insert has no ON CONFLICT: losing the self-role race raises
  // 23505 and rolls the profile insert back with it, and swallowing exactly
  // that violation is what makes creation idempotent.
  function throwingDb(cause: { code: string; constraint: string }) {
    return {
      $with: () => ({ as: () => ({ id: 'created.id' }) }),
      insert: () => ({ values: () => ({ returning: () => ({}) }) }),
      select: () => ({ from: () => ({}) }),
      with: () => ({
        insert: () => ({
          select: () =>
            Promise.reject(Object.assign(new Error('Failed query'), { cause })),
        }),
      }),
    };
  }

  it('SelfMembershipUniqueViolation_ResolvesWithoutError', async () => {
    const { createSelfProfile } = await loadAuth();

    await expect(
      createSelfProfile(
        throwingDb({
          code: '23505',
          constraint: SELF_MEMBERSHIP_PER_USER_IDX,
        }) as never,
        { id: 'u1', name: 'Ada' }
      )
    ).resolves.toBeUndefined();
  });

  it('UnrelatedUniqueViolation_Rethrows', async () => {
    const { createSelfProfile } = await loadAuth();

    await expect(
      createSelfProfile(
        throwingDb({ code: '23505', constraint: 'some_other_idx' }) as never,
        { id: 'u1', name: 'Ada' }
      )
    ).rejects.toThrow('Failed query');
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
