import { NextResponse } from 'next/server';
import { ImageSearchResult } from '@/lib/types';

type ProviderName = 'serpapi' | 'serper' | 'mock';

interface ImageSearchProvider {
  name: ProviderName;
  isConfigured(): boolean;
  search(query: string, limit: number): Promise<ImageSearchResult[]>;
}

class QuotaExceededError extends Error {
  constructor(
    public readonly provider: ProviderName,
    message = 'Image search quota exceeded'
  ) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

const BLOCKED_SITES = ['instagram.com', 'pinterest.com', 'youtube.com'];

function buildQuery(query: string): string {
  const exclusions = BLOCKED_SITES.map((site) => `-site:${site}`).join(' ');
  return `${query} ${exclusions}`;
}

// ---- SerpAPI ----------------------------------------------------------------
// https://serpapi.com/images-results — free tier 250 searches/mo.

const serpApiProvider: ImageSearchProvider = {
  name: 'serpapi',

  isConfigured() {
    return Boolean(process.env.SERPAPI_API_KEY);
  },

  async search(query, limit) {
    const apiKey = process.env.SERPAPI_API_KEY!;
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_images');
    url.searchParams.set('q', buildQuery(query));
    url.searchParams.set('safe', 'active');
    url.searchParams.set('api_key', apiKey);

    const response = await fetch(url.toString());

    if (response.status === 429) {
      throw new QuotaExceededError('serpapi');
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `SerpAPI error ${response.status}: ${body.slice(0, 200)}`
      );
    }

    const data = await response.json();

    // SerpAPI often signals quota issues in the body, not via HTTP status.
    if (
      data?.error &&
      /limit|quota|run out|plan searches/i.test(String(data.error))
    ) {
      throw new QuotaExceededError('serpapi', String(data.error));
    }

    const items = Array.isArray(data.images_results) ? data.images_results : [];
    return items.slice(0, limit).map(
      (item: {
        original?: string;
        thumbnail?: string;
        title?: string;
        source?: string;
        original_width?: number;
        original_height?: number;
      }): ImageSearchResult => ({
        link: item.original || item.thumbnail || '',
        title: item.title || '',
        image: {
          byteSize: 0,
          contextLink: item.source || '',
          height: item.original_height || 0,
          thumbnailLink: item.thumbnail || item.original || '',
          width: item.original_width || 0,
        },
      })
    );
  },
};

// ---- Serper -----------------------------------------------------------------
// https://serper.dev — 2,500 one-time free credits at signup, then $0.30/1k.

const serperProvider: ImageSearchProvider = {
  name: 'serper',

  isConfigured() {
    return Boolean(process.env.SERPER_API_KEY);
  },

  async search(query, limit) {
    const apiKey = process.env.SERPER_API_KEY!;
    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: buildQuery(query),
        num: limit,
        safe: 'active',
      }),
    });

    if (response.status === 429 || response.status === 402) {
      throw new QuotaExceededError('serper');
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Serper error ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const items = Array.isArray(data.images) ? data.images : [];
    return items.slice(0, limit).map(
      (item: {
        imageUrl?: string;
        thumbnailUrl?: string;
        title?: string;
        source?: string;
        imageWidth?: number;
        imageHeight?: number;
      }): ImageSearchResult => ({
        link: item.imageUrl || item.thumbnailUrl || '',
        title: item.title || '',
        image: {
          byteSize: 0,
          contextLink: item.source || '',
          height: item.imageHeight || 0,
          thumbnailLink: item.thumbnailUrl || item.imageUrl || '',
          width: item.imageWidth || 0,
        },
      })
    );
  },
};

// ---- Mock -------------------------------------------------------------------
// Rich enough to exercise the modal grid (scroll, varied aspect ratios) without
// hitting a real provider. Enabled in dev via IMAGE_SEARCH_USE_MOCK=true.
//
// Uses LoremFlickr (https://loremflickr.com) — free, no API key, and returns
// real Flickr photos matching a keyword so typing "airpods" actually looks
// like airpods, not colored rectangles. `lock={n}` makes each tile stable so
// images don't reshuffle on every render.

const MOCK_RESULT_COUNT = 60;

// Mixed aspect ratios so the grid is tested against realistic SerpAPI variance
// rather than a uniform 3:2.
const MOCK_ASPECTS: Array<{ width: number; height: number }> = [
  { width: 600, height: 400 },
  { width: 400, height: 600 },
  { width: 800, height: 450 },
  { width: 500, height: 500 },
  { width: 700, height: 525 },
  { width: 480, height: 720 },
];

// LoremFlickr only accepts comma-separated keyword tags (letters/digits/dashes).
// Strip anything else so a query like "red shoes, size 10!" still returns
// something instead of a 404.
function toFlickrTags(query: string): string {
  const cleaned = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3) // too many tags narrows results to nothing
    .join(',');
  return cleaned || 'product';
}

function buildMockResults(query: string, limit: number): ImageSearchResult[] {
  const tags = toFlickrTags(query);
  const count = Math.min(MOCK_RESULT_COUNT, limit);

  return Array.from({ length: count }, (_, i) => {
    const { width, height } = MOCK_ASPECTS[i % MOCK_ASPECTS.length];
    const thumbW = Math.round(width / 2);
    const thumbH = Math.round(height / 2);
    const lock = i + 1;

    return {
      title: `${query} ${i + 1}`,
      link: `https://loremflickr.com/${width}/${height}/${tags}?lock=${lock}`,
      image: {
        byteSize: 0,
        contextLink: 'https://loremflickr.com',
        height,
        thumbnailLink: `https://loremflickr.com/${thumbW}/${thumbH}/${tags}?lock=${lock}`,
        width,
      },
    };
  });
}

const mockProvider: ImageSearchProvider = {
  name: 'mock',
  isConfigured: () => true,
  async search(query, limit) {
    // Loading-state delay so spinners/disabled-states are visible during UI work.
    await new Promise((resolve) => setTimeout(resolve, 300));
    return buildMockResults(query || 'mock', limit);
  },
};

// ---- Provider selection -----------------------------------------------------

const ALL_PROVIDERS: Record<ProviderName, ImageSearchProvider> = {
  serpapi: serpApiProvider,
  serper: serperProvider,
  mock: mockProvider,
};

function getProviderChain(): ImageSearchProvider[] {
  // Dev override: force mock results regardless of keys or provider config, so
  // UI iteration never burns real quota.
  if (process.env.IMAGE_SEARCH_USE_MOCK === 'true') {
    return [mockProvider];
  }

  // IMAGE_SEARCH_PROVIDERS is a comma-separated priority list, e.g. "serpapi,serper".
  // IMAGE_SEARCH_PROVIDER (singular) is accepted as a legacy alias.
  const raw =
    process.env.IMAGE_SEARCH_PROVIDERS ||
    process.env.IMAGE_SEARCH_PROVIDER ||
    'serpapi,serper';

  const names = raw
    .split(',')
    .map((n) => n.trim().toLowerCase())
    .filter((n): n is ProviderName => n in ALL_PROVIDERS);

  const chain = names
    .map((n) => ALL_PROVIDERS[n])
    .filter((p) => p.isConfigured());

  // Always keep mock as a last resort when nothing else is configured so local
  // dev without keys isn't a hard failure.
  if (chain.length === 0) return [mockProvider];
  return chain;
}

// ---- Cache ------------------------------------------------------------------
// In-memory cache shared across providers. The whole point is stretching the
// free tier, so if Serper answered "airpods" last Tuesday, we don't hit SerpAPI
// for the same thing today.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const resultCache = new Map<
  string,
  { expires: number; items: ImageSearchResult[] }
>();

function cacheKey(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

function readCache(key: string): ImageSearchResult[] | null {
  const hit = resultCache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    resultCache.delete(key);
    return null;
  }
  return hit.items;
}

function writeCache(key: string, items: ImageSearchResult[]) {
  if (resultCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = resultCache.keys().next().value;
    if (oldestKey) resultCache.delete(oldestKey);
  }
  resultCache.set(key, { expires: Date.now() + CACHE_TTL_MS, items });
}

// ---- Route ------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    );
  }

  const trimmed = query.trim();

  // Dev override: pretend all providers have hit quota, so the error-state UI
  // can be exercised without revoking real keys. Bypasses cache so repeated
  // calls keep returning the error rather than a stale cached success.
  if (process.env.IMAGE_SEARCH_SIMULATE_QUOTA === 'true') {
    return NextResponse.json(
      {
        error: 'quota_exceeded',
        message:
          'Simulated quota exhaustion (IMAGE_SEARCH_SIMULATE_QUOTA=true).',
        exhausted: ['serpapi', 'serper'],
      },
      { status: 429 }
    );
  }

  const key = cacheKey(trimmed);

  const cached = readCache(key);
  if (cached) {
    return NextResponse.json({ items: cached, cached: true });
  }

  const chain = getProviderChain();
  const quotaExhausted: ProviderName[] = [];

  for (const provider of chain) {
    try {
      const items = await provider.search(trimmed, 100);
      writeCache(key, items);
      return NextResponse.json({
        items,
        provider: provider.name,
        ...(quotaExhausted.length > 0 && { fallbackFrom: quotaExhausted }),
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        quotaExhausted.push(error.provider);
        console.warn(
          `Quota exhausted on ${error.provider}; trying next provider.`
        );
        continue;
      }
      console.error(`Image search failed (provider=${provider.name}):`, error);
      return NextResponse.json(
        { error: 'Failed to process image search' },
        { status: 500 }
      );
    }
  }

  // All providers hit quota.
  return NextResponse.json(
    {
      error: 'quota_exceeded',
      message: 'All image search providers have hit their quota.',
      exhausted: quotaExhausted,
    },
    { status: 429 }
  );
}
