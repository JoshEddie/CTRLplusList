import { profile_members } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { QueryBuilder } from 'drizzle-orm/pg-core';

// The profile↔account link. `profiles` carries no account reference, so every
// resolution runs through a `self` membership row; aliasing it as a subquery
// carries the role filter with it, so each call site still joins on a single
// equality in one round trip.
//
// Its own module rather than `profile.ts`: `profile.ts` reads from `user.ts`,
// and both are call sites, so a shared home there would close an import cycle.
// Built through a connectionless QueryBuilder, so importing this module never
// touches `db` — several suites populate that binding after import.
export const selfMemberships = new QueryBuilder()
  .select({
    user_id: profile_members.user_id,
    profile_id: profile_members.profile_id,
  })
  .from(profile_members)
  .where(eq(profile_members.role, 'self'))
  .as('self_memberships');

// The same link for the relational query builder, which cannot join a
// subquery: the `self` membership row carrying only its account's avatar.
// Consumers read `profile.members[0]?.user.image`.
export const withSelfAvatar = {
  members: {
    columns: {},
    where: eq(profile_members.role, 'self'),
    with: { user: { columns: { image: true } } },
  },
} as const;
