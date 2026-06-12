import { normalizePrice } from '@/lib/product-fetch/tier1';
import type { ExtractedProduct } from '@/lib/product-fetch/types';

const ZYTE_ENDPOINT = 'https://api.zyte.com/v1/extract';

export function isZyteConfigured(): boolean {
  return Boolean(process.env.ZYTE_API_KEY);
}

type ZyteProduct = {
  name?: string;
  description?: string;
  mainImage?: { url?: string };
  images?: { url?: string }[];
  price?: string | number;
  currency?: string;
  currencyRaw?: string;
  canonicalUrl?: string;
  url?: string;
};

export async function fetchZyte(
  url: string,
  signal: AbortSignal
): Promise<ExtractedProduct | undefined> {
  const apiKey = process.env.ZYTE_API_KEY;
  if (!apiKey) return undefined;

  let response: Response;
  try {
    response = await fetch(ZYTE_ENDPOINT, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      // extractFrom httpResponseBody = HTTP-based extraction (cheaper and
      // much faster than the default browser rendering) and the only mode
      // where followRedirect is accepted — bare `product: true` defaults to
      // browser params and 422s on followRedirect.
      body: JSON.stringify({
        url,
        product: true,
        productOptions: { extractFrom: 'httpResponseBody' },
        followRedirect: true,
      }),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    return undefined;
  }
  if (!response.ok) return undefined;

  let payload: { product?: ZyteProduct; url?: string };
  try {
    payload = await response.json();
  } catch {
    return undefined;
  }
  const product = payload.product;
  if (!product?.name) return undefined;

  return {
    title: product.name,
    description: product.description || undefined,
    imageUrl: product.mainImage?.url || product.images?.[0]?.url || undefined,
    price: normalizePrice(product.price),
    currency: product.currency || product.currencyRaw || undefined,
    canonicalUrl: product.canonicalUrl || undefined,
    finalUrl: product.url || payload.url || url,
  };
}
