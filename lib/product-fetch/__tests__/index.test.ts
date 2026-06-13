import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchProduct, storeNameFromUrl } from '../index';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ZYTE_BODY = {
  url: 'https://www.target.com/p/1',
  product: {
    name: 'Acme Widget',
    description: 'A fine widget',
    mainImage: { url: 'https://img/main.jpg' },
    images: [{ url: 'https://img/main.jpg' }, { url: 'https://img/alt.jpg' }],
    price: '24.50',
    currency: 'USD',
    canonicalUrl: 'https://www.target.com/p/1',
    url: 'https://www.target.com/p/1',
  },
};

describe('storeNameFromUrl', () => {
  it('AmazonUrl_ReturnsAmazon', () => {
    expect(storeNameFromUrl('https://www.amazon.com/dp/B0TEST')).toBe('Amazon');
  });

  it('AmazonSubdomain_ReturnsAmazon', () => {
    expect(storeNameFromUrl('https://smile.amazon.com/dp/B0TEST')).toBe(
      'Amazon'
    );
  });

  it('ShortShareDomain_ReturnsAmazon', () => {
    expect(storeNameFromUrl('https://a.co/d/xyz')).toBe('Amazon');
  });

  it('UnknownRetailer_ReturnsBareHostname', () => {
    expect(storeNameFromUrl('https://www.shop.example.com/p/1')).toBe(
      'shop.example.com'
    );
  });

  it('UnparseableUrl_ReturnsInputUnchanged', () => {
    expect(storeNameFromUrl('not a url')).toBe('not a url');
  });
});

describe('fetchProduct', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ZYTE_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('ZyteSuccess_ReturnsNormalizedProduct', async () => {
    vi.stubEnv('ZYTE_API_KEY', 'key');
    fetchMock.mockResolvedValue(jsonResponse(ZYTE_BODY));
    const result = await fetchProduct('https://www.target.com/p/1');
    expect(result).toEqual({
      ok: true,
      product: {
        title: 'Acme Widget',
        description: 'A fine widget',
        imageUrl: 'https://img/main.jpg',
        imageUrls: ['https://img/main.jpg', 'https://img/alt.jpg'],
        price: '24.50',
        currency: 'USD',
        canonicalUrl: 'https://www.target.com/p/1',
        store: 'Target',
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.zyte.com/v1/extract');
  });

  it('KeyUnset_ReturnsFetchFailed-NoFetch', async () => {
    const result = await fetchProduct('https://example.com/p/1');
    expect(result).toEqual({ ok: false, error: 'fetch_failed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ZyteNamelessBothAttempts_RetriesThenFetchFailed', async () => {
    vi.stubEnv('ZYTE_API_KEY', 'key');
    fetchMock.mockResolvedValue(jsonResponse({ product: { description: 'x' } }));
    const result = await fetchProduct('https://example.com/p/1');
    expect(result).toEqual({ ok: false, error: 'fetch_failed' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ZyteFailsThenSucceeds_RetryReturnsProduct', async () => {
    vi.stubEnv('ZYTE_API_KEY', 'key');
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ product: { description: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(ZYTE_BODY));
    const result = await fetchProduct('https://www.target.com/p/1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.product.title).toBe('Acme Widget');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('CallerSignalAborted_ReturnsTimeout', async () => {
    vi.stubEnv('ZYTE_API_KEY', 'key');
    const controller = new AbortController();
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      controller.abort();
      return Promise.reject(
        Object.assign(new DOMException('Aborted', 'AbortError'), {
          signal: init.signal,
        })
      );
    });
    const result = await fetchProduct('https://example.com/p/1', {
      signal: controller.signal,
    });
    expect(result).toEqual({ ok: false, error: 'timeout' });
  });

  it('NoCanonicalOrFinalUrl_DerivesStoreFromPastedUrl', async () => {
    vi.stubEnv('ZYTE_API_KEY', 'key');
    fetchMock.mockResolvedValue(jsonResponse({ product: { name: 'W' } }));
    const result = await fetchProduct('https://www.etsy.com/listing/1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.product.store).toBe('Etsy');
  });
});
