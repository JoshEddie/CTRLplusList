import type { ProductResult } from '@/lib/product-fetch/types';

export const MOCK_HOSTNAME = 'mock.test';

// The one scenario the route must produce itself: its observable (HTTP 429)
// originates before the seam runs, so no fixture exists for it.
export const RATE_LIMITED_SCENARIO = 'rate-limited';

type Scenario =
  | 'success'
  | 'success-single-image'
  | 'success-long-title'
  | 'success-title-warn'
  | 'success-long-desc'
  | 'success-no-price'
  | 'success-no-image'
  | 'success-many-images'
  | 'fetch-failed'
  | 'timeout';

function picsum(seed: string): string {
  return `https://picsum.photos/seed/${seed}/400/400`;
}

const MANY_IMAGES = Array.from({ length: 10 }, (_, i) =>
  picsum(`mock-many-${i}`)
);

// The API can return a long description, but seedFromFetch deliberately drops
// it (extracted copy is marketing junk) — this fixture guards that drop: paste
// it and the note MUST start empty. The over-limit note state is reached only
// by the user typing, never by a fetch, so it is not a mock scenario.
const LONG_DESC =
  'This description runs well past the hundred-character limit so the ' +
  'deck-drops-a-fetched-description guard is exercised end to end.';

const FIXTURES: Record<Scenario, ProductResult> = {
  success: {
    ok: true,
    product: {
      title: 'Mock Espresso Machine',
      description: 'A dependable dual-boiler machine for daily shots.',
      imageUrl: picsum('mock-success-0'),
      imageUrls: [
        picsum('mock-success-0'),
        picsum('mock-success-1'),
        picsum('mock-success-2'),
        picsum('mock-success-3'),
      ],
      price: '349.99',
      currency: 'USD',
      canonicalUrl: 'https://mock.test/success',
      store: 'Mock Store',
    },
  },
  'success-single-image': {
    ok: true,
    product: {
      title: 'Mock Pour-Over Kettle',
      description: 'Gooseneck kettle with a single product photo.',
      imageUrl: picsum('mock-single'),
      imageUrls: [picsum('mock-single')],
      price: '59.00',
      currency: 'USD',
      canonicalUrl: 'https://mock.test/success-single-image',
      store: 'Mock Store',
    },
  },
  'success-long-title': {
    ok: true,
    product: {
      title:
        'Mock Ultra-Premium Professional-Grade Stainless Steel ' +
        'Twelve-Piece Cookware Set with Tempered Glass Lids and ' +
        'Ergonomic Stay-Cool Handles, Induction Compatible',
      description: 'A title long enough to exercise truncation tiers.',
      imageUrl: picsum('mock-long-title'),
      imageUrls: [picsum('mock-long-title'), picsum('mock-long-title-1')],
      price: '199.99',
      currency: 'USD',
      canonicalUrl: 'https://mock.test/success-long-title',
      store: 'Mock Store',
    },
  },
  'success-title-warn': {
    ok: true,
    product: {
      title: 'Mock Stainless Steel Cookware Set, 12-Piece with Glass Lids',
      description: 'A title in the warn band — over snappy, under the limit.',
      imageUrl: picsum('mock-title-warn'),
      imageUrls: [picsum('mock-title-warn')],
      price: '129.99',
      currency: 'USD',
      canonicalUrl: 'https://mock.test/success-title-warn',
      store: 'Mock Store',
    },
  },
  'success-no-price': {
    ok: true,
    product: {
      title: 'Mock Desk Lamp',
      description: 'A product extracted without a price.',
      imageUrl: picsum('mock-no-price'),
      imageUrls: [picsum('mock-no-price')],
      currency: 'USD',
      canonicalUrl: 'https://mock.test/success-no-price',
      store: 'Mock Store',
    },
  },
  'success-long-desc': {
    ok: true,
    product: {
      title: 'Mock Weighted Blanket',
      description: LONG_DESC,
      imageUrl: picsum('mock-long-desc'),
      imageUrls: [picsum('mock-long-desc'), picsum('mock-long-desc-1')],
      price: '89.00',
      currency: 'USD',
      canonicalUrl: 'https://mock.test/success-long-desc',
      store: 'Mock Store',
    },
  },
  'success-no-image': {
    ok: true,
    product: {
      title: 'Mock Gift Card',
      description: 'A product extracted without any imagery.',
      price: '25.00',
      currency: 'USD',
      canonicalUrl: 'https://mock.test/success-no-image',
      store: 'Mock Store',
    },
  },
  'success-many-images': {
    ok: true,
    product: {
      title: 'Mock Camera Kit',
      description: 'Ten image candidates to fill the selector.',
      imageUrl: MANY_IMAGES[0],
      imageUrls: MANY_IMAGES,
      price: '999.00',
      currency: 'USD',
      canonicalUrl: 'https://mock.test/success-many-images',
      store: 'Mock Store',
    },
  },
  'fetch-failed': { ok: false, error: 'fetch_failed' },
  timeout: { ok: false, error: 'timeout' },
};

function isLocalMode(): boolean {
  return process.env.USE_PG_DRIVER === '1';
}

export function mockScenarioOf(url: string): string | null {
  if (!isLocalMode()) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== MOCK_HOSTNAME) return null;
  return parsed.pathname.split('/').filter(Boolean)[0] ?? '';
}

export function resolveMockResult(url: string): ProductResult | null {
  const scenario = mockScenarioOf(url);
  if (scenario === null) return null;
  return (
    FIXTURES[scenario as Scenario] ?? { ok: false, error: 'fetch_failed' }
  );
}
