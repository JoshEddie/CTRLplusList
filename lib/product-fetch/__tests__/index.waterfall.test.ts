import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../zyte', () => ({ fetchZyte: vi.fn() }));

import { fetchProduct } from '../index';
import { fetchZyte } from '../zyte';

const zyte = vi.mocked(fetchZyte);

describe('fetchProduct', () => {
  beforeEach(() => {
    zyte.mockReset();
  });

  it('ZyteThrowsNonAbortError_Rethrows', async () => {
    zyte.mockRejectedValue(new Error('boom'));
    await expect(fetchProduct('https://example.com/p')).rejects.toThrow('boom');
  });

  it('ZyteUndefinedBothAttempts_RetriesThenFetchFailed', async () => {
    zyte.mockResolvedValue(undefined);
    expect(await fetchProduct('https://example.com/p')).toEqual({
      ok: false,
      error: 'fetch_failed',
    });
    expect(zyte).toHaveBeenCalledTimes(2);
  });

  it('ZyteUndefinedThenTitled_RetrySucceeds', async () => {
    zyte
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ title: 'Widget', finalUrl: 'https://a.co/d/1' });
    const result = await fetchProduct('https://a.co/d/1');
    expect(result.ok).toBe(true);
    expect(zyte).toHaveBeenCalledTimes(2);
  });

  it('ZyteNoFinalUrl_DerivesStoreFromCanonicalUrl', async () => {
    zyte.mockResolvedValue({
      title: 'Widget',
      canonicalUrl: 'https://www.walmart.com/ip/123',
      finalUrl: undefined,
    });
    const result = await fetchProduct('https://redir.example/abc');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.product.store).toBe('Walmart');
  });

  it('ZyteNoFinalUrlNoCanonical_DerivesStoreFromPastedUrl', async () => {
    zyte.mockResolvedValue({
      title: 'Widget',
      canonicalUrl: undefined,
      finalUrl: undefined,
    });
    const result = await fetchProduct('https://www.costco.com/p/1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.product.store).toBe('Costco');
  });

  it('SignalAbortedAfterNamelessResult_BreaksWithoutRetry', async () => {
    // Zyte resolves a no-title result (not a throw) but the shared signal is
    // already aborted — the loop must break before burning the retry rather
    // than re-rolling against a dead budget.
    const controller = new AbortController();
    zyte.mockImplementation(async () => {
      controller.abort();
      return undefined;
    });
    const result = await fetchProduct('https://example.com/p', {
      signal: controller.signal,
    });
    expect(result).toEqual({ ok: false, error: 'fetch_failed' });
    expect(zyte).toHaveBeenCalledTimes(1);
  });
});
