import { accounts, users } from '@/db/schema';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from '../db';

type Callbacks = NonNullable<NextAuthConfig['callbacks']>;

// Store the full name (first + last) when Google provides both — used for
// disambiguation on the connections page.
export const signInCallback: NonNullable<Callbacks['signIn']> = async ({
  user,
  profile,
}) => {
  if (profile?.given_name && profile?.family_name) {
    user.name = `${profile.given_name} ${profile.family_name}`;
  } else if (profile?.given_name) {
    user.name = profile.given_name;
  }
  // else: keep whatever default user.name we received
  return true;
};

export const jwtCallback: NonNullable<Callbacks['jwt']> = ({
  token,
  trigger,
  session,
}) => {
  if (trigger === 'update') {
    token.name = session.user.name;
  }
  return token;
};

const nextAuth = NextAuth({
  theme: { logo: 'https://ctrlpluslist.com/ctrlpluslist_logo-hor-white.webp' },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [Google({ authorization: { params: { prompt: 'select_account' } } })],
  session: { strategy: 'jwt' },
  trustHost: true, // Trust the host in development
  callbacks: {
    signIn: signInCallback,
    jwt: jwtCallback,
  },
});

export const { handlers, signIn, signOut } = nextAuth;

// Local-mode auth bypass. Two orthogonal concerns that the old `AUTH_BYPASS`
// flag conflated are now separated:
//
//   1. WHETHER auth is bypassed (real Google OAuth off, sessions synthesized)
//      is governed by `USE_PG_DRIVER === '1'` — the same flag that points the
//      app at a localhost Postgres (see db/index.ts). It does NOT depend on
//      `NODE_ENV`, so a production build served by `next start` (which forces
//      NODE_ENV=production) still runs bypassed locally. The production safety
//      invariant is the `USE_PG_DRIVER` localhost boot guard in db/index.ts,
//      not a NODE_ENV check.
//   2. WHICH session a zero-arg `auth()` returns is chosen independently by
//      `BYPASS_SESSION_USER`: unset ⇒ the default test viewer; the literal
//      `guest` ⇒ no session (logged out); any other seeded id ⇒ a session for
//      that id. The seam accepts any seeded user, so a future cross-user flow
//      is a one-line addition, not a redesign.
//
// Route-handler / middleware overloads (`auth(req, ctx)`, args.length > 0)
// always pass through to real NextAuth, so the deployed auth path is unchanged.
export const BYPASS_USER_ID = 'dev-test-viewer';
// The one id → email rule, shared with the seed that writes the rows. Actor
// resolution goes through the email — a real session carries no internal user
// id, only the provider's — so a synthesized session missing it resolves to no
// actor and is indistinguishable from being logged out, which is how every
// non-default identity used to resolve to nothing.
//
// The `dev-` / `dev-friend-` prefixes are the seed's id scheme, not part of the
// address: stripping them here is what lets this rule name the rows the seed
// already wrote, so adopting it rewrites no seeded email.
export const seedUserEmail = (userId: string) =>
  `${userId.replace(/^dev-(friend-)?/, '')}@dev.local`;
export const BYPASS_USER_EMAIL = seedUserEmail(BYPASS_USER_ID);
// `BYPASS_SESSION_USER` set to this literal yields a logged-out request
// (auth() ⇒ null). Mirrored as GUEST_SESSION_USER in e2e/helpers/constants.ts.
export const GUEST_SESSION_USER = 'guest';
function bypassEnabled(): boolean {
  return process.env.USE_PG_DRIVER === '1';
}

// Static far-future timestamp — avoids `Date.now()` inside server components,
// which `cacheComponents: true` forbids without first reading an uncached data
// source. Bypass sessions never actually expire.
const BYPASS_EXPIRES = '2099-01-01T00:00:00.000Z';

// Every identity carries the email and a display name. In production OAuth
// always provides both; the bypass must too, because surfaces that render for
// a profile-less account (the onboarding gate's frame chrome) read
// `session.user.name` to show the account's initials.
function synthesizeSession(userId: string) {
  return {
    user: {
      id: userId,
      email: seedUserEmail(userId),
      name: bypassDisplayName(userId),
    },
    expires: BYPASS_EXPIRES,
  };
}

function bypassDisplayName(userId: string): string {
  if (userId === BYPASS_USER_ID) return 'Test Viewer';
  return userId
    .replace(/^dev-(friend-)?/, '')
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export const auth: typeof nextAuth.auth = ((...args: unknown[]) => {
  if (bypassEnabled() && args.length === 0) {
    const sessionUser = process.env.BYPASS_SESSION_USER ?? BYPASS_USER_ID;
    if (sessionUser === GUEST_SESSION_USER) {
      return Promise.resolve(null);
    }
    return Promise.resolve(synthesizeSession(sessionUser));
  }
  return (nextAuth.auth as (...a: unknown[]) => unknown)(...args);
}) as typeof nextAuth.auth;
