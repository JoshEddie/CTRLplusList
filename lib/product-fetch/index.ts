import type {
  ExtractedProduct,
  ProductResult,
} from '@/lib/product-fetch/types';
import { fetchZyte } from '@/lib/product-fetch/zyte';

// App-side abort budget shared across both attempts (MAX_ATTEMPTS). Kept well
// under any platform function cap (Vercel Hobby kills the route at 60s) so a
// slow Zyte call returns a graceful `timeout` rather than a raw platform 504.
const FETCH_TIMEOUT_MS = 35_000;

// One retry on a no-title result, to re-roll intermittent bot-wall failures.
const MAX_ATTEMPTS = 2;

const KNOWN_RETAILERS: Record<string, string> = {
  'amazon.com': 'Amazon',
  'a.co': 'Amazon',
  'etsy.com': 'Etsy',
  'target.com': 'Target',
  'walmart.com': 'Walmart',
  'bestbuy.com': 'Best Buy',
  'ebay.com': 'eBay',
  'homedepot.com': 'Home Depot',
  'lowes.com': "Lowe's",
  'costco.com': 'Costco',
  'wayfair.com': 'Wayfair',
  'ikea.com': 'IKEA',
  'rei.com': 'REI',
  'nordstrom.com': 'Nordstrom',
  'macys.com': "Macy's",
  'kohls.com': "Kohl's",
};

export function storeNameFromUrl(url: string): string {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return url;
  }
  const bare = hostname.replace(/^www\./i, '').toLowerCase();
  const known = Object.keys(KNOWN_RETAILERS).find(
    (domain) => bare === domain || bare.endsWith(`.${domain}`)
  );
  return known ? KNOWN_RETAILERS[known] : bare;
}

function toResult(
  extracted: ExtractedProduct & { title: string },
  fallbackUrl: string
): ProductResult {
  return {
    ok: true,
    product: {
      title: extracted.title,
      description: extracted.description,
      imageUrl: extracted.imageUrl,
      imageUrls: extracted.imageUrls,
      price: extracted.price,
      currency: extracted.currency,
      canonicalUrl: extracted.canonicalUrl,
      store: storeNameFromUrl(
        extracted.finalUrl || extracted.canonicalUrl || fallbackUrl
      ),
    },
  };
}

export async function fetchProduct(
  url: string,
  opts: { signal?: AbortSignal } = {}
): Promise<ProductResult> {
  const signals = [AbortSignal.timeout(FETCH_TIMEOUT_MS)];
  if (opts.signal) signals.push(opts.signal);
  const signal = AbortSignal.any(signals);

  try {
    // Bot-walled sites (Etsy) extract intermittently — Zyte may get a
    // challenge page on one attempt and clean HTML on the next. One retry
    // re-rolls before falling back to manual entry; the shared signal keeps
    // both attempts inside the timeout budget.
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const extracted = await fetchZyte(url, signal);
      if (extracted?.title) {
        return toResult({ ...extracted, title: extracted.title }, url);
      }
      if (signal.aborted) break;
    }
    return { ok: false, error: 'fetch_failed' };
  } catch (error) {
    if (signal.aborted) return { ok: false, error: 'timeout' };
    throw error;
  }
}
