import { vi } from 'vitest';

// An in-memory cookie jar standing in for the request scope. Production code
// that resolves an identity reads the active-profile selection through
// `cookies()`, which throws outside a Next request — so any suite driving that
// code needs a jar, and a suite asserting a read path wrote nothing needs one
// it can inspect.
//
// The options a write carries are kept alongside the value: the selection
// cookie's `httpOnly` is what keeps an authorization input out of reach of
// client script, so it has to be observable from a test.
type JarEntry = { value: string; options?: Record<string, unknown> };

const jar = new Map<string, JarEntry>();

export function setTestCookie(name: string, value: string): void {
  jar.set(name, { value });
}

export function readTestCookie(name: string): string | undefined {
  return jar.get(name)?.value;
}

export function readTestCookieOptions(
  name: string
): Record<string, unknown> | undefined {
  return jar.get(name)?.options;
}

export function clearTestCookies(): void {
  jar.clear();
}

export function mockNextHeaders(): void {
  vi.mock('next/headers', () => ({
    cookies: async () => ({
      get: (name: string) => {
        const entry = jar.get(name);
        return entry ? { name, value: entry.value } : undefined;
      },
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        jar.set(name, { value, options });
      },
      delete: (name: string) => {
        jar.delete(name);
      },
    }),
  }));
}
