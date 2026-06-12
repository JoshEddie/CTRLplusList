import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchProduct, storeNameFromUrl } from '../index';
import {
  htmlResponse,
  htmlWithJsonLd,
  PRODUCT_JSON_LD,
} from './test-helpers';

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

  it('Tier1Success_ReturnsProduct-NoZyteCall', async () => {
    vi.stubEnv('ZYTE_API_KEY', 'key');
    fetchMock.mockResolvedValue(
      htmlResponse(htmlWithJsonLd(PRODUCT_JSON_LD), 'https://www.target.com/p/1')
    );
    const result = await fetchProduct('https://www.target.com/p/1');
    expect(result).toEqual({
      ok: true,
      product: {
        title: 'Acme Widget',
        description: 'A fine widget',
        imageUrl: 'https://example.com/widget.jpg',
        price: '24.50',
        currency: 'USD',
        canonicalUrl: 'https://example.com/widget',
        store: 'Target',
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Tier1Fails_FallsToZyte', async () => {
    vi.stubEnv('ZYTE_API_KEY', 'key');
    fetchMock
      .mockResolvedValueOnce(htmlResponse('<html></html>'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            product: { name: 'Zyte Widget', url: 'https://www.amazon.com/dp/1' },
          }),
          { status: 200 }
        )
      );
    const result = await fetchProduct('https://a.co/d/xyz');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.product.title).toBe('Zyte Widget');
      expect(result.product.store).toBe('Amazon');
    }
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.zyte.com/v1/extract');
  });

  it('Tier1FailsKeyUnset_ReturnsFetchFailed-NoZyteCall', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html></html>'));
    const result = await fetchProduct('https://example.com/p/1');
    expect(result).toEqual({ ok: false, error: 'fetch_failed' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('CallerSignalAborted_ReturnsTimeout', async () => {
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

  it('FinalUrlMissing_DerivesStoreFromPastedUrl', async () => {
    fetchMock.mockResolvedValue(
      htmlResponse(htmlWithJsonLd({ '@type': 'Product', name: 'W' }))
    );
    const result = await fetchProduct('https://www.etsy.com/listing/1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.product.store).toBe('Etsy');
  });
});
