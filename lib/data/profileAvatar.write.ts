import { db } from '@/db';
import { profile_avatars } from '@/db/schema';
import { renderAltvatar } from '@/lib/altvatar/render';
import { sanitizeSelections } from '@/lib/altvatar/resolve';
import { isAltvatarStyleId } from '@/lib/altvatar/registry';
import { ALTVATAR_STYLE_IDS } from '@/lib/altvatar/types';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { z } from 'zod';

// Internal, not an action: a `'use server'` module's exports are
// client-callable endpoints, and this one writes a profile's identity without
// checking who is asking — its callers own that check. See
// openspec/specs/data-layer-organization.
//
// The rendering is never accepted from a client — one that arrived over the
// wire is arbitrary content displayed to other people — so the payload carries
// selections only. An `art` key riding along is dropped here, by zod's own
// strip, and the art is derived below from what survived.
export const AltvatarSchema = z.object({
  style: z.string().refine(isAltvatarStyleId, {
    message: `Style must be one of ${ALTVATAR_STYLE_IDS.join(', ')}`,
  }),
  options: z.object({
    seed: z.string().max(64),
    selections: z.record(z.string(), z.unknown()),
  }),
});

export type AltvatarInput = z.input<typeof AltvatarSchema>;

// Deliberately not atomic with the profile and membership rows, on the same
// footing as the accent: a profile without its art renders initials, a state
// its siblings already define, while a profile without its membership row is
// unreachable by anyone. Raises nothing and reports instead — creation ignores
// the report and succeeds, an edit surfaces it rather than claiming a face it
// did not save.
export async function writeAltvatar(
  profileId: string,
  input: AltvatarInput
): Promise<boolean> {
  try {
    const parsed = AltvatarSchema.safeParse(input);
    if (!parsed.success) return false;

    const style = parsed.data.style;
    const options = {
      seed: parsed.data.options.seed,
      selections: sanitizeSelections(parsed.data.options.selections),
    };
    const art = await renderAltvatar(style, options);

    await db
      .insert(profile_avatars)
      .values({ profile_id: profileId, style, options, art })
      .onConflictDoUpdate({
        target: profile_avatars.profile_id,
        set: { style, options, art, updated_at: new Date() },
      });
    // Fired here rather than by each caller so the tag tracks the write that
    // lands the row: a failure above invalidates nothing.
    updateTags(cacheTags.avatarOfProfile(profileId));
    return true;
  } catch (error) {
    console.error('Error writing profile Altvatar:', error);
    return false;
  }
}
