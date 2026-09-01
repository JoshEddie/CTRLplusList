import { db } from '@/db';
import {
  ACCENT_PREFERENCE_ID,
  SPOILER_TIER_PREFERENCE_ID,
  profile_preferences,
} from '@/db/schema';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import type { SpoilerTier } from '@/lib/types';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

// A profile-wide value lives in the null-account row. Its conflict target is
// the partial-unique index over (profile, preference) WHERE user_id IS NULL,
// so the upsert matches exactly the one profile-wide row.
const defaultConflictTarget = [
  profile_preferences.profile_id,
  profile_preferences.preference_id,
];
const defaultConflictWhere = isNull(profile_preferences.user_id);

// Internal, not an action: a `'use server'` module's exports are
// client-callable endpoints, and this one writes a profile's identity without
// checking who is asking — its callers own that check.
// Deliberately not atomic with the profile and membership rows: a profile
// without its accent renders the fallback and its owner can write one, while a
// profile without its membership row is unreachable by anyone. The fixability
// criterion on 2026-08-18-atomic-writes-in-one-cte is what splits them, so this
// raises nothing and reports instead — creation ignores the report and
// succeeds, an edit surfaces it rather than claiming a colour it did not save.
export async function writeAccent(profileId: string, accent: string) {
  try {
    await db
      .insert(profile_preferences)
      .values({
        profile_id: profileId,
        user_id: null,
        preference_id: ACCENT_PREFERENCE_ID,
        value: accent,
      })
      .onConflictDoUpdate({
        target: defaultConflictTarget,
        targetWhere: defaultConflictWhere,
        set: { value: accent },
      });
    // Fired here rather than by each caller so the tag tracks the write that
    // lands the row: a failure below invalidates nothing.
    updateTags(cacheTags.preferencesOfProfile(profileId));
    return true;
  } catch (error) {
    console.error('Error writing profile accent:', error);
    return false;
  }
}

// The profile-level claim-visibility seed — the null-account tier row. Read
// only at invite-open to seed a new member; never consulted to resolve a
// sitting member, so writing it moves nobody.
export async function writeSpoilerDefault(profileId: string, tier: SpoilerTier) {
  try {
    await db
      .insert(profile_preferences)
      .values({
        profile_id: profileId,
        user_id: null,
        preference_id: SPOILER_TIER_PREFERENCE_ID,
        value: tier,
      })
      .onConflictDoUpdate({
        target: defaultConflictTarget,
        targetWhere: defaultConflictWhere,
        set: { value: tier },
      });
    updateTags(cacheTags.preferencesOfProfile(profileId));
    return true;
  } catch (error) {
    console.error('Error writing profile spoiler default:', error);
    return false;
  }
}

// A member's own baseline tier — the account-keyed row. Its conflict target is
// the partial-unique index over (profile, account, preference) WHERE user_id
// IS NOT NULL.
export async function writeMemberTier(
  profileId: string,
  userId: string,
  tier: SpoilerTier
) {
  try {
    await db
      .insert(profile_preferences)
      .values({
        profile_id: profileId,
        user_id: userId,
        preference_id: SPOILER_TIER_PREFERENCE_ID,
        value: tier,
      })
      .onConflictDoUpdate({
        target: [
          profile_preferences.profile_id,
          profile_preferences.user_id,
          profile_preferences.preference_id,
        ],
        targetWhere: isNotNull(profile_preferences.user_id),
        set: { value: tier },
      });
    updateTags(
      cacheTags.preferencesOfProfile(profileId),
      cacheTags.profilesOfUser(userId)
    );
    return true;
  } catch (error) {
    console.error('Error writing member spoiler tier:', error);
    return false;
  }
}

// Delete a member's account-keyed preference rows on a profile. Called when a
// membership is revoked: the rows do not cascade with the `profile_members`
// row, so revocation must clear them explicitly (`profiles-data-model`).
export async function deleteMemberPreferences(
  profileId: string,
  userId: string
) {
  await db
    .delete(profile_preferences)
    .where(
      and(
        eq(profile_preferences.profile_id, profileId),
        eq(profile_preferences.user_id, userId)
      )
    );
  updateTags(
    cacheTags.preferencesOfProfile(profileId),
    cacheTags.profilesOfUser(userId)
  );
}
