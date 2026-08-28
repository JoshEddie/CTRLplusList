'use server';

import { db } from '@/db';
import { profiles } from '@/db/schema';
import { getMembershipsForUser } from '@/lib/data/profile.active';
import { createSelfProfile } from '@/lib/data/profile.self';
import { ProfileSettingsSchema } from '@/lib/data/profile.schema';
import { writeAltvatar } from '@/lib/data/profileAvatar.write';
import { writeAccent } from '@/lib/data/profilePreference.write';
import { UNAUTHORIZED_RESPONSE, authedUserId } from '@/lib/data/user.session';
import {
  cacheTags,
  profileIdentityTags,
  updateTags,
} from '@/lib/cacheTags';
import type { ActionResponse } from '@/lib/types';
import { eq } from 'drizzle-orm';

type OnboardingInput = {
  name: string;
  accent: string;
  altvatar: { style: string; options: { seed: string; selections: unknown } };
};

// Ordering is the recovery mechanism, not an optimization. The profile and its
// membership go in one CTE — the only atomicity neon-http offers — and the art
// and accent follow as their own writes. A submission that writes the profile
// but not the art leaves the account un-onboarded, so the gate stands and
// re-submitting succeeds: the mint swallows its own 23505 rather than failing
// on the profile that already exists. Nothing else recovers a partial write,
// and nothing else needs to.
export async function completeOnboarding(
  data: OnboardingInput
): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) return UNAUTHORIZED_RESPONSE;

    // The same bounds a profile name is subject to everywhere else, so a name
    // accepted here is one every other surface would accept too.
    const parsed = ProfileSettingsSchema.safeParse({ ...data, tagline: null });
    if (!parsed.success) {
      return {
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      };
    }
    const { name, accent, altvatar } = parsed.data;

    const memberships = await getMembershipsForUser(userId);
    const existing = memberships.find((m) => m.role === 'self');

    // An account that already holds a self-profile is renamed rather than
    // given a second one — the sentinel a backfill left is retired here, one
    // account at a time, with no sweep.
    let profileId: string;
    if (existing) {
      await db
        .update(profiles)
        .set({ name, updated_at: new Date() })
        .where(eq(profiles.id, existing.id));
      profileId = existing.id;
    } else {
      // Null means a concurrent submit won the uniqueness race, so the profile
      // exists but under an id this call never saw. The read that finds it has
      // to skip the cache the mint just invalidated nothing for.
      const minted = await createSelfProfile(db, userId, name);
      if (!minted) {
        updateTags(cacheTags.profilesOfUser(userId));
        const raced = (await getMembershipsForUser(userId)).find(
          (m) => m.role === 'self'
        );
        if (!raced) return UNAUTHORIZED_RESPONSE;
        profileId = raced.id;
      } else {
        profileId = minted;
      }
    }

    const artWritten = await writeAltvatar(profileId, altvatar);
    await writeAccent(profileId, accent);

    // Every tag the writes above touched, so the gate does not stand after a
    // submission that succeeded.
    updateTags(
      cacheTags.profilesOfUser(userId),
      ...profileIdentityTags([profileId])
    );

    if (!artWritten) {
      return {
        success: false,
        message: 'Your profile was created, but its Altvatar was not saved',
        error: 'Failed to save Altvatar',
      };
    }
    return { success: true, message: 'Welcome', id: profileId };
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return {
      success: false,
      message: 'An error occurred while setting up your account',
      error: 'Failed to complete onboarding',
    };
  }
}
