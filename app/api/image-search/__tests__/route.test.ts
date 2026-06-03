import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite } from '@/test/helpers/db';

// The value the mocked auth() resolves to per caller class: an email to act as
// that user (resolved to users.id against pglite), or null for anonymous.
function sessionFor(email: string | null) {
  return email ? ({ user: { email } } as never) : (null as never);
}

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown as TestDb }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const USER_EMAIL = 'searcher@test.local';
const USER_B_EMAIL = 'searcher-b@test.local';

// Mirrors RATE_LIMIT_WINDOW_MS in route.ts (not exported). Used to advance fake
// timers past the bucket window so the reset path (`bucket.resetAt <= now`) runs.
const RATE_LIMIT_WINDOW_MS = 60_000;

const IMAGE_ENV_KEYS = [
  'IMAGE_SEARCH_USE_MOCK',
  'IMAGE_SEARCH_PROVIDERS',
  'IMAGE_SEARCH_PROVIDER',
  'IMAGE_SEARCH_SIMULATE_QUOTA',
  'IMAGE_SEARCH_CACHE_MAX_ENTRIES',
  'SERPAPI_API_KEY',
  'SERPER_API_KEY',
];

type GetHandler = (req: Request) => Promise<Response>;

// Fresh module instance per call so the route's module-singleton rate-limit
// bucket and result cache start empty (Decision 4).
async function loadRoute(env: Record<string, string> = {}): Promise<GetHandler> {
  vi.resetModules();
  for (const k of IMAGE_ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  const mod = await import('@/app/api/image-search/route');
  return mod.GET as GetHandler;
}

function req(query?: string): Request {
  const url =
    query === undefined
      ? 'http://localhost/api/image-search'
      : `http://localhost/api/image-search?q=${encodeURIComponent(query)}`;
  return new Request(url);
}

function res(status: number, body: unknown, ok = status < 400) {
  return {
    status,
    ok,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const serpapiBody = {
  images_results: [
    {
      original: 'https://img/o.png',
      thumbnail: 'https://img/t.png',
      title: 'Cat',
      source: 'https://src',
      original_width: 800,
      original_height: 600,
    },
    {}, // exercises the `||` fallbacks for missing fields
  ],
};
const serperBody = {
  images: [
    {
      imageUrl: 'https://img/o.png',
      thumbnailUrl: 'https://img/t.png',
      title: 'Cat',
      source: 'https://src',
      imageWidth: 800,
      imageHeight: 600,
    },
    {},
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  const booted = await bootPglite();
  holder.db = booted.db;
  await booted.db.insert(users).values({ id: 'searcher', email: USER_EMAIL });
});

beforeEach(() => {
  vi.mocked(auth).mockReset();
  vi.mocked(auth).mockResolvedValue(sessionFor(USER_EMAIL));
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AuthGate', () => {
  it('Unauthenticated_Returns401-NoProviderFetch', async () => {
    const GET = await loadRoute({ SERPAPI_API_KEY: 'k' });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(null));
    const r = await GET(req('cat'));
    expect(r.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('AuthedButNoUserRow_Returns401', async () => {
    const GET = await loadRoute({ SERPAPI_API_KEY: 'k' });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor('ghost@test.local'));
    const r = await GET(req('cat'));
    expect(r.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('RateLimit', () => {
  it('OverWindow_Returns429RateLimited-NoFurtherFetch', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi',
      SERPAPI_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(200, serpapiBody));
    for (let i = 0; i < 30; i++) {
      const ok = await GET(req(`cat-${i}`));
      expect(ok.status).toBe(200);
    }
    const limited = await GET(req('cat-31'));
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'rate_limited' });
    // The 31st request is rejected before spending provider quota.
    expect(fetchMock).toHaveBeenCalledTimes(30);
  });

  it('AfterWindowElapsed_BudgetResets-RequestProceeds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    try {
      const GET = await loadRoute({
        IMAGE_SEARCH_PROVIDERS: 'serpapi',
        SERPAPI_API_KEY: 'k',
      });
      const reauth = await import('@/lib/auth');
      vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
      fetchMock.mockResolvedValue(res(200, serpapiBody));
      for (let i = 0; i < 30; i++) {
        const ok = await GET(req(`reset-${i}`));
        expect(ok.status).toBe(200);
      }
      expect((await GET(req('reset-30'))).status).toBe(429);
      expect(fetchMock).toHaveBeenCalledTimes(30);

      // Advance past the bucket window: resetAt <= now, so the budget refills
      // and the next request proceeds instead of staying throttled forever.
      vi.setSystemTime(new Date(RATE_LIMIT_WINDOW_MS + 1));
      const afterReset = await GET(req('reset-after'));
      expect(afterReset.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(31);
    } finally {
      vi.useRealTimers();
    }
  });

  it('OtherUserExhausted_IndependentBudget-RequestProceeds', async () => {
    await holder.db
      .insert(users)
      .values({ id: 'searcher-b', email: USER_B_EMAIL });
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi',
      SERPAPI_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    fetchMock.mockResolvedValue(res(200, serpapiBody));

    // User A exhausts their 30-request budget.
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    for (let i = 0; i < 30; i++) await GET(req(`a-${i}`));
    expect((await GET(req('a-30'))).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(30);

    // User B's first request is unaffected — the bucket is keyed per users.id,
    // so a global counter would 429 here instead of reaching the provider.
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_B_EMAIL));
    const bFirst = await GET(req('b-0'));
    expect(bFirst.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(31);
  });
});

describe('QueryValidation', () => {
  it('MissingQuery_Returns400-NoFetch', async () => {
    const GET = await loadRoute({ SERPAPI_API_KEY: 'k' });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    const r = await GET(req());
    expect(r.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('BlankQuery_Returns400', async () => {
    const GET = await loadRoute({ SERPAPI_API_KEY: 'k' });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    const r = await GET(req('   '));
    expect(r.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('TooLongQuery_Returns400QueryTooLong-NoFetch', async () => {
    const GET = await loadRoute({ SERPAPI_API_KEY: 'k' });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    const r = await GET(req('x'.repeat(201)));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'query_too_long' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('SimulateQuotaOverride', () => {
  it('EnvFlagSet_Returns429QuotaExceeded-NoFetch', async () => {
    const GET = await loadRoute({
      SERPAPI_API_KEY: 'k',
      IMAGE_SEARCH_SIMULATE_QUOTA: 'true',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    const r = await GET(req('cat'));
    expect(r.status).toBe(429);
    expect(await r.json()).toMatchObject({ error: 'quota_exceeded' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ProviderSuccessAndCache', () => {
  it('SerpapiValidQuery_ReturnsItemsAndProvider', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi',
      SERPAPI_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(200, serpapiBody));
    const r = await GET(req('cat'));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.provider).toBe('serpapi');
    expect(body.items).toHaveLength(2);
    expect(body.items[0].link).toBe('https://img/o.png');
    // The second result is the empty `{}` upstream row: every field falls back.
    expect(body.items[1]).toEqual({
      link: '',
      title: '',
      image: {
        byteSize: 0,
        contextLink: '',
        height: 0,
        thumbnailLink: '',
        width: 0,
      },
    });
  });

  it('SerperValidQuery_ReturnsItemsAndProvider', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serper',
      SERPER_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(200, serperBody));
    const r = await GET(req('cat'));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.provider).toBe('serper');
    expect(body.items).toHaveLength(2);
    // The second result is the empty `{}` upstream row: every field falls back.
    expect(body.items[1]).toEqual({
      link: '',
      title: '',
      image: {
        byteSize: 0,
        contextLink: '',
        height: 0,
        thumbnailLink: '',
        width: 0,
      },
    });
  });

  it('MockValidQuery_ReturnsMockItems-NoFetch', async () => {
    const GET = await loadRoute({ IMAGE_SEARCH_USE_MOCK: 'true' });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    const r = await GET(req('cat'));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.provider).toBe('mock');
    expect(body.items.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('NoProvidersConfigured_FallsBackToMock', async () => {
    const GET = await loadRoute({ IMAGE_SEARCH_PROVIDERS: 'serpapi' });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    const r = await GET(req('cat'));
    const body = await r.json();
    // serpapi is named but unconfigured (no key), so the chain falls to mock.
    expect(body.provider).toBe('mock');
  });

  it('RepeatQuery_SecondCallReturnsCached-NoSecondFetch', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi',
      SERPAPI_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(200, serpapiBody));
    await GET(req('cat'));
    const second = await GET(req('CAT')); // cacheKey lowercases + trims
    const body = await second.json();
    expect(body.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('CacheAtCapacity_EvictsOldestEntry', async () => {
    // Lower the cap to 2 so a third distinct query evicts the oldest (q1).
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi',
      SERPAPI_API_KEY: 'k',
      IMAGE_SEARCH_CACHE_MAX_ENTRIES: '2',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(200, serpapiBody));
    await GET(req('q1'));
    await GET(req('q2'));
    await GET(req('q3')); // size hits cap → oldest (q1) evicted
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // q2 and q3 are still cached → served without a fetch (cache reads don't
    // mutate, so check these before the q1 miss, whose write would evict again).
    expect((await (await GET(req('q2'))).json()).cached).toBe(true);
    expect((await (await GET(req('q3'))).json()).cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // q1 was the oldest entry → it was evicted, so a re-request misses and fetches.
    const q1again = await GET(req('q1'));
    expect((await q1again.json()).cached).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('ExpiredCacheEntry_RefetchesInsteadOfServingStale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    try {
      const GET = await loadRoute({
        IMAGE_SEARCH_PROVIDERS: 'serpapi',
        SERPAPI_API_KEY: 'k',
      });
      const reauth = await import('@/lib/auth');
      vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
      fetchMock.mockResolvedValue(res(200, serpapiBody));
      await GET(req('cat'));
      // Jump past the 7-day TTL: the cached entry is expired and dropped.
      vi.setSystemTime(new Date(8 * 24 * 60 * 60 * 1000));
      const r = await GET(req('cat'));
      const body = await r.json();
      expect(body.cached).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ProviderSelection', () => {
  it('MockNamedInProvidersList_ResolvesToMock', async () => {
    // Naming mock in the priority list routes it through the configured-filter,
    // exercising mockProvider.isConfigured (unlike the USE_MOCK shortcut).
    const GET = await loadRoute({ IMAGE_SEARCH_PROVIDERS: 'mock' });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    const r = await GET(req('cat'));
    expect((await r.json()).provider).toBe('mock');
  });

  it('LegacySingularProviderAlias_IsHonored', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDER: 'serper',
      SERPER_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(200, serperBody));
    const r = await GET(req('cat'));
    expect((await r.json()).provider).toBe('serper');
  });

  it('NoProviderEnv_UsesDefaultChain', async () => {
    const GET = await loadRoute({ SERPAPI_API_KEY: 'k' });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(200, serpapiBody));
    const r = await GET(req('cat'));
    expect((await r.json()).provider).toBe('serpapi');
  });
});

describe('ProviderFailureHandling', () => {
  it('FirstProviderQuota_FallsThroughToNext-ReportsFallbackFrom', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi,serper',
      SERPAPI_API_KEY: 'k',
      SERPER_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock
      .mockResolvedValueOnce(res(429, {}, false)) // serpapi quota
      .mockResolvedValueOnce(res(200, serperBody)); // serper ok
    const r = await GET(req('cat'));
    const body = await r.json();
    expect(body.provider).toBe('serper');
    expect(body.fallbackFrom).toEqual(['serpapi']);
  });

  it('AllProvidersQuota_Returns429QuotaExceeded', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi,serper',
      SERPAPI_API_KEY: 'k',
      SERPER_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock
      .mockResolvedValueOnce(res(429, {}, false))
      .mockResolvedValueOnce(res(402, {}, false)); // serper 402 → quota
    const r = await GET(req('cat'));
    expect(r.status).toBe(429);
    expect(await r.json()).toMatchObject({ error: 'quota_exceeded' });
  });

  it('SerpapiBodyLevelQuota_TreatedAsQuotaExceeded', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi',
      SERPAPI_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(
      res(200, { error: 'You have run out of plan searches' })
    );
    const r = await GET(req('cat'));
    expect(r.status).toBe(429);
    expect(await r.json()).toMatchObject({ error: 'quota_exceeded' });
  });

  it('ProviderHttpError_Returns500', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi',
      SERPAPI_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(500, { boom: true }, false));
    const r = await GET(req('cat'));
    expect(r.status).toBe(500);
    expect(await r.json()).toMatchObject({
      error: 'Failed to process image search',
    });
  });

  it('SerperHttpError_Returns500', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serper',
      SERPER_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(500, { boom: true }, false));
    const r = await GET(req('cat'));
    expect(r.status).toBe(500);
  });

  it('SerpapiNonArrayResults_ReturnsEmptyItems', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serpapi',
      SERPAPI_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(200, { images_results: null }));
    const r = await GET(req('cat'));
    const body = await r.json();
    expect(body.items).toEqual([]);
  });

  it('SerperNonArrayImages_ReturnsEmptyItems', async () => {
    const GET = await loadRoute({
      IMAGE_SEARCH_PROVIDERS: 'serper',
      SERPER_API_KEY: 'k',
    });
    const reauth = await import('@/lib/auth');
    vi.mocked(reauth.auth).mockResolvedValue(sessionFor(USER_EMAIL));
    fetchMock.mockResolvedValue(res(200, { images: undefined }));
    const r = await GET(req('cat'));
    const body = await r.json();
    expect(body.items).toEqual([]);
  });
});
