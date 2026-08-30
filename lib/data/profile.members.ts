import { db } from '@/db';
import {
  profile_avatars,
  profile_invites,
  profile_members,
  profiles,
} from '@/db/schema';
import { selfMemberships } from '@/lib/data/profile.identity';
import { accentPreferences, avatarColumns } from '@/lib/data/profileAvatar';
import { cacheTags } from '@/lib/cacheTags';
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

// The Permissions section's roster: every membership on the profile, wearing
// the member's own self-profile face rather than the administered profile's.
export async function getProfileMembers(profileId: string) {
  'use cache';
  cacheTag(
    cacheTags.profileMembers,
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
      .where(eq(profile_members.profile_id, profileId));
    cacheTag(...rows.map((row) => cacheTags.profilesOfUser(row.user_id)));
    return rows;
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
    return rows.at(0) ?? null;
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
export async function getPendingInvites(profileId: string) {
  'use cache';
  cacheTag(cacheTags.profileInvites, cacheTags.invitesOfProfile(profileId));
  try {
    return await db
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
  } catch (error) {
    console.error('Error fetching pending invites:', error);
    throw new Error('Failed to fetch pending invites');
  }
}

export type PendingInvite = Awaited<
  ReturnType<typeof getPendingInvites>
>[number];
