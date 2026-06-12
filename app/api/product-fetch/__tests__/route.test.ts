import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { fetchProduct } from '@/lib/product-fetch';
import { bootPglite } from '@/test/helpers/db';

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
vi.mock('@/lib/product-fetch', () => ({ fetchProduct: vi.fn() }));

const USER_EMAIL = 'fetcher@test.local';

// Mirrors RATE_LIMIT_PER_WINDOW in route.ts (not exported).
const RATE_LIMIT_PER_WINDOW = 10;

type PostHandler = (req: Request) => Promise<Response>;

// Fresh module instance per call so the module-singleton rate-limit bucket
// starts empty.
async function loadRoute(): Promise<PostHandler> {
  vi.resetModules();
  const mod = await import('@/app/api/product-fetch/route');
  return mod.POST as PostHandler;
}

function req(body: unknown): Request {
  return new Request('http://localhost/api/product-fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const PRODUCT_OK = {
  ok: true,
  product: { title: 'Acme Widget', price: '24.50', store: 'Amazon' },
};

beforeAll(async () => {
  const booted = await bootPglite();
  holder.db = booted.db;
  await booted.db.insert(users).values({ id: 'fetcher', email: USER_EMAIL });
});

beforeEach(() => {
  vi.mocked(auth).mockReset();
  vi.mocked(auth).mockResolvedValue(sessionFor(USER_EMAIL));
  vi.mocked(fetchProduct).mockReset();
  vi.mocked(fetchProduct).mockResolvedValue(PRODUCT_OK as never);
});

describe('AuthGate', () => {
  it('Unauthenticated_Returns401-NoSeamCall', async () => {
    const POST = await loadRoute();
    vi.mocked(auth).mockResolvedValue(sessionFor(null));
    const r = await POST(req({ url: 'https://example.com/p/1' }));
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: 'Unauthorized' });
    expect(fetchProduct).not.toHaveBeenCalled();
  });

  it('UnknownSessionEmail_Returns401', async () => {
    const POST = await loadRoute();
    vi.mocked(auth).mockResolvedValue(sessionFor('ghost@test.local'));
    const r = await POST(req({ url: 'https://example.com/p/1' }));
    expect(r.status).toBe(401);
  });
});

describe('UrlValidation', () => {
  let POST: PostHandler;

  beforeEach(async () => {
    POST = await loadRoute();
  });

  it('MissingUrl_Returns400InvalidUrl-NoSeamCall', async () => {
    const r = await POST(req({}));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'invalid_url' });
    expect(fetchProduct).not.toHaveBeenCalled();
  });

  it('MalformedJsonBody_Returns400InvalidUrl', async () => {
    const r = await POST(req('{not json'));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'invalid_url' });
  });

  it('OversizedUrl_Returns400InvalidUrl', async () => {
    const r = await POST(
      req({ url: `https://example.com/${'a'.repeat(2048)}` })
    );
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'invalid_url' });
  });

  it('NonHttpScheme_Returns400InvalidUrl', async () => {
    const r = await POST(req({ url: 'ftp://example.com/file' }));
    expect(r.status).toBe(400);
  });

  it('NotAUrl_Returns400InvalidUrl', async () => {
    const r = await POST(req({ url: 'just words' }));
    expect(r.status).toBe(400);
  });
});

describe('SsrfGuard', () => {
  let POST: PostHandler;

  beforeEach(async () => {
    POST = await loadRoute();
  });

  for (const target of [
    'http://localhost:3000/admin',
    'http://sub.localhost/x',
    'http://127.0.0.1/x',
    'http://10.0.0.1/x',
    'http://192.168.1.1/x',
    'http://[::1]/x',
    'http://intranet/x',
    'http://service.internal/x',
    'http://printer.local/x',
  ]) {
    it(`PrivateTarget${target.replace(/[^A-Za-z0-9]/g, '')}_Returns400-NoSeamCall`, async () => {
      const r = await POST(req({ url: target }));
      expect(r.status).toBe(400);
      expect(fetchProduct).not.toHaveBeenCalled();
    });
  }
});

describe('RateLimit', () => {
  it('OverTenPerMinute_Returns429RateLimited', async () => {
    const POST = await loadRoute();
    for (let i = 0; i < RATE_LIMIT_PER_WINDOW; i++) {
      const r = await POST(req({ url: 'https://example.com/p/1' }));
      expect(r.status).toBe(200);
    }
    const r = await POST(req({ url: 'https://example.com/p/1' }));
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'rate_limited' });
    expect(fetchProduct).toHaveBeenCalledTimes(RATE_LIMIT_PER_WINDOW);
  });
});

describe('SeamPassthrough', () => {
  let POST: PostHandler;

  beforeEach(async () => {
    POST = await loadRoute();
  });

  it('SeamSuccess_Returns200ProductBody-PassesUrl', async () => {
    const r = await POST(req({ url: 'https://example.com/p/1' }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(PRODUCT_OK);
    expect(fetchProduct).toHaveBeenCalledWith(
      'https://example.com/p/1',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('SeamTimeout_Returns200TimeoutBody', async () => {
    vi.mocked(fetchProduct).mockResolvedValue({
      ok: false,
      error: 'timeout',
    } as never);
    const r = await POST(req({ url: 'https://example.com/p/1' }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: false, error: 'timeout' });
  });
});
