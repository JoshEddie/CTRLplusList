import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractJsonLd,
  extractMeta,
  fetchTier1,
  normalizePrice,
} from '../tier1';
import {
  htmlResponse,
  htmlWithJsonLd,
  OG_ONLY_HTML,
  PRODUCT_JSON_LD,
} from './test-helpers';

describe('normalizePrice', () => {
  it('NumericString_ReturnsTrimmedString', () => {
    expect(normalizePrice(' 24.50 ')).toBe('24.50');
  });

  it('FiniteNumber_ReturnsStringified', () => {
    expect(normalizePrice(24.5)).toBe('24.5');
  });

  it('CurrencyPrefixedString_ReturnsUndefined', () => {
    expect(normalizePrice('$24.50')).toBeUndefined();
  });

  it('EmptyString_ReturnsUndefined', () => {
    expect(normalizePrice('')).toBeUndefined();
  });

  it('NaNNumber_ReturnsUndefined', () => {
    expect(normalizePrice(NaN)).toBeUndefined();
  });

  it('NullInput_ReturnsUndefined', () => {
    expect(normalizePrice(null)).toBeUndefined();
  });
});

describe('extractJsonLd', () => {
  it('PlainProductNode_ReturnsAllFields', () => {
    const result = extractJsonLd(htmlWithJsonLd(PRODUCT_JSON_LD));
    expect(result).toEqual({
      title: 'Acme Widget',
      description: 'A fine widget',
      imageUrl: 'https://example.com/widget.jpg',
      canonicalUrl: 'https://example.com/widget',
      price: '24.50',
      currency: 'USD',
    });
  });

  it('GraphWrappedProduct_ReturnsProductFields', () => {
    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'BreadcrumbList' },
        { '@type': 'Product', name: 'Graph Widget', offers: { price: 5 } },
      ],
    };
    const result = extractJsonLd(htmlWithJsonLd(graph));
    expect(result?.title).toBe('Graph Widget');
    expect(result?.price).toBe('5');
  });

  it('ArrayTypeProduct_ReturnsTitle', () => {
    const node = { '@type': ['Product', 'Thing'], name: 'Array Widget' };
    expect(extractJsonLd(htmlWithJsonLd(node))?.title).toBe('Array Widget');
  });

  it('ImageObjectNode_ReturnsNestedUrl', () => {
    const node = {
      '@type': 'Product',
      name: 'Img Widget',
      image: { '@type': 'ImageObject', url: 'https://example.com/i.jpg' },
    };
    expect(extractJsonLd(htmlWithJsonLd(node))?.imageUrl).toBe(
      'https://example.com/i.jpg'
    );
  });

  it('ImageArray_ReturnsFirstString', () => {
    const node = {
      '@type': 'Product',
      name: 'Multi Img',
      image: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    };
    expect(extractJsonLd(htmlWithJsonLd(node))?.imageUrl).toBe(
      'https://example.com/1.jpg'
    );
  });

  it('NonNumericOfferPrice_OmitsPrice', () => {
    const node = {
      '@type': 'Product',
      name: 'Pricey',
      offers: { price: '$24.50', priceCurrency: 'USD' },
    };
    const result = extractJsonLd(htmlWithJsonLd(node));
    expect(result?.price).toBeUndefined();
    expect(result?.currency).toBe('USD');
  });

  it('MalformedJsonBlock_SkipsToNextValidBlock', () => {
    const html = `<script type="application/ld+json">{not json</script>
${htmlWithJsonLd(PRODUCT_JSON_LD)}`;
    expect(extractJsonLd(html)?.title).toBe('Acme Widget');
  });

  it('NoProductNode_ReturnsUndefined', () => {
    expect(
      extractJsonLd(htmlWithJsonLd({ '@type': 'WebSite', name: 'Site' }))
    ).toBeUndefined();
  });

  it('OfferArray_ReturnsFirstOfferPrice', () => {
    const node = {
      '@type': 'Product',
      name: 'Offers',
      offers: [{ price: '9.99' }, { price: '19.99' }],
    };
    expect(extractJsonLd(htmlWithJsonLd(node))?.price).toBe('9.99');
  });
});

describe('extractMeta', () => {
  it('OpenGraphTags_ReturnsAllFields', () => {
    expect(extractMeta(OG_ONLY_HTML)).toEqual({
      title: 'OG Widget',
      description: 'From OpenGraph',
      imageUrl: 'https://example.com/og.jpg',
      price: '19.99',
      currency: 'USD',
      canonicalUrl: 'https://example.com/widget',
    });
  });

  it('ContentBeforeProperty_ReturnsValue', () => {
    const html = `<meta content="Reversed Title" property="og:title" />`;
    expect(extractMeta(html).title).toBe('Reversed Title');
  });

  it('EmptyHtml_ReturnsAllUndefined', () => {
    expect(extractMeta('<html></html>')).toEqual({
      title: undefined,
      description: undefined,
      imageUrl: undefined,
      price: undefined,
      currency: undefined,
      canonicalUrl: undefined,
    });
  });
});

describe('fetchTier1', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('JsonLdPage_ReturnsExtraction-SendsBrowserUA', async () => {
    fetchMock.mockResolvedValue(
      htmlResponse(htmlWithJsonLd(PRODUCT_JSON_LD), 'https://example.com/widget')
    );
    const result = await fetchTier1(
      'https://example.com/widget',
      new AbortController().signal
    );
    expect(result?.title).toBe('Acme Widget');
    expect(result?.finalUrl).toBe('https://example.com/widget');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.redirect).toBe('follow');
    expect(init.headers['User-Agent']).toMatch(/Mozilla/);
  });

  it('OgOnlyPage_ReturnsMetaFallback', async () => {
    fetchMock.mockResolvedValue(htmlResponse(OG_ONLY_HTML));
    const result = await fetchTier1(
      'https://example.com/widget',
      new AbortController().signal
    );
    expect(result?.title).toBe('OG Widget');
    expect(result?.price).toBe('19.99');
  });

  it('JsonLdAndOgPage_JsonLdWins', async () => {
    fetchMock.mockResolvedValue(
      htmlResponse(
        htmlWithJsonLd(
          PRODUCT_JSON_LD,
          '<meta property="og:title" content="OG Loser" />'
        )
      )
    );
    const result = await fetchTier1(
      'https://example.com/widget',
      new AbortController().signal
    );
    expect(result?.title).toBe('Acme Widget');
  });

  it('RedirectedResponse_ReturnsFinalUrl', async () => {
    fetchMock.mockResolvedValue(
      htmlResponse(
        htmlWithJsonLd(PRODUCT_JSON_LD),
        'https://www.amazon.com/dp/B0TEST'
      )
    );
    const result = await fetchTier1(
      'https://a.co/d/share',
      new AbortController().signal
    );
    expect(result?.finalUrl).toBe('https://www.amazon.com/dp/B0TEST');
  });

  it('TitlelessPage_ReturnsUndefined', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html><body>hi</body></html>'));
    expect(
      await fetchTier1('https://example.com', new AbortController().signal)
    ).toBeUndefined();
  });

  it('Non200Response_ReturnsUndefined', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 403 }));
    expect(
      await fetchTier1('https://example.com', new AbortController().signal)
    ).toBeUndefined();
  });

  it('NetworkError_ReturnsUndefined', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(
      await fetchTier1('https://example.com', new AbortController().signal)
    ).toBeUndefined();
  });

  it('CallerAborted_RethrowsAbort', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });
    await expect(
      fetchTier1('https://example.com', controller.signal)
    ).rejects.toThrow('Aborted');
  });
});
