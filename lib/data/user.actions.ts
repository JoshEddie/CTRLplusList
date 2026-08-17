'use server';

import { db } from '@/db';
import { items, profiles, user_follows } from '@/db/schema';
import { signIn, signOut } from '@/lib/auth';
import { getEligiblePurchasers } from '@/lib/data/profile';
import {
  UNAUTHORIZED_RESPONSE,
  authedIdentity,
} from '@/lib/data/user.session';
import { isItemViewable } from '@/lib/listAccess';
import { type ActionResponse } from '@/lib/types';
import { and, eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export type ClaimPicker = {
  ownerName: string | null;
  pool: { id: string; name: string | null; image: string | null }[];
};

// Read bridge for the claim modal's attributed-purchaser picker: resolves the
// claimer from the session and scopes the cached pool read (getEligiblePurchasers)
// to an item the claimer can view. Guests get null — their modal has no picker.
export async function getClaimPickerForItem(
  item_id: string
): Promise<ClaimPicker | null> {
  try {
    const viewer = await authedIdentity();
    if (!viewer) return null;
    const viewable = await isItemViewable(item_id, viewer.profile.id);
    if (!viewable) return null;
    const item = await db.query.items.findFirst({
      where: eq(items.id, item_id),
      columns: { profile_id: true },
    });
    if (!item) return null;
    const owner = await db.query.profiles.findFirst({
      where: eq(profiles.id, item.profile_id),
      columns: { name: true },
    });
    const pool = await getEligiblePurchasers(item.profile_id, viewer.profile.id);
    /* v8 ignore next -- the missing-owner arm of `owner?.name`: items.profile_id is NOT NULL and FKs to profiles, so the row always resolves; the optional chain only satisfies findFirst's `| undefined` return type. */
    return { ownerName: owner?.name ?? null, pool };
  } catch (error) {
    console.error('Error fetching claim picker:', error);
    return null;
  }
}

export async function signInUser() {
  await signIn('google');
}

export async function signOutUser() {
  await signOut({ redirect: false });
  redirect('/sign-in');
}

export async function removeFollower(
  follower_id: string
): Promise<ActionResponse> {
  try {
    const viewer = await authedIdentity();
    if (!viewer) {
      return UNAUTHORIZED_RESPONSE;
    }

    await db
      .delete(user_follows)
      .where(
        and(
          eq(user_follows.follower_id, follower_id),
          eq(user_follows.followee_profile_id, viewer.profile.id)
        )
      );

    updateTag('user_follows');
    return { success: true, message: 'Follower removed' };
  } catch (error) {
    console.error('Error removing follower:', error);
    return {
      success: false,
      message: 'Failed to remove follower',
      error: 'Failed',
    };
  }
}
