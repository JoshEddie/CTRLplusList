import { db } from '@/db';
import {
  items,
  list_items,
  purchases,
  user_blocks,
  user_follows,
} from '@/db/schema';
import { accountsOfProfiles } from '@/lib/data/profile';
import { primaryStore } from '@/lib/storeValidity';
import { avatarViewOf, withProfileAvatar } from '@/lib/data/profileAvatar';
import { MAXIMAL_TIER, type ClaimProjection } from '@/lib/spoilers';
import {
  ActionResponse,
  PurchaseView,
  RoleShape,
  UserIdentity,
} from '@/lib/types';
import { cacheTags, itemRowTags } from '@/lib/cacheTags';
import { and, eq, or } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

type RawPurchase = {
  id: string;
  profile_id: string | null;
  claimed_by_profile_id: string | null;
  guest_name: string | null;
  purchased_at: Date;
  purchaserProfile: {
    name: string;
    avatar?: { art: string; style: string } | null;
    preferences?: { value: string }[];
  } | null;
  claimerProfile: { name: string } | null;
};

// The viewer is named by their SELF-profile, not the profile they act as: a
// claim is a human act, so a viewer's own claims stay recognisable as theirs —
// and keep their unclaim affordance — while they act as another profile.
// Ownership is not an input: what a viewer may see resolves from their
// membership on the owning profile (`spoiler-visibility`), which the caller
// has already resolved into the state arriving here.
export function sanitizePurchases(
  raw: RawPurchase[],
  viewerSelfProfileId: string | undefined,
  projection: ClaimProjection
): PurchaseView[] {
  return raw.reduce<PurchaseView[]>((views, p) => {
    const isSelf =
      !!viewerSelfProfileId && p.profile_id === viewerSelfProfileId;
    const claimedByViewer =
      !!viewerSelfProfileId && p.claimed_by_profile_id === viewerSelfProfileId;
    // A claim the viewer made is not a surprise to them, so the tiers govern
    // other parties' claims alone.
    const held = isSelf || claimedByViewer;

    // `surprise` and `progress` both conceal per-item claim state; `progress`
    // discloses only the list-level count, which the aggregate read derives.
    if (!held && (projection === 'surprise' || projection === 'progress'))
      return views;
    if (!held && projection === 'claims') {
      // The entry survives so the count and the remaining capacity stay
      // derivable; everything identifying is gone with it.
      views.push({ id: p.id, by: 'other', claimedByViewer: false });
      return views;
    }

    const view: PurchaseView = {
      id: p.id,
      by: isSelf ? ('self' as const) : ('other' as const),
      name: p.purchaserProfile?.name ?? p.guest_name ?? undefined,
      claimedByViewer,
      purchasedAt: p.purchased_at,
    };
    if (p.purchaserProfile) view.avatar = avatarViewOf(p.purchaserProfile);
    if (p.claimerProfile && p.claimed_by_profile_id !== p.profile_id) {
      view.claimerName = p.claimerProfile.name;
    }
    views.push(view);
    return views;
  }, []);
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
// Three routes to removal, and they do not take the same profile: the first
// two ask whether this claim is the human's, so they compare the self-profile;
// the third is an ownership comparison and compares the profile the request
// acts as. The identity arrives whole so neither can be reached by default.
// Only the third carries the `owner` floor — master unclaim is an ownership
// act, while a manager's own claim stays theirs to drop.
export function canRemovePurchase(
  row: {
    id: string;
    profile_id: string | null;
    claimed_by_profile_id: string | null;
  },
  itemOwnerProfileId: string | null,
  actor: UserIdentity | null,
  cookiePurchaseIds: ReadonlySet<string>,
  actorRole: RoleShape | null
): boolean {
  if (actor) {
    return (
      row.claimed_by_profile_id === actor.selfProfile.id ||
      row.profile_id === actor.selfProfile.id ||
      (itemOwnerProfileId === actor.activeProfile.id &&
        actorRole !== null &&
        actorRole.admin)
    );
  }
  if (row.claimed_by_profile_id !== null || row.profile_id !== null)
    return false;
  return cookiePurchaseIds.has(row.id);
}

export async function getItemsByPurchased(profileId?: string) {
  'use cache';
  cacheTag(
    cacheTags.items,
    cacheTags.profiles,
    cacheTags.profileAvatars,
    cacheTags.profilePreferences
  );
  if (!profileId) {
    return [];
  }
  cacheTag(cacheTags.purchasesOfProfile(profileId));
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
                  with: withProfileAvatar,
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

    cacheTag(...itemRowTags(result.map((row) => row.item)));

    return result.map(({ item: { stores, ...item } }) => ({
      ...item,
      store: primaryStore(stores),
      // A constant, not a resolved tier: the rows this read selects are ones
      // the viewer purchased, so there is no surprise of theirs to protect and
      // the input cannot go stale — which is why this read keeps sanitizing
      // inside its cache. A sibling claim on the same item is still another
      // party's, and the maximal tier names nobody.
      purchases: sanitizePurchases(item.purchases, profileId, MAXIMAL_TIER),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

// The `progress` tier's aggregate, derived from unprojected rows: at
// `surprise`/`progress` the projected set no longer carries the claims it
// counts. Viewer-independent — it counts claims rather than projecting them —
// so it stays cached under the item read's own tags. Callers invoke it only
// where the resolved tier is `progress` or above, so `surprise` costs no query.
// There is no shopper-names aggregate: that disclosure is dropped.
export async function getListClaimedCount(listId: string) {
  'use cache';
  cacheTag(
    cacheTags.items,
    cacheTags.itemsOfList(listId),
    cacheTags.list(listId)
  );
  try {
    const rows = await db
      .select({ item_id: purchases.item_id })
      .from(purchases)
      .innerJoin(list_items, eq(list_items.item_id, purchases.item_id))
      .where(eq(list_items.list_id, listId));

    return { claimedItemCount: new Set(rows.map((row) => row.item_id)).size };
  } catch (error) {
    console.error('Error fetching list claimed count:', error);
    throw new Error('Failed to fetch list claimed count');
  }
}

// The `revealed` projection of one item's claims, for the owner's claim list to
// fetch once they have confirmed the reveal. Scoped to the item: it re-resolves
// no spoiler state and changes nothing the page's own payload carries.
// Uncached, like the claim picker it sits beside — it is fetched in response to
// an act, and a stale set would name a claim that has since been removed.
export async function getRevealedItemClaims(
  itemId: string,
  viewerSelfProfileId: string | undefined
): Promise<PurchaseView[]> {
  try {
    const rows = await db.query.purchases.findMany({
      where: eq(purchases.item_id, itemId),
      with: {
        purchaserProfile: {
          columns: { name: true },
          with: withProfileAvatar,
        },
        claimerProfile: { columns: { name: true } },
      },
    });
    return sanitizePurchases(rows, viewerSelfProfileId, 'revealed');
  } catch (error) {
    console.error('Error fetching revealed item claims:', error);
    throw new Error('Failed to fetch revealed item claims');
  }
}

// One item's badge-level state, for the count-only reveal the claim affordance
// leads to. It names nobody: a viewer deciding whether to claim needs to know
// that the item is spoken for and what capacity remains, and no more.
export async function getItemClaimSummary(itemId: string) {
  try {
    const [item] = await db
      .select({ quantity_limit: items.quantity_limit })
      .from(items)
      .where(eq(items.id, itemId));
    if (!item) return null;
    const claims = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(eq(purchases.item_id, itemId));
    return {
      claimCount: claims.length,
      remaining:
        item.quantity_limit === null
          ? null
          : Math.max(0, item.quantity_limit - claims.length),
    };
  } catch (error) {
    console.error('Error fetching item claim summary:', error);
    throw new Error('Failed to fetch item claim summary');
  }
}
