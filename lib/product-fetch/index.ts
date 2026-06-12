import { fetchTier1 } from '@/lib/product-fetch/tier1';
import type {
  ExtractedProduct,
  ProductResult,
} from '@/lib/product-fetch/types';
import { fetchZyte } from '@/lib/product-fetch/zyte';

const WATERFALL_TIMEOUT_MS = 20_000;

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
  const signals = [AbortSignal.timeout(WATERFALL_TIMEOUT_MS)];
  if (opts.signal) signals.push(opts.signal);
  const signal = AbortSignal.any(signals);

  try {
    const tier1 = await fetchTier1(url, signal);
    if (tier1?.title) return toResult({ ...tier1, title: tier1.title }, url);

    const tier2 = await fetchZyte(url, signal);
    if (tier2?.title) return toResult({ ...tier2, title: tier2.title }, url);

    return { ok: false, error: 'fetch_failed' };
  } catch (error) {
    if (signal.aborted) return { ok: false, error: 'timeout' };
    throw error;
  }
}
