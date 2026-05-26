import { describe, expect, it, vi } from 'vitest';
import { mockNextCache } from './next-cache';

mockNextCache();

describe('mockNextCache', () => {
  it('captures revalidateTag calls and makes cacheTag a no-op', async () => {
    const { revalidateTag, cacheTag } = await import('next/cache');
    revalidateTag('lists', 'max');
    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(['lists', 'max']);
    expect(cacheTag('items')).toBeUndefined();
  });
});
