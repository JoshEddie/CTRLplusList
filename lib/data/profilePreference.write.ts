import { db } from '@/db';
import { ACCENT_PREFERENCE_ID, profile_preferences } from '@/db/schema';
import { cacheTags, updateTags } from '@/lib/cacheTags';

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
        preference_id: ACCENT_PREFERENCE_ID,
        value: accent,
      })
      .onConflictDoUpdate({
        target: [
          profile_preferences.profile_id,
          profile_preferences.preference_id,
        ],
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
