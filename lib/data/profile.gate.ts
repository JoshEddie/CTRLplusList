// The membership gate every profile-scoped write passes, and the acted-as
// recording that rides inside it. Its own module rather than `user.session.ts`:
// that seam is deliberately import-light — several suites mock the profile read
// away to keep `@/db` out of a page's module graph entirely — and the gate has
// to touch the database.
import { db } from '@/db';
import { profile_members, profiles } from '@/db/schema';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { UNAUTHORIZED_RESPONSE, authedIdentity } from '@/lib/data/user.session';
import { type ActionResponse, type UserIdentity } from '@/lib/types';
import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm';

export const FORBIDDEN_RESPONSE: ActionResponse = {
  success: false,
  message: 'Forbidden',
  error: 'Forbidden',
};

// The roles that make a profile selectable, and so writable-as once selected.
// Named rather than inferred from the row's existence: the column's CHECK
// admits exactly these today, and a role added later must not walk through
// this gate by default.
export const WRITE_ROLES = ['self', 'owner', 'manager'] as const;

// The single membership gate every profile-scoped write passes. Holding a
// membership is what made the profile selectable; this confirms the account
// still holds one on the profile it acts as, at the moment of the write. The
// read is deliberately uncached: a cached one could still show a membership
// revoked since the form rendered, which is the case the gate exists to
// refuse. The ownership comparison each mutation makes is unchanged and
// unaffected — another membership never widens the current request.
export async function authedWriter(): Promise<
  { identity: UserIdentity } | { error: ActionResponse }
> {
  const identity = await authedIdentity();
  if (!identity) return { error: UNAUTHORIZED_RESPONSE };

  const membership = await writableMembership(
    identity.userId,
    identity.activeProfile.id
  );
  if (!membership) return { error: FORBIDDEN_RESPONSE };

  await stampActedAs(
    identity.userId,
    identity.activeProfile.id,
    membership.last_active_at
  );
  return { identity };
}

// The single expression of "this account may act as this profile" — a
// membership row in a write role. Both the gate and the switch action read it,
// so narrowing the rule narrows it everywhere. The profile's name rides along
// because the switch action confirms by name and the row is already joined.
export async function writableMembership(
  userId: string,
  profileId: string
): Promise<{ name: string; last_active_at: Date | null } | null> {
  const [membership] = await db
    .select({
      name: profiles.name,
      last_active_at: profile_members.last_active_at,
    })
    .from(profile_members)
    .innerJoin(profiles, eq(profiles.id, profile_members.profile_id))
    .where(
      and(
        eq(profile_members.user_id, userId),
        eq(profile_members.profile_id, profileId),
        inArray(profile_members.role, [...WRITE_ROLES])
      )
    );
  return membership ?? null;
}

// An hour, so reordering twenty items writes the row once rather than twenty
// times. One threshold feeds both the in-request check, which decides whether
// the write and its invalidation are worth issuing at all, and the statement's
// own guard, which is what actually decides under concurrent writers.
const RECENCY_COARSENING_HOURS = 1;

// Bound as a value rather than expressed as `now() - interval` in SQL:
// `last_active_at` is a `timestamp` and `now()` is a `timestamptz`, so
// comparing them makes the guard depend on the session's time zone. A bound
// Date is serialized the same way the write below is.
function recencyThreshold(): Date {
  return new Date(Date.now() - RECENCY_COARSENING_HOURS * 60 * 60 * 1000);
}

// Recording rides inside the gate rather than being called from each mutation,
// so a write added later cannot forget it. The UPDATE is awaited before the
// invalidation rather than deferred: `switchActiveProfile` calls `refresh()`
// in the same request, so invalidating first lets the re-render refill the
// memberships read from the pre-write row and leave the ordering one switch
// behind. A failed stamp is logged and swallowed — the recording is incidental
// to the write that triggered it and must not fail it.
export async function stampActedAs(
  userId: string,
  profileId: string,
  lastActiveAt: Date | null
): Promise<void> {
  const threshold = recencyThreshold();
  if (lastActiveAt && lastActiveAt >= threshold) return;

  try {
    await db
      .update(profile_members)
      .set({ last_active_at: new Date() })
      .where(
        and(
          eq(profile_members.user_id, userId),
          eq(profile_members.profile_id, profileId),
          or(
            isNull(profile_members.last_active_at),
            lt(profile_members.last_active_at, threshold)
          )
        )
      );
    updateTags(cacheTags.profilesOfUser(userId));
  } catch (error) {
    console.error('Error recording acted-as:', error);
  }
}
