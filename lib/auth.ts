import {
  accounts,
  profile_members,
  profiles,
  SELF_MEMBERSHIP_PER_USER_IDX,
  users,
} from '@/db/schema';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type * as schema from '@/db/schema';
import { nanoid } from 'nanoid';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import type { AdapterUser } from 'next-auth/adapters';
import Google from 'next-auth/providers/google';
import { db } from '../db';
import { constraintOf, sqlstateOf } from './sqlstate';

type Callbacks = NonNullable<NextAuthConfig['callbacks']>;

// Store the full name (first + last) when Google provides both — used for
// disambiguation on the connections page. Other surfaces extract the first
// name via firstNameOf() in lib/data/purchase.ts to preserve the casual tone
// in purchase attribution and similar contexts.
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

// Written on the same statements as the phase-1 migration backfill, which is a
// point-in-time SELECT nothing re-runs: without this, an account created after
// the migration would hold no profile at all. `signInCallback` mutates the
// provider user before the adapter inserts it, so `user.name` here is already
// the composed first + last name the backfill wrote.
export async function createSelfProfile(
  database: PgDatabase<PgQueryResultHKT, typeof schema>,
  user: Pick<AdapterUser, 'id' | 'name'>
) {
  const created = database.$with('created').as(
    database
      .insert(profiles)
      .values({ id: nanoid(), name: user.name ?? 'UNTITLED' })
      .returning({ id: profiles.id })
  );

  try {
    // Both rows in one statement — the only atomicity neon-http offers. A
    // membership row is what makes a profile reachable at all, so a second
    // statement that lost the uniqueness race would strand the profile as a
    // permanent orphan. Here the 23505 rolls the profile insert back with it,
    // and catching it IS the idempotency: the account already has a
    // self-profile. Any other constraint is someone else's problem.
    await database
      .with(created)
      .insert(profile_members)
      .select(
        // Every column, in table order: drizzle rejects an insert-select whose
        // projection is not the table's own, so the two defaults are restated
        // here rather than left to the column definitions.
        database
          .select({
            user_id: sql<string>`${user.id}`.as('user_id'),
            profile_id: created.id,
            role: sql<string>`'self'`.as('role'),
            ride_along: sql<boolean>`false`.as('ride_along'),
            created_at: sql<Date>`now()`.as('created_at'),
          })
          .from(created)
      );
  } catch (err) {
    if (
      sqlstateOf(err) === '23505' &&
      constraintOf(err) === SELF_MEMBERSHIP_PER_USER_IDX
    ) {
      return;
    }
    throw err;
  }
}

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
    signIn: signInCallback,
    jwt: jwtCallback,
  },
  events: {
    // The adapter always yields an AdapterUser; the event type widens it to
    // User, whose `id` is optional.
    createUser: ({ user }) => createSelfProfile(db, user as AdapterUser),
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
export const BYPASS_USER_EMAIL = 'test-viewer@dev.local';
// `BYPASS_SESSION_USER` set to this literal yields a logged-out request
// (auth() ⇒ null). Mirrored as GUEST_SESSION_USER in e2e/helpers/constants.ts.
export const GUEST_SESSION_USER = 'guest';
// Inline SVG avatar matching the seeded user row — UserImage requires a
// non-empty src (UserAvatarPopover passes `user.image || ''` and an empty
// string triggers next/image "missing src" errors).
const BYPASS_USER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="40" fill="#5b21b6"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="32" font-weight="600" fill="white">TV</text></svg>'
  );

function bypassEnabled(): boolean {
  return process.env.USE_PG_DRIVER === '1';
}

// Static far-future timestamp — avoids `Date.now()` inside server components,
// which `cacheComponents: true` forbids without first reading an uncached data
// source. Bypass sessions never actually expire.
const BYPASS_EXPIRES = '2099-01-01T00:00:00.000Z';

// The default identity (`dev-test-viewer`) carries the full display fields the
// preview UI expects; any other seeded id gets a minimal session (display
// fields are resolved by the flow that introduces that identity). `guest` is
// handled by the caller (⇒ null), never reaching here.
function synthesizeSession(userId: string) {
  if (userId === BYPASS_USER_ID) {
    return {
      user: {
        id: BYPASS_USER_ID,
        email: BYPASS_USER_EMAIL,
        name: 'Test Viewer',
        image: BYPASS_USER_IMAGE,
      },
      expires: BYPASS_EXPIRES,
    };
  }
  return { user: { id: userId }, expires: BYPASS_EXPIRES };
}

// Dormant seam for active-profile resolution: nothing consumes it until the
// resolver exists.
export function bypassActiveProfile(): string | undefined {
  return bypassEnabled() ? process.env.BYPASS_ACTIVE_PROFILE : undefined;
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
