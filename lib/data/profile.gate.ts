// The membership gate every profile-scoped write passes, and the acted-as
// recording that rides inside it. Its own module rather than `user.session.ts`:
// that seam is deliberately import-light — several suites mock the profile read
// away to keep `@/db` out of a page's module graph entirely — and the gate has
// to touch the database.
import { db } from '@/db';
import { profile_members, profiles } from '@/db/schema';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { UNAUTHORIZED_RESPONSE, authedIdentity } from '@/lib/data/user.session';
import { roleOf } from '@/lib/data/profile.roles';
import {
  type ActionResponse,
  type RoleShape,
  type UserIdentity,
} from '@/lib/types';
import { and, eq, isNull, lt, or } from 'drizzle-orm';

// The two floors, named so a call site says which one it takes.
export const ADMIN_REQUIRED = true;
export const ADMIN_OPTIONAL = false;

export const FORBIDDEN_RESPONSE: ActionResponse = {
  success: false,
  message: 'Forbidden',
  error: 'Forbidden',
};

// The single membership gate every profile-scoped write passes. Holding a
// membership is what made the profile selectable; this confirms the account
// still holds one on the profile it acts as, at the moment of the write. The
// read is deliberately uncached: a cached one could still show a membership
// revoked since the form rendered, which is the case the gate exists to
// refuse. The ownership comparison each mutation makes is unchanged and
// unaffected — another membership never widens the current request.
export async function authedWriter(
  adminRequired: boolean
): Promise<{ identity: UserIdentity } | { error: ActionResponse }> {
  const identity = await authedIdentity();
  if (!identity) return { error: UNAUTHORIZED_RESPONSE };

  const membership = await writableMembership(
    identity.userId,
    identity.activeProfile.id
  );
  if (!membership) return { error: FORBIDDEN_RESPONSE };
  // `false` consults nothing: `writableMembership` returning a row is itself
  // the lower floor, so re-testing the role would be a guard re-deciding what
  // the read decided.
  if (adminRequired && !membership.role.admin)
    return { error: FORBIDDEN_RESPONSE };

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
): Promise<{
  name: string;
  role: RoleShape;
  last_active_at: Date | null;
} | null> {
  const [membership] = await db
    .select({
      name: profiles.name,
      role: profile_members.role,
      last_active_at: profile_members.last_active_at,
    })
    .from(profile_members)
    .innerJoin(profiles, eq(profiles.id, profile_members.profile_id))
    .where(
      and(
        eq(profile_members.user_id, userId),
        eq(profile_members.profile_id, profileId)
      )
    );
  return membership ? { ...membership, role: roleOf(membership.role) } : null;
}

// Editing a profile is an ownership act, so it is a strictly narrower rule than
// `writableMembership`: a manager may act as the profile but may not change who
// it is. Read here rather than trusted from what the page rendered — an account
// that submits by any other means lands on the same refusal.
export async function ownsProfile(
  userId: string,
  profileId: string
): Promise<boolean> {
  const [membership] = await db
    .select({ role: profile_members.role })
    .from(profile_members)
    .where(
      and(
        eq(profile_members.user_id, userId),
        eq(profile_members.profile_id, profileId)
      )
    );
  return membership ? roleOf(membership.role).admin : false;
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
