import { vi } from 'vitest';

export function mockNextCache(): void {
  vi.mock('next/cache', () => ({
    cacheTag: vi.fn(),
    unstable_cache: <T>(fn: T) => fn,
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
    updateTag: vi.fn(),
  }));
}
