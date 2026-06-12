import { db } from '@/db';
import { users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { fetchProduct } from '@/lib/product-fetch';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Comfortably above the seam's ~20s app-side abort (design D1).
export const maxDuration = 60;

const MAX_URL_LENGTH = 2048;

// Per-user in-memory token bucket. Low cap because tier 2 burns paid Zyte
// quota; per-process, same accepted degradation as image-search.
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

// SSRF guard: tier 1 fetches from our own network, so refuse anything that
// could resolve inside it. Literal IPs are rejected wholesale — real product
// pages live on hostnames.
function isPrivateTarget(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (!host.includes('.')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.startsWith('[') || host.includes(':')) return true;
  return false;
}

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
  if (isPrivateTarget(parsed)) return null;
  return parsed;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUser = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: { id: true },
  });
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(sessionUser.id)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
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

  const result = await fetchProduct(parsed.toString(), {
    signal: request.signal,
  });
  return NextResponse.json(result);
}
