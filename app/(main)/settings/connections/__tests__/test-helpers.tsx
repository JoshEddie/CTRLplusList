import type { Session } from 'next-auth';
import { vi } from 'vitest';

// The `next-auth` Session shape the connection sections `await auth()` into.
// `email: null` models a signed-in session missing an email (the first
// redirect leg); the default is a resolvable email.
export function makeSession(
  overrides: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  } = {}
): Session {
  return {
    user: {
      email:
        overrides.email === undefined ? 'viewer@test.local' : overrides.email,
      name: overrides.name ?? null,
      image: overrides.image ?? null,
    },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

// The `getUserIdByEmail` row the sections resolve the viewer into.
export function makeViewer(overrides: { id?: string } = {}): { id: string } {
  return { id: overrides.id ?? 'viewer' };
}

// next/navigation redirect() sentinel — mirrors the repo-wide `REDIRECT:${url}`
// pattern so each auth-guard leg is assertable by the thrown message. Shared by
// the three section tests, which each wire it into their own `next/navigation`
// mock factory (alongside a `useRouter` stub the real ConnectionsAction needs).
export const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

// The `next/link` mock is the canonical MockNextLink in
// app/ui/components/__tests__/test-helpers — reused, not reduplicated.
