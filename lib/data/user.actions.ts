'use server';

import { db } from '@/db';
import { items, profiles, user_follows, users } from '@/db/schema';
import { signIn, signOut } from '@/lib/auth';
import { getEligiblePurchasers } from '@/lib/data/profile';
import { getMembershipsForUser } from '@/lib/data/profile.active';
import { ACTIVE_PROFILE_COOKIE } from '@/lib/data/profile.cookie';
import {
  UNAUTHORIZED_RESPONSE,
  authedIdentity,
  authedUserId,
} from '@/lib/data/user.session';
import { isItemViewable } from '@/lib/listAccess';
import { type ActionResponse, type ProfileAvatarView } from '@/lib/types';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type ClaimPicker = {
  ownerName: string | null;
  pool: (ProfileAvatarView & { id: string })[];
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
    const viewable = await isItemViewable(item_id, viewer);
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
    const pool = await getEligiblePurchasers(
      item.profile_id,
      viewer.selfProfile.id
    );
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
  // The selection belongs to the session that authorized it, not the browser:
  // without this, the next account to sign in here would inherit a selection
  // it holds no membership on.
  (await cookies()).delete(ACTIVE_PROFILE_COOKIE);
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
          eq(user_follows.followee_profile_id, viewer.selfProfile.id)
        )
      );

    updateTags(
      cacheTags.followsOfUser(follower_id),
      cacheTags.followersOfProfile(viewer.selfProfile.id)
    );
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

// The destructive arm, reachable only from the gate's signup population. Such
// an account owns nothing by construction: content hangs off profiles,
// profiles are reachable only through membership, and guest claims are
// cookie-scoped with no account linkage at sign-in — so nothing a guest built
// is destroyed. No ownership check stands in front of it, because with no
// profile there is nothing to own.
export async function abandonAccount(): Promise<void> {
  const userId = await authedUserId();
  if (userId) {
    const memberships = await getMembershipsForUser(userId);
    // Not a defence against a caller: the row set is what makes deletion safe,
    // so it is re-read here rather than trusted from the surface that asked.
    if (!memberships.some((m) => m.role === 'self')) {
      // `accounts` cascades from `user`.
      await db.delete(users).where(eq(users.id, userId));
      updateTags(cacheTags.profilesOfUser(userId));
    }
  }
  await signOut();
}
