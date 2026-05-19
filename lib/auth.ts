import { accounts, users } from '@/db/schema';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from '../db';

const nextAuth = NextAuth({
  theme: { logo: 'https://ctrlpluslist.com/ctrlpluslist_logo-hor-white.webp' },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true, // Trust the host in development
  callbacks: {
    async signIn({ user, profile }) {
      // Store the full name (first + last) when Google provides both — used
      // for disambiguation on the connections page. Other surfaces extract
      // first name via firstNameOf() in lib/dal.ts to preserve the casual
      // tone in purchase attribution and similar contexts.
      if (profile?.given_name && profile?.family_name) {
        user.name = `${profile.given_name} ${profile.family_name}`;
      } else if (profile?.given_name) {
        user.name = profile.given_name;
      }
      // else: keep whatever default user.name we received
      return true;
    },
    jwt({ token, trigger, session }) {
      if (trigger === 'update') {
        token.name = session.user.name;
      }
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

// Dev-only auth bypass: when AUTH_BYPASS=true AND NODE_ENV != 'production',
// zero-arg `await auth()` calls return a mock session for the seeded test
// viewer (see scripts/seed-dev-users.ts). Route-handler / middleware overloads
// pass through to real NextAuth so the prod path is unchanged.
export const BYPASS_USER_ID = 'dev-test-viewer';
export const BYPASS_USER_EMAIL = 'test-viewer@dev.local';
// Inline SVG avatar matching the seeded user row — UserImage requires a
// non-empty src (UserAvatarPopover passes `user.image || ''` and an empty
// string triggers next/image "missing src" errors).
const BYPASS_USER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="40" fill="#5b21b6"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="32" font-weight="600" fill="white">TV</text></svg>'
  );

function bypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.AUTH_BYPASS === 'true'
  );
}

// Static far-future timestamp — avoids `Date.now()` inside server components,
// which `cacheComponents: true` forbids without first reading an uncached data
// source. Bypass sessions never actually expire.
const BYPASS_EXPIRES = '2099-01-01T00:00:00.000Z';

export const auth: typeof nextAuth.auth = ((...args: unknown[]) => {
  if (bypassEnabled() && args.length === 0) {
    return Promise.resolve({
      user: {
        id: BYPASS_USER_ID,
        email: BYPASS_USER_EMAIL,
        name: 'Test Viewer',
        image: BYPASS_USER_IMAGE,
      },
      expires: BYPASS_EXPIRES,
    });
  }
  return (nextAuth.auth as (...a: unknown[]) => unknown)(...args);
}) as typeof nextAuth.auth;
