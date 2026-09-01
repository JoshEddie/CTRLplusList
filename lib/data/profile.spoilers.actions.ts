'use server';

import { db } from '@/db';
import { profile_members } from '@/db/schema';
import { FORBIDDEN_RESPONSE, ownsProfile } from '@/lib/data/profile.gate';
import {
  writeMemberTier,
  writeSpoilerDefault,
} from '@/lib/data/profilePreference.write';
import { UNAUTHORIZED_RESPONSE, authedUserId } from '@/lib/data/user.session';
import type { ActionResponse, SpoilerTier } from '@/lib/types';
import { and, eq } from 'drizzle-orm';

const FAILED: ActionResponse = {
  success: false,
  message: 'An error occurred while updating claim visibility',
  error: 'Failed to update claim visibility',
};

// Claim visibility is a preference, not a permission: a member writes their own
// row whatever their role, and an owner writes anyone's. The disabled control
// in Settings is never the enforcement.
export async function setMemberTier(
  profileId: string,
  userId: string,
  tier: SpoilerTier
): Promise<ActionResponse> {
  try {
    const actingUserId = await authedUserId();
    if (!actingUserId) return UNAUTHORIZED_RESPONSE;
    if (
      actingUserId !== userId &&
      !(await ownsProfile(actingUserId, profileId))
    )
      return FORBIDDEN_RESPONSE;

    // The tier is an account-keyed preference row, so it can be written for a
    // non-member — guard against that, keeping the roster the source of truth
    // for who is a member.
    const [membership] = await db
      .select({ user_id: profile_members.user_id })
      .from(profile_members)
      .where(
        and(
          eq(profile_members.user_id, userId),
          eq(profile_members.profile_id, profileId)
        )
      );
    if (!membership) {
      return {
        success: false,
        message: 'That membership can no longer be changed',
        error: 'No membership',
      };
    }

    if (!(await writeMemberTier(profileId, userId, tier))) return FAILED;
    return { success: true, message: 'Claim visibility updated' };
  } catch (error) {
    console.error('Error updating member tier:', error);
    return FAILED;
  }
}

// The seed alone. Writing it moves no membership — an owner correcting a
// profile-wide value does so one member at a time, through `setMemberTier`.
export async function setProfileSpoilerDefault(
  profileId: string,
  tier: SpoilerTier
): Promise<ActionResponse> {
  try {
    const actingUserId = await authedUserId();
    if (!actingUserId) return UNAUTHORIZED_RESPONSE;
    if (!(await ownsProfile(actingUserId, profileId))) return FORBIDDEN_RESPONSE;
    if (!(await writeSpoilerDefault(profileId, tier))) return FAILED;
    return { success: true, message: 'Default claim visibility updated' };
  } catch (error) {
    console.error('Error updating profile spoiler default:', error);
    return FAILED;
  }
}
