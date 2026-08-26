import { db } from '@/db';
import {
  ACCENT_PREFERENCE_ID,
  profile_members,
  profile_preferences,
  profiles,
} from '@/db/schema';
import { cacheTags } from '@/lib/cacheTags';
import type {
  ActorProfile,
  ProfileMembershipView,
  UserIdentity,
} from '@/lib/types';
import { and, asc, eq, sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

// The profiles an account may act as, and the one home for that membership
// read — `getProfileCardsForUser` composes on top of it rather than repeating
// the join. Counts stay out: this runs on every authenticated request and the
// correlated count subqueries are the Profiles page's cost, not the seam's.
// Ordered most-recently-acted-as first with never-acted-as last, which is the
// order every switching surface offers.
export async function getMembershipsForUser(
  userId: string
): Promise<ProfileMembershipView[]> {
  'use cache';
  cacheTag(
    cacheTags.profiles,
    cacheTags.profileMembers,
    cacheTags.profilePreferences,
    cacheTags.profilesOfUser(userId)
  );
  const rows = await db
    .select({
      id: profiles.id,
      name: profiles.name,
      tagline: profiles.tagline,
      role: profile_members.role,
      accent: profile_preferences.value,
      last_active_at: profile_members.last_active_at,
    })
    .from(profile_members)
    .innerJoin(profiles, eq(profiles.id, profile_members.profile_id))
    .leftJoin(
      profile_preferences,
      and(
        eq(profile_preferences.profile_id, profiles.id),
        eq(profile_preferences.preference_id, ACCENT_PREFERENCE_ID)
      )
    )
    .where(eq(profile_members.user_id, userId))
    .orderBy(
      sql`${profile_members.last_active_at} DESC NULLS LAST`,
      asc(profiles.name)
    );
  cacheTag(
    ...rows.flatMap((row) => [
      cacheTags.profile(row.id),
      cacheTags.preferencesOfProfile(row.id),
    ])
  );
  return rows.map((row) => ({
    ...row,
    role: row.role as ProfileMembershipView['role'],
  }));
}

// Membership re-verification is the match itself: a selection naming a profile
// the account holds no membership on is simply absent from `memberships`, so
// no read or write is ever issued against the named id. Every unhonourable
// cause — nothing stored, revoked, deleted, never existed — lands on the same
// self-profile fallback, and nothing here writes a selection back.
export function resolveIdentity(
  userId: string,
  memberships: ProfileMembershipView[],
  selection: string | null
): UserIdentity | null {
  const selfProfile = memberships.find((m) => m.role === 'self');
  if (!selfProfile) return null;
  const selected = memberships.find((m) => m.id === selection);
  return { userId, selfProfile, activeProfile: selected ?? selfProfile };
}

// The dropdown's bound. `menu-system` holds a menu to 80vh with internal
// scroll, so a viewer running a hundred profiles would technically render —
// burying Sign out under a hundred rows. The Profiles page is the surface that
// scales; the count on its row is what stops the capped group reading as the
// whole set.
export const SWITCH_ROW_CAP = 5;

export type ProfileSwitcherView = {
  rows: ActorProfile[];
  profileCount: number;
};

// The profile being acted as is excluded, so no row is inert. Every row reads
// as the profile it names and nothing more — the viewer's own row is not
// prefixed, because a prefix plus a long profile name is what overflows a menu
// row first, and the name alone already says where the row leads.
export function switcherView(
  identity: UserIdentity,
  memberships: ProfileMembershipView[]
): ProfileSwitcherView {
  return {
    rows: memberships
      .filter((m) => m.id !== identity.activeProfile.id)
      .map(({ id, name, accent }) => ({ id, name, accent }))
      .slice(0, SWITCH_ROW_CAP),
    profileCount: memberships.length,
  };
}

// The active profile's name, but only for a viewer who runs more than one —
// the condition both the creation-surface statement and the empty state's
// switch route are gated on. A viewer with a single profile has no ambiguity
// to resolve and nowhere to switch to, so they get `undefined` and every
// surface renders exactly as it does today.
export async function actingAsName(
  identity: UserIdentity
): Promise<string | undefined> {
  const memberships = await getMembershipsForUser(identity.userId);
  return memberships.length > 1 ? identity.activeProfile.name : undefined;
}
