import { db } from '@/db';
import {
  SPOILER_TIER_PREFERENCE_ID,
  profile_avatars,
  profile_invites,
  profile_members,
  profile_preferences,
  profiles,
} from '@/db/schema';
import { selfMemberships } from '@/lib/data/profile.identity';
import { accentPreferences, avatarColumns } from '@/lib/data/profileAvatar';
import { cacheTags } from '@/lib/cacheTags';
import { roleOf } from '@/lib/data/profile.roles';
import { MAXIMAL_TIER, spoilerTierOf } from '@/lib/spoilers';
import type { SpoilerTier } from '@/lib/types';
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

// The Permissions section's roster: every membership on the profile, wearing
// the member's own self-profile face rather than the administered profile's.
export async function getProfileMembers(profileId: string) {
  'use cache';
  cacheTag(
    cacheTags.profileMembers,
    cacheTags.membersOfProfile(profileId),
    cacheTags.profiles,
    cacheTags.profileAvatars,
    cacheTags.profilePreferences
  );
  try {
    const rows = await db
      .select({
        user_id: profile_members.user_id,
        role: profile_members.role,
        last_active_at: profile_members.last_active_at,
        tier: profile_preferences.value,
        id: profiles.id,
        name: profiles.name,
        ...avatarColumns,
      })
      .from(profile_members)
      .innerJoin(
        selfMemberships,
        eq(selfMemberships.user_id, profile_members.user_id)
      )
      .innerJoin(profiles, eq(profiles.id, selfMemberships.profile_id))
      .leftJoin(profile_avatars, eq(profile_avatars.profile_id, profiles.id))
      .leftJoin(accentPreferences, eq(accentPreferences.profile_id, profiles.id))
      // The member's own spoiler-tier row (account key set). A member with no
      // row resolves to the protected default, so the leftJoin's absence maps
      // to `surprise` below.
      .leftJoin(
        profile_preferences,
        and(
          eq(profile_preferences.profile_id, profile_members.profile_id),
          eq(profile_preferences.user_id, profile_members.user_id),
          eq(profile_preferences.preference_id, SPOILER_TIER_PREFERENCE_ID)
        )
      )
      .where(eq(profile_members.profile_id, profileId));
    cacheTag(...rows.map((row) => cacheTags.profilesOfUser(row.user_id)));
    // The baseline tier rides the roster rather than being read per member: it
    // is the same row the roster already joins, and the Settings panel renders
    // one control per member.
    return rows.map(({ tier, ...row }) => ({
      ...row,
      role: roleOf(row.role),
      baseline: spoilerTierOf(tier ?? '') satisfies SpoilerTier,
    }));
  } catch (error) {
    console.error('Error fetching profile members:', error);
    throw new Error('Failed to fetch profile members');
  }
}

export type ProfileMemberRow = Awaited<
  ReturnType<typeof getProfileMembers>
>[number];

// What a live invite grants, for the page that offers it. Uncached: the row
// carries the single-use marker the whole grant turns on. A spent, expired or
// unknown token all resolve to null alike, so the page cannot confirm to a
// stranger that a guessed token ever existed.
export async function getLiveInvite(token: string) {
  try {
    const rows = await db
      .select({
        role: profile_invites.role,
        id: profiles.id,
        name: profiles.name,
        tagline: profiles.tagline,
        ...avatarColumns,
      })
      .from(profile_invites)
      .innerJoin(profiles, eq(profiles.id, profile_invites.profile_id))
      .leftJoin(profile_avatars, eq(profile_avatars.profile_id, profiles.id))
      .leftJoin(accentPreferences, eq(accentPreferences.profile_id, profiles.id))
      .where(
        and(
          eq(profile_invites.token, token),
          isNull(profile_invites.redeemed_at),
          gt(profile_invites.expires_at, new Date())
        )
      );
    // `.at` rather than an index: it types the miss, so the page's own
    // not-found branch narrows instead of being dead to the compiler.
    const invite = rows.at(0);
    return invite ? { ...invite, role: roleOf(invite.role) } : null;
  } catch (error) {
    console.error('Error fetching invite:', error);
    throw new Error('Failed to fetch invite');
  }
}

// The invites a profile has outstanding, rendered in the roster beside its
// members. The token rides along because the row's whole purpose is to hand
// the link back to the owner who minted it — which is why only an owner is
// shown these rows: a bearer token is the grant itself, so rendering one to a
// manager would let them admit a member by forwarding it.
//
// Uncached, for the reason `getLiveInvite` is: the `expires_at > now` filter is
// a predicate on the clock, and a cached result freezes the clock it was
// computed against. No tag can restore it — expiry is the passage of time, not
// a write — so an expired link would sit in the roster claiming to be live
// until some unrelated write on the profile happened to evict it.
export async function getPendingInvites(profileId: string) {
  try {
    const rows = await db
      .select({
        token: profile_invites.token,
        role: profile_invites.role,
        created_at: profile_invites.created_at,
        expires_at: profile_invites.expires_at,
      })
      .from(profile_invites)
      .where(
        and(
          eq(profile_invites.profile_id, profileId),
          isNull(profile_invites.redeemed_at),
          gt(profile_invites.expires_at, new Date())
        )
      )
      .orderBy(asc(profile_invites.created_at));
    return rows.map((row) => ({ ...row, role: roleOf(row.role) }));
  } catch (error) {
    console.error('Error fetching pending invites:', error);
    throw new Error('Failed to fetch pending invites');
  }
}

export type PendingInvite = Awaited<
  ReturnType<typeof getPendingInvites>
>[number];

// The spoiler baseline the viewer's ACCOUNT holds on the profile owning the
// content — never an ownership comparison, and never the profile the request
// acts as: protection is a property of the human and travels with them across
// every switch (`spoiler-visibility`). A viewer holding no membership, signed
// out included, is owed no protection, so they resolve to the maximal
// projection rather than to the default.
export async function getSpoilerBaseline(
  userId: string | undefined,
  profileId: string
): Promise<SpoilerTier> {
  return userId ? memberBaseline(userId, profileId) : MAXIMAL_TIER;
}

async function memberBaseline(
  userId: string,
  profileId: string
): Promise<SpoilerTier> {
  'use cache';
  cacheTag(
    cacheTags.profileMembers,
    cacheTags.membersOfProfile(profileId),
    cacheTags.profilesOfUser(userId),
    cacheTags.profilePreferences,
    cacheTags.preferencesOfProfile(profileId)
  );
  try {
    // One query: the membership proves the viewer is a member (its absence
    // means non-member → maximal), and the leftJoined tier row carries their
    // baseline. An absent tier row on a present membership resolves to the
    // protected default, never to the profile-wide row.
    const [row] = await db
      .select({
        memberUserId: profile_members.user_id,
        tier: profile_preferences.value,
      })
      .from(profile_members)
      .leftJoin(
        profile_preferences,
        and(
          eq(profile_preferences.profile_id, profile_members.profile_id),
          eq(profile_preferences.user_id, profile_members.user_id),
          eq(profile_preferences.preference_id, SPOILER_TIER_PREFERENCE_ID)
        )
      )
      .where(
        and(
          eq(profile_members.user_id, userId),
          eq(profile_members.profile_id, profileId)
        )
      );
    return row ? spoilerTierOf(row.tier ?? '') : MAXIMAL_TIER;
  } catch (error) {
    console.error('Error fetching spoiler baseline:', error);
    throw new Error('Failed to fetch spoiler baseline');
  }
}

// Whether the account holds a membership on the profile — any role. Gates the
// hero's Spoilers control, which is offered only to a viewer whose protection
// is real: a non-member resolves to the maximal projection and has no baseline
// to adjust. Cached under the membership tags it reads.
export async function viewerIsProfileMember(
  userId: string | undefined,
  profileId: string
): Promise<boolean> {
  if (!userId) return false;
  return hasMembership(userId, profileId);
}

async function hasMembership(
  userId: string,
  profileId: string
): Promise<boolean> {
  'use cache';
  cacheTag(
    cacheTags.profileMembers,
    cacheTags.membersOfProfile(profileId),
    cacheTags.profilesOfUser(userId)
  );
  try {
    const [row] = await db
      .select({ user_id: profile_members.user_id })
      .from(profile_members)
      .where(
        and(
          eq(profile_members.user_id, userId),
          eq(profile_members.profile_id, profileId)
        )
      );
    return !!row;
  } catch (error) {
    console.error('Error checking membership:', error);
    throw new Error('Failed to check membership');
  }
}

// The profile-level seed a new membership is pre-filled from — the null-account
// row. A seed only: nothing reads it to resolve a sitting member, so a profile
// that has never chosen one resolves to full protection here and moves nobody.
export async function getSpoilerDefault(
  profileId: string
): Promise<SpoilerTier> {
  'use cache';
  cacheTag(
    cacheTags.profilePreferences,
    cacheTags.preferencesOfProfile(profileId)
  );
  try {
    const [row] = await db
      .select({ value: profile_preferences.value })
      .from(profile_preferences)
      .where(
        and(
          eq(profile_preferences.profile_id, profileId),
          isNull(profile_preferences.user_id),
          eq(profile_preferences.preference_id, SPOILER_TIER_PREFERENCE_ID)
        )
      );
    return spoilerTierOf(row?.value ?? '');
  } catch (error) {
    console.error('Error fetching spoiler default:', error);
    throw new Error('Failed to fetch spoiler default');
  }
}
