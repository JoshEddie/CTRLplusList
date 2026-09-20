import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

import { selfProfileOf, type TestDb } from './test-helpers';

mockNextCache();

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const cookieJar = vi.hoisted(() => ({
  store: new Map<string, string>(),
  options: new Map<string, Record<string, unknown>>(),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      cookieJar.store.set(name, value);
      if (options) cookieJar.options.set(name, options);
    },
  }),
}));

// One pglite boot per file, TRUNCATE between tests — the same trade the sibling
// claim-action suite makes to avoid a per-test boot storm.
vi.setConfig({ hookTimeout: 60000 });

const OWNER = { id: 'owner', email: 'owner@test.local' };
const TARGET = { id: 'target', email: 'target@test.local' };
const OWNER_PROFILE = selfProfileOf(OWNER.id);
const TARGET_PROFILE = selfProfileOf(TARGET.id);

let db: TestDb;
let identity: typeof import('@/lib/data/purchase.identity');

function asOwner() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OWNER.email } } as never);
}
function asUnknownAccount() {
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'ghost@test.local' },
  } as never);
}
function noSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

function guestCookie() {
  const raw = cookieJar.store.get('guest_claims');
  return raw === undefined
    ? null
    : (JSON.parse(raw) as { id: string; name: string; purchases: string[] });
}

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  identity = await import('@/lib/data/purchase.identity');
});

beforeEach(async () => {
  vi.restoreAllMocks();
  cookieJar.store.clear();
  cookieJar.options.clear();
  await resetDb(db);
  await seedUsers(db, [OWNER, TARGET]);
  asOwner();
});

describe('resolveClaimIdentity', () => {
  it('AuthedWithNoNameAndNoTarget_ResolvesSelfProfileAtBothEnds', async () => {
    expect(await identity.resolveClaimIdentity(null, null)).toEqual(
      expect.objectContaining({
        callerProfileId: OWNER_PROFILE,
        purchaserProfileId: OWNER_PROFILE,
        guestName: null,
      })
    );
  });

  it('AuthedWithPurchasedBy_KeepsTheCallerAsAsserterAndStoresTheTarget', async () => {
    expect(await identity.resolveClaimIdentity(null, TARGET_PROFILE)).toEqual(
      expect.objectContaining({
        callerProfileId: OWNER_PROFILE,
        purchaserProfileId: TARGET_PROFILE,
        guestName: null,
      })
    );
  });

  it('AuthedWithGuestName_StoresTheNameWithNoPurchaserProfile', async () => {
    expect(await identity.resolveClaimIdentity('  Josh  ', null)).toEqual(
      expect.objectContaining({
        callerProfileId: OWNER_PROFILE,
        purchaserProfileId: null,
        guestName: 'Josh',
      })
    );
  });

  // A name of nothing but whitespace is not a name, so the claim falls back to
  // the caller's own rather than storing an unattributable blank.
  it('AuthedWithWhitespaceOnlyName_FallsBackToASelfClaim', async () => {
    expect(await identity.resolveClaimIdentity('   ', null)).toEqual(
      expect.objectContaining({
        purchaserProfileId: OWNER_PROFILE,
        guestName: null,
      })
    );
  });

  it('AuthedWithBothNameAndTarget_RefusesAsAmbiguous', async () => {
    expect(await identity.resolveClaimIdentity('Josh', TARGET_PROFILE)).toEqual(
      {
        error: {
          success: false,
          message: 'Cannot identify which claim to add',
          error: 'Ambiguous purchaser',
        },
      }
    );
  });

  it('SessionForAnAccountWithNoUsersRow_RefusesAsUnauthorized', async () => {
    asUnknownAccount();
    expect(await identity.resolveClaimIdentity(null, null)).toEqual({
      error: {
        success: false,
        message: 'User not found',
        error: 'Unauthorized',
      },
    });
  });

  it('SignedOutWithGuestName_ResolvesToANamedGuestCarryingNoProfile', async () => {
    noSession();
    expect(await identity.resolveClaimIdentity(' Josh ', null)).toEqual({
      viewer: null,
      callerProfileId: null,
      purchaserProfileId: null,
      guestName: 'Josh',
    });
  });

  it('SignedOutWithNoName_RefusesAsMissingIdentity', async () => {
    noSession();
    expect(await identity.resolveClaimIdentity(null, null)).toEqual({
      error: {
        success: false,
        message: 'Cannot identify which claim to add',
        error: 'Missing identity',
      },
    });
  });

  // The on-behalf path is authenticated-only: a signed-out caller must not be
  // able to pin a claim on a profile it cannot be checked against.
  it('SignedOutWithPurchasedBy_RefusesAsMissingIdentity', async () => {
    noSession();
    expect(await identity.resolveClaimIdentity('Josh', TARGET_PROFILE)).toEqual(
      {
        error: {
          success: false,
          message: 'Cannot identify which claim to add',
          error: 'Missing identity',
        },
      }
    );
  });
});

describe('GuestClaimCookie', () => {
  it('NoCookie_ReadsBackNull', async () => {
    expect(await identity.readGuestClaims()).toBeNull();
  });

  it('CookieSet_ReadsBackTheStoredClaims', async () => {
    cookieJar.store.set(
      'guest_claims',
      JSON.stringify({ id: 'g1', name: 'Josh', purchases: ['p1'] })
    );
    expect(await identity.readGuestClaims()).toEqual({
      id: 'g1',
      name: 'Josh',
      purchases: ['p1'],
    });
  });

  it('RememberWithNoCookie_WritesTheNameAndTheSingleClaim', async () => {
    await identity.rememberGuestClaim('p1', 'Josh');
    expect(guestCookie()).toEqual({
      id: expect.any(String),
      name: 'Josh',
      purchases: ['p1'],
    });
  });

  it('RememberWithAnExistingCookie_PrependsTheClaimAndKeepsTheGuestId', async () => {
    cookieJar.store.set(
      'guest_claims',
      JSON.stringify({ id: 'g1', name: 'Josh', purchases: ['p1'] })
    );
    await identity.rememberGuestClaim('p2', 'Josh');
    expect(guestCookie()).toEqual({
      id: 'g1',
      name: 'Josh',
      purchases: ['p2', 'p1'],
    });
  });

  // The cookie is the guest's only route back to their own claim (ADR-0008), so
  // it must survive the browser session and stay out of reach of scripts.
  it('Remember_WritesTheCookieHttpOnlyWithTheFourHundredDayLifetime', async () => {
    await identity.rememberGuestClaim('p1', 'Josh');
    expect(cookieJar.options.get('guest_claims')).toEqual(
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 400 * 24 * 60 * 60,
      })
    );
  });

  it('Forget_WritesBackTheRemainingClaimsUnderTheSameGuestId', async () => {
    await identity.forgetGuestClaim(
      { id: 'g1', name: 'Josh', purchases: ['p1', 'p2'] },
      'p1'
    );
    expect(guestCookie()).toEqual({
      id: 'g1',
      name: 'Josh',
      purchases: ['p2'],
    });
  });
});
