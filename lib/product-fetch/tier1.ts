import { isUnsafeFetchTarget } from '@/lib/product-fetch/ssrf';
import type { ExtractedProduct } from '@/lib/product-fetch/types';

const TIER1_TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 5;

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function normalizePrice(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '' && Number.isFinite(Number(trimmed))) {
      return trimmed;
    }
  }
  return undefined;
}

type JsonLdNode = Record<string, unknown>;

function isProductNode(node: unknown): node is JsonLdNode {
  if (typeof node !== 'object' || node === null) return false;
  const type = (node as JsonLdNode)['@type'];
  return (
    type === 'Product' || (Array.isArray(type) && type.includes('Product'))
  );
}

function findProductNode(parsed: unknown): JsonLdNode | undefined {
  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      const found = findProductNode(entry);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;
  if (isProductNode(parsed)) return parsed;
  const graph = (parsed as JsonLdNode)['@graph'];
  if (Array.isArray(graph)) {
    return graph.find(isProductNode);
  }
  return undefined;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (Array.isArray(value)) {
    return value.find(
      (v): v is string => typeof v === 'string' && v.trim() !== ''
    );
  }
  return undefined;
}

function extractOffer(offers: unknown): {
  price?: string;
  currency?: string;
} {
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (typeof offer !== 'object' || offer === null) return {};
  const node = offer as JsonLdNode;
  return {
    price: normalizePrice(node.price),
    currency: firstString(node.priceCurrency),
  };
}

export function extractJsonLd(html: string): ExtractedProduct | undefined {
  const scriptRe =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRe)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const product = findProductNode(parsed);
    if (!product) continue;
    const title = firstString(product.name);
    if (!title) continue;
    const imageValue = product.image;
    const image =
      typeof imageValue === 'object' &&
      imageValue !== null &&
      !Array.isArray(imageValue)
        ? firstString((imageValue as JsonLdNode).url)
        : firstString(imageValue);
    return {
      title,
      description: firstString(product.description),
      imageUrl: image,
      canonicalUrl: firstString(product.url),
      ...extractOffer(product.offers),
    };
  }
  return undefined;
}

function metaContent(html: string, property: string): string | undefined {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
      'i'
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
}

export function extractMeta(html: string): ExtractedProduct {
  const canonicalMatch =
    html.match(
      /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i
    ) ??
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  return {
    title: metaContent(html, 'og:title'),
    description: metaContent(html, 'og:description'),
    imageUrl: metaContent(html, 'og:image'),
    price: normalizePrice(metaContent(html, 'product:price:amount')),
    currency: metaContent(html, 'product:price:currency'),
    canonicalUrl: canonicalMatch?.[1]?.trim() || undefined,
  };
}

function parseUrl(value: string, base?: URL): URL | undefined {
  try {
    return new URL(value, base);
  } catch {
    return undefined;
  }
}

function redirectTarget(response: Response, from: URL): URL | null | undefined {
  if (response.status < 300 || response.status >= 400) return null;
  const location = response.headers.get('location');
  return location ? parseUrl(location, from) : null;
}

// Redirects are followed manually so the SSRF guard re-runs on every hop —
// a public URL must not be able to 302 into localhost or a private range.
async function followSafely(
  startUrl: URL,
  signal: AbortSignal,
  timeoutSignal: AbortSignal
): Promise<{ response: Response; finalUrl: URL } | undefined> {
  let currentUrl = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (await isUnsafeFetchTarget(currentUrl)) return undefined;
    let response: Response;
    try {
      response = await fetch(currentUrl.toString(), {
        redirect: 'manual',
        signal: timeoutSignal,
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml',
        },
      });
    } catch (error) {
      if (signal.aborted) throw error;
      return undefined;
    }
    const next = redirectTarget(response, currentUrl);
    if (next === null && response.ok) {
      return { response, finalUrl: currentUrl };
    }
    // Unread bodies hold the undici connection open until GC.
    void response.body?.cancel();
    if (!next) return undefined;
    currentUrl = next;
  }
  return undefined;
}

export async function fetchTier1(
  url: string,
  signal: AbortSignal
): Promise<ExtractedProduct | undefined> {
  const timeoutSignal = AbortSignal.any([
    signal,
    AbortSignal.timeout(TIER1_TIMEOUT_MS),
  ]);
  const startUrl = parseUrl(url);
  if (!startUrl) return undefined;
  const followed = await followSafely(startUrl, signal, timeoutSignal);
  if (!followed) return undefined;
  const { response, finalUrl } = followed;
  const html = await response.text();
  const jsonLd = extractJsonLd(html);
  const meta = extractMeta(html);
  const merged: ExtractedProduct = {
    ...meta,
    ...(jsonLd
      ? Object.fromEntries(
          Object.entries(jsonLd).filter(([, v]) => v !== undefined)
        )
      : {}),
    finalUrl: finalUrl.toString(),
  };
  return merged.title ? merged : undefined;
}
