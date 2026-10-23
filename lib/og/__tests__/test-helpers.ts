import { afterEach, beforeEach, expect, vi } from 'vitest';

// next/og fetches any glyph its fonts lack; a rejected fetch fails the render,
// so a passing card draws from the bundled assets alone.
export function blockNetwork(): void {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
}

export async function expectSmallPng(res: Response): Promise<Buffer> {
  const buf = Buffer.from(await res.arrayBuffer());
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/png');
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  expect(buf.byteLength).toBeLessThan(600 * 1024);
  return buf;
}
