import { authedUserId } from '@/lib/data/user.session';
import { fetchProduct } from '@/lib/product-fetch';
import {
  RATE_LIMITED_SCENARIO,
  mockScenarioOf,
} from '@/lib/product-fetch/mock';
import { isPrivateHostname } from '@/lib/product-fetch/utils';
import { NextResponse } from 'next/server';

// Vercel Hobby's hard cap. The seam's own abort budget (FETCH_TIMEOUT_MS)
// sits under this, so a slow fetch returns a graceful timeout before the
// platform would kill the function here.
export const maxDuration = 60;

const MAX_URL_LENGTH = 2048;

// Per-user in-memory token bucket. Low cap because tier 2 burns paid Zyte
// quota; per-process degradation accepted.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_WINDOW = 10;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

// String-level SSRF hygiene only. Zyte fetches the page on its own
// infrastructure, so the app never resolves or fetches the URL itself —
// there is no DNS-rebinding surface of our own to guard.
function validateUrl(url: unknown): URL | null {
  if (typeof url !== 'string' || url.length === 0 || url.length > MAX_URL_LENGTH) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (isPrivateHostname(parsed.hostname)) return null;
  return parsed;
}

export async function POST(request: Request) {
  const userId = await authedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }

  const parsed = validateUrl(body.url);
  if (!parsed) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }

  // Local-mode mock requests never reach Zyte, so they skip the bucket the
  // quota-protecting limit exists for; `rate-limited` is the one scenario
  // whose 429 originates here rather than at the seam. Dead branch outside
  // local mode (mockScenarioOf returns null).
  const mockScenario = mockScenarioOf(parsed.toString());
  if (mockScenario === RATE_LIMITED_SCENARIO) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  if (mockScenario === null && !checkRateLimit(userId)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const result = await fetchProduct(parsed.toString(), {
    signal: request.signal,
  });
  return NextResponse.json(result);
}
