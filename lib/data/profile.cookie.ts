// The active-profile selection. Its own module, importing neither `db` nor
// NextAuth, so a caller needing only the cookie's name and attributes does not
// drag the data layer in with them.
import { cookies } from 'next/headers';

// Mirrored as ACTIVE_PROFILE_COOKIE in e2e/helpers/activeProfile.ts.
export const ACTIVE_PROFILE_COOKIE = 'active_profile';

// 30 days — NextAuth's default JWT session lifetime, so the selection expires
// with the session that authorized it rather than outliving it. Not readable
// by client script: the selection is an authorization input, not a display
// preference.
export const ACTIVE_PROFILE_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV !== 'development',
  maxAge: 30 * 24 * 60 * 60,
} as const;

// Returned unvalidated: the stored value is matched against the viewer's own
// membership rows, so a forged or stale id fails to match and never reaches a
// query naming it.
export async function readActiveProfileSelection(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_PROFILE_COOKIE)?.value ?? null;
}
