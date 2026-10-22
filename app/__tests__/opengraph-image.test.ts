import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Image from '../opengraph-image';

describe('BrandCardRoute', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('NetworkBlocked_RendersPngUnder600KB', async () => {
    const res = await Image();
    const buf = Buffer.from(await res.arrayBuffer());

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect(buf.byteLength).toBeLessThan(600 * 1024);
  });
});
