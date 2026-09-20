import { db } from '@/db';
import {
  ACCENT_PREFERENCE_ID,
  profile_avatars,
  profile_preferences,
} from '@/db/schema';
import type { AltvatarValue } from '@/lib/altvatar/types';
import { cacheTags } from '@/lib/cacheTags';
import { eq } from 'drizzle-orm';
import { QueryBuilder } from 'drizzle-orm/pg-core';
import { cacheTag } from 'next/cache';

// The accent a profile stores, aliased so the preference filter travels with
// the join rather than being restated at every call site — the same shape
// `selfMemberships` uses for the profile↔account link. Built through a
// connectionless QueryBuilder, so importing this module never touches `db`.
export const accentPreferences = new QueryBuilder()
  .select({
    profile_id: profile_preferences.profile_id,
    accent: profile_preferences.value,
  })
  .from(profile_preferences)
  .where(eq(profile_preferences.preference_id, ACCENT_PREFERENCE_ID))
  .as('accent_preferences');

// The columns the one avatar disc reads. A profile's face is joined straight
// onto the profile id — there is no hop through an account, and no account
// column among these.
export const avatarColumns = {
  accent: accentPreferences.accent,
  art: profile_avatars.art,
  avatarStyle: profile_avatars.style,
};

// The relational-query-builder counterpart, for reads that cannot join a
// subquery. Consumers read `profile.avatar?.art` and `profile.preferences`.
export const withProfileAvatar = {
  avatar: { columns: { art: true, style: true } },
  preferences: {
    columns: { value: true },
    where: eq(profile_preferences.preference_id, ACCENT_PREFERENCE_ID),
  },
} as const;

export type RelationalProfile = {
  name: string;
  avatar?: { art: string; style: string } | null;
  preferences?: { value: string }[];
} | null;

export function avatarViewOf(profile: RelationalProfile) {
  return {
    name: profile?.name ?? '',
    accent: profile?.preferences?.[0]?.value ?? null,
    art: profile?.avatar?.art ?? null,
    avatarStyle: profile?.avatar?.style ?? null,
  };
}

// The selections, read only by the customizer — every other surface takes the
// stored rendering instead and generates nothing during the request.
export async function getAltvatarOptions(
  profileId: string
): Promise<AltvatarValue | null> {
  'use cache';
  cacheTag(cacheTags.profileAvatars, cacheTags.avatarOfProfile(profileId));
  const [row] = await db
    .select({ style: profile_avatars.style, options: profile_avatars.options })
    .from(profile_avatars)
    .where(eq(profile_avatars.profile_id, profileId));
  if (!row) return null;
  return { style: row.style, options: row.options };
}
