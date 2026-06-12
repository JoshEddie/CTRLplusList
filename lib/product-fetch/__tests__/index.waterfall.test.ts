import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../tier1', () => ({ fetchTier1: vi.fn() }));
vi.mock('../zyte', () => ({ fetchZyte: vi.fn() }));

import { fetchProduct } from '../index';
import { fetchTier1 } from '../tier1';
import { fetchZyte } from '../zyte';

const tier1 = vi.mocked(fetchTier1);
const zyte = vi.mocked(fetchZyte);

describe('fetchProduct', () => {
  beforeEach(() => {
    tier1.mockReset();
    zyte.mockReset();
    zyte.mockResolvedValue(undefined);
  });

  it('Tier1ThrowsNonAbortError_Rethrows', async () => {
    tier1.mockRejectedValue(new Error('boom'));
    await expect(fetchProduct('https://example.com/p')).rejects.toThrow('boom');
  });

  it('Tier1NoFinalUrl_DerivesStoreFromCanonicalUrl', async () => {
    tier1.mockResolvedValue({
      title: 'Widget',
      canonicalUrl: 'https://www.walmart.com/ip/123',
      finalUrl: undefined,
    });
    const result = await fetchProduct('https://redir.example/abc');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.product.store).toBe('Walmart');
  });

  it('Tier1NoFinalUrlNoCanonical_DerivesStoreFromPastedUrl', async () => {
    tier1.mockResolvedValue({
      title: 'Widget',
      canonicalUrl: undefined,
      finalUrl: undefined,
    });
    const result = await fetchProduct('https://www.costco.com/p/1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.product.store).toBe('Costco');
  });
});
