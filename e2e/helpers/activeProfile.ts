import type { BrowserContext } from '@playwright/test';

// Mirrors ACTIVE_PROFILE_COOKIE / ACTIVE_PROFILE_COOKIE_ATTRIBUTES in
// lib/data/profile.cookie.ts, kept as separate literals for the same reason
// GUEST_SESSION_USER is in constants.ts: importing the app module would drag
// `next/headers` into the Playwright process.
export const ACTIVE_PROFILE_COOKIE = 'active_profile';

// Starts a browser context acting as a profile other than the viewer's own, by
// setting the application's own selection cookie — `httpOnly` included, so the
// pin is the same shape the switch action writes. There is deliberately no
// environment override for the acting profile: an environment variable is
// process-global and could not give one spec a managed-profile context and
// another the self-profile.
//
// A context carrying no selection cookie already resolves to the self-profile,
// so the un-pinned starting state needs nothing at all — and the profile-switch
// flow takes exactly that path, so the switching mechanism stays exercised
// rather than bypassed.
export async function pinActingProfile(
  context: BrowserContext,
  profileId: string,
  baseURL: string
): Promise<void> {
  await context.addCookies([
    {
      name: ACTIVE_PROFILE_COOKIE,
      value: profileId,
      domain: new URL(baseURL).hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}
