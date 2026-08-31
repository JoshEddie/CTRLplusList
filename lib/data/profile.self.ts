import {
  profile_members,
  profiles,
  SELF_MEMBERSHIP_PER_USER_IDX,
} from '@/db/schema';
import { ROLES } from '@/lib/data/profile.roles';
import { constraintOf, sqlstateOf } from '@/lib/sqlstate';
import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type * as schema from '@/db/schema';
import { nanoid } from 'nanoid';

// An account's self-profile is minted here, at the onboarding submit, and
// nowhere else — it is the first point at which a human can supply the name a
// profile cannot exist without. Account creation writes no profile, so between
// sign-in and this call an account holds nothing and actor resolution yields
// nothing for it. That is the whole of the enforcement: no endpoint carries an
// onboarding check and none is to be added.
// Returns the id it minted, or null when it swallowed a 23505 — meaning the
// account already held a self-profile and the caller's own read is the way to
// find it. The id is generated here rather than derived from the account, so
// nothing can re-derive it and claim a profile that is not theirs.
export async function createSelfProfile(
  database: PgDatabase<PgQueryResultHKT, typeof schema>,
  userId: string,
  name: string
): Promise<string | null> {
  const id = nanoid();
  const created = database
    .$with('created')
    .as(
      database
        .insert(profiles)
        .values({ id, name })
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
        // projection is not the table's own, so the defaults are restated here
        // rather than left to the column definitions. `last_active_at` is NULL
        // because a membership just created has never been acted as.
        database
          .select({
            user_id: sql<string>`${userId}`.as('user_id'),
            profile_id: created.id,
            role: sql<string>`${ROLES.self.value}`.as('role'),
            ride_along: sql<boolean>`false`.as('ride_along'),
            last_active_at: sql<Date | null>`NULL`.as('last_active_at'),
            created_at: sql<Date>`now()`.as('created_at'),
          })
          .from(created)
      );
  } catch (err) {
    if (
      sqlstateOf(err) === '23505' &&
      constraintOf(err) === SELF_MEMBERSHIP_PER_USER_IDX
    ) {
      return null;
    }
    throw err;
  }
  return id;
}
