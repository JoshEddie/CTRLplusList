import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchZyte, isZyteConfigured } from '../zyte';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ZYTE_PRODUCT_BODY = {
  url: 'https://www.amazon.com/dp/B0TEST',
  product: {
    name: 'Zyte Widget',
    description: 'Extracted by Zyte',
    mainImage: { url: 'https://img/main.jpg' },
    price: '42.00',
    currency: 'USD',
    canonicalUrl: 'https://www.amazon.com/dp/B0TEST',
    url: 'https://www.amazon.com/dp/B0TEST',
  },
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('ZYTE_API_KEY', 'test-key');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('isZyteConfigured', () => {
  it('KeySet_ReturnsTrue', () => {
    expect(isZyteConfigured()).toBe(true);
  });

  it('KeyUnset_ReturnsFalse', () => {
    vi.stubEnv('ZYTE_API_KEY', '');
    expect(isZyteConfigured()).toBe(false);
  });
});

describe('fetchZyte', () => {
  it('KeyUnset_ReturnsUndefined-NoFetch', async () => {
    vi.stubEnv('ZYTE_API_KEY', '');
    const result = await fetchZyte(
      'https://example.com',
      new AbortController().signal
    );
    expect(result).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ProductResponse_ReturnsNormalizedExtraction', async () => {
    fetchMock.mockResolvedValue(jsonResponse(ZYTE_PRODUCT_BODY));
    const result = await fetchZyte(
      'https://a.co/d/share',
      new AbortController().signal
    );
    expect(result).toEqual({
      title: 'Zyte Widget',
      description: 'Extracted by Zyte',
      imageUrl: 'https://img/main.jpg',
      price: '42.00',
      currency: 'USD',
      canonicalUrl: 'https://www.amazon.com/dp/B0TEST',
      finalUrl: 'https://www.amazon.com/dp/B0TEST',
    });
  });

  it('ProductResponse_SendsBasicAuthAndExtractBody', async () => {
    fetchMock.mockResolvedValue(jsonResponse(ZYTE_PRODUCT_BODY));
    await fetchZyte('https://a.co/d/share', new AbortController().signal);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.zyte.com/v1/extract');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(
      `Basic ${Buffer.from('test-key:').toString('base64')}`
    );
    expect(JSON.parse(init.body)).toEqual({
      url: 'https://a.co/d/share',
      product: true,
      productOptions: { extractFrom: 'httpResponseBody' },
      followRedirect: true,
    });
  });

  it('NamelessProduct_ReturnsUndefined', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ product: { price: '5' } }));
    expect(
      await fetchZyte('https://example.com', new AbortController().signal)
    ).toBeUndefined();
  });

  it('NonNumericPrice_OmitsPrice', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ product: { name: 'W', price: 'USD 42' } })
    );
    const result = await fetchZyte(
      'https://example.com',
      new AbortController().signal
    );
    expect(result?.price).toBeUndefined();
  });

  it('FallbackImageFromImagesArray_ReturnsFirstImageUrl', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        product: { name: 'W', images: [{ url: 'https://img/0.jpg' }] },
      })
    );
    const result = await fetchZyte(
      'https://example.com',
      new AbortController().signal
    );
    expect(result?.imageUrl).toBe('https://img/0.jpg');
  });

  it('Non200Response_ReturnsUndefined', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'bad' }, 422));
    expect(
      await fetchZyte('https://example.com', new AbortController().signal)
    ).toBeUndefined();
  });

  it('NetworkError_ReturnsUndefined', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(
      await fetchZyte('https://example.com', new AbortController().signal)
    ).toBeUndefined();
  });

  it('CallerAborted_RethrowsAbort', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });
    await expect(
      fetchZyte('https://example.com', controller.signal)
    ).rejects.toThrow('Aborted');
  });
});
