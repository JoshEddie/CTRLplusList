export function htmlWithJsonLd(jsonLd: unknown, extraHead = ''): string {
  return `<!doctype html><html><head>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
${extraHead}
</head><body></body></html>`;
}

export const OG_ONLY_HTML = `<!doctype html><html><head>
<meta property="og:title" content="OG Widget" />
<meta property="og:description" content="From OpenGraph" />
<meta property="og:image" content="https://example.com/og.jpg" />
<meta property="product:price:amount" content="19.99" />
<meta property="product:price:currency" content="USD" />
<link rel="canonical" href="https://example.com/widget" />
</head><body></body></html>`;

export function htmlResponse(html: string, url = ''): Response {
  const response = new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
  if (url) Object.defineProperty(response, 'url', { value: url });
  return response;
}

export const PRODUCT_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Acme Widget',
  description: 'A fine widget',
  image: 'https://example.com/widget.jpg',
  url: 'https://example.com/widget',
  offers: { '@type': 'Offer', price: '24.50', priceCurrency: 'USD' },
};
