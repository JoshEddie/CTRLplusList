import { db } from '@/db';
import { purchases, user_blocks, user_follows } from '@/db/schema';
import { accountsOfProfiles } from '@/lib/data/profile';
import { primaryStore } from '@/lib/storeValidity';
import { withSelfAvatar } from '@/lib/data/profile.identity';
import { ActionResponse, PurchaseView } from '@/lib/types';
import { and, eq, or } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

type RawPurchase = {
  id: string;
  profile_id: string | null;
  claimed_by_profile_id: string | null;
  guest_name: string | null;
  purchased_at: Date;
  purchaserProfile:
    | { name: string | null; members: { user: { image: string | null } }[] }
    | null;
  claimerProfile: { name: string | null } | null;
};

function firstNameOf(name: string | null | undefined): string {
  if (!name) return 'Someone';
  const trimmed = name.trim();
  if (!trimmed) return 'Someone';
  return trimmed.split(/\s+/)[0];
}

export function sanitizePurchases(
  raw: RawPurchase[],
  viewerProfileId: string | undefined,
  isOwner: boolean,
  showSpoilers: boolean = false
): PurchaseView[] {
  if (isOwner && !showSpoilers) return [];
  // First names only; 'self' keys off the purchaser (profile_id), so an
  // attributed profile sees the claim as their own. claimedByViewer keys off
  // claimed_by_profile_id and drives the asserter's unclaim affordance.
  return raw.map((p) => {
    const isSelf = !!viewerProfileId && p.profile_id === viewerProfileId;
    const view: PurchaseView = {
      id: p.id,
      by: isSelf ? ('self' as const) : ('other' as const),
      firstName: firstNameOf(p.purchaserProfile?.name ?? p.guest_name),
      claimedByViewer:
        !!viewerProfileId && p.claimed_by_profile_id === viewerProfileId,
      purchasedAt: p.purchased_at,
      image: p.purchaserProfile?.members[0]?.user.image ?? null,
    };
    if (
      isOwner &&
      p.claimed_by_profile_id &&
      p.claimed_by_profile_id !== p.profile_id
    ) {
      view.claimerFirstName = firstNameOf(p.claimerProfile?.name);
    }
    return view;
  });
}

// Not cached: authorizes a write (createPurchase attribution), so it must see
// the live follow/block graph, not a tagged snapshot.
//
// Both follow legs resolve each side's account through the profile's `self`
// membership — a follow edge runs from a human to a profile, and a profile is
// never a follower. A profile with no account satisfies neither leg, so a
// managed owner or target falls out ineligible with no special case.
export async function isEligiblePurchaser(
  ownerProfileId: string,
  claimerProfileId: string,
  targetProfileId: string
): Promise<boolean> {
  if (targetProfileId === ownerProfileId) return false;
  const accounts = await accountsOfProfiles([ownerProfileId, targetProfileId]);
  const ownerUserId = accounts.get(ownerProfileId);
  const targetUserId = accounts.get(targetProfileId);
  if (!ownerUserId || !targetUserId) return false;

  const mutualRows = await db
    .select({ followee_profile_id: user_follows.followee_profile_id })
    .from(user_follows)
    .where(
      or(
        and(
          eq(user_follows.follower_id, ownerUserId),
          eq(user_follows.followee_profile_id, targetProfileId)
        ),
        and(
          eq(user_follows.follower_id, targetUserId),
          eq(user_follows.followee_profile_id, ownerProfileId)
        )
      )
    );
  const ownerFollowsTarget = mutualRows.some(
    (r) => r.followee_profile_id === targetProfileId
  );
  const targetFollowsOwner = mutualRows.some(
    (r) => r.followee_profile_id === ownerProfileId
  );
  if (!ownerFollowsTarget || !targetFollowsOwner) return false;

  const blockRows = await db
    .select({ blocker_profile_id: user_blocks.blocker_profile_id })
    .from(user_blocks)
    .where(
      or(
        and(
          eq(user_blocks.blocker_profile_id, claimerProfileId),
          eq(user_blocks.blocked_profile_id, targetProfileId)
        ),
        and(
          eq(user_blocks.blocker_profile_id, targetProfileId),
          eq(user_blocks.blocked_profile_id, claimerProfileId)
        )
      )
    );
  return blockRows.length === 0;
}

export function duplicateClaimResponse(isAttributed: boolean): ActionResponse {
  return {
    success: false,
    message: isAttributed
      ? 'Already marked as the purchaser'
      : 'You have already claimed this item',
    error: 'Duplicate claim',
  };
}

// Best-effort pre-insert checks; the partial unique index on
// purchases (item_id, profile_id) is the concurrency backstop for purchaser
// duplicates (createPurchase catches the unique violation on insert).
export function claimConflictResponse(
  existing: { profile_id: string | null; guest_name: string | null }[],
  purchaserProfileId: string | null,
  guestName: string | null,
  quantityLimit: number | null,
  isAttributed: boolean
): ActionResponse | null {
  const isDuplicate = existing.some((p) =>
    purchaserProfileId
      ? p.profile_id === purchaserProfileId
      : !!guestName && p.guest_name === guestName
  );
  if (isDuplicate) return duplicateClaimResponse(isAttributed);
  if (quantityLimit !== null && existing.length >= quantityLimit) {
    return {
      success: false,
      message: 'This item is fully claimed',
      error: 'Fully claimed',
    };
  }
  return null;
}

// Removal rights matrix: the claimer (claimed_by_profile_id), the purchaser
// (profile_id), or the item's owning profile (master unclaim) — all profile-id
// comparisons. Unauthenticated callers are authorized only on
// all-NULL-identity rows whose id their guest_claims cookie lists — the cookie
// is ambient request state, never a payload field.
export function canRemovePurchase(
  row: {
    id: string;
    profile_id: string | null;
    claimed_by_profile_id: string | null;
  },
  itemOwnerProfileId: string | null,
  actorProfileId: string | null,
  cookiePurchaseIds: ReadonlySet<string>
): boolean {
  if (actorProfileId) {
    return (
      row.claimed_by_profile_id === actorProfileId ||
      row.profile_id === actorProfileId ||
      itemOwnerProfileId === actorProfileId
    );
  }
  if (row.claimed_by_profile_id !== null || row.profile_id !== null)
    return false;
  return cookiePurchaseIds.has(row.id);
}

export async function getItemsByPurchased(profileId?: string) {
  'use cache';
  cacheTag('items');
  if (!profileId) {
    return [];
  }
  try {
    const result = await db.query.purchases.findMany({
      where: eq(purchases.profile_id, profileId),
      with: {
        item: {
          with: {
            stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
            purchases: {
              with: {
                purchaserProfile: {
                  columns: { name: true },
                  with: withSelfAvatar,
                },
                claimerProfile: {
                  columns: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: (purchases, { desc }) => [desc(purchases.purchased_at)],
    });

    return result.map(({ item: { stores, ...item } }) => ({
      ...item,
      store: primaryStore(stores),
      purchases: sanitizePurchases(item.purchases, profileId, false),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}
