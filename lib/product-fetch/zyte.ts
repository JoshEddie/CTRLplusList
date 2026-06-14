import type { ExtractedProduct } from '@/lib/product-fetch/types';
import { normalizeImageUrls, normalizePrice } from '@/lib/product-fetch/utils';

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
      // much faster than browser rendering) and the only mode where
      // followRedirect is accepted — bare `product: true` defaults to browser
      // params and 422s on followRedirect. ai:true turns on AI extraction,
      // which recovers the full image gallery from the same raw HTML where the
      // rule-based extractor returns only the main image.
      body: JSON.stringify({
        url,
        product: true,
        productOptions: { extractFrom: 'httpResponseBody', ai: true },
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

  const imageUrls = normalizeImageUrls([
    product.mainImage?.url,
    ...(product.images ?? []).map((image) => image.url),
  ]);

  return {
    title: product.name,
    description: product.description || undefined,
    imageUrl: imageUrls?.[0],
    imageUrls,
    price: normalizePrice(product.price),
    currency: product.currency || product.currencyRaw || undefined,
    canonicalUrl: product.canonicalUrl || undefined,
    finalUrl: product.url || payload.url || url,
  };
}
