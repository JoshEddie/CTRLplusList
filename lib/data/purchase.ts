import { db } from '@/db';
import {
  list_items,
  lists,
  purchases,
  user_blocks,
  user_follows,
} from '@/db/schema';
import { accountsOfProfiles } from '@/lib/data/profile';
import { getMessage } from '@/lib/i18n/utils';
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
import { and, eq, or, sum } from 'drizzle-orm';
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
      // A bare presence flag: one stub per claim, so the person count survives,
      // and no unit count on it. Capacity is read off the entry instead — a
      // per-row unit count here would turn "three people claimed" into "one
      // person claimed three", which is more than this tier ever disclosed.
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
    message: getMessage(
      isAttributed ? 'claim_duplicate_attributed' : 'claim_duplicate_own'
    ),
    error: getMessage('claim_error_duplicate'),
  };
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

    // A claim whose item was deleted has no live item to render. Dropping it
    // here keeps this page reading exactly as it did when deleting an item
    // destroyed the claim outright; the record view that gives an orphan
    // something to show is a later ticket.
    const claimedItems = result.flatMap((row) => (row.item ? [row.item] : []));
    cacheTag(...itemRowTags(claimedItems));

    return claimedItems.map(({ stores, ...item }) => ({
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
    cacheTags.lists,
    cacheTags.itemsOfList(listId),
    cacheTags.list(listId)
  );
  try {
    // Driven from `lists`, not `purchases`: the tag below has to name the
    // owning profile even when the list carries no claim yet, and a
    // purchases-first join has no row to read it from until the first one
    // lands — which is the very claim the count must move for.
    const rows = await db
      .select({
        profile_id: lists.profile_id,
        item_id: list_items.item_id,
        purchase_id: purchases.id,
      })
      .from(lists)
      .leftJoin(list_items, eq(list_items.list_id, lists.id))
      // Both legs, not the item alone: a claim made on another list that
      // happens to share the item is not this list's progress.
      .leftJoin(
        purchases,
        and(
          eq(purchases.item_id, list_items.item_id),
          eq(purchases.list_id, list_items.list_id)
        )
      )
      .where(eq(lists.id, listId));

    // Claims land on items the list's own profile owns (setListItems refuses
    // any other), so this is the same tag createPurchase / removePurchase
    // already fire — the read joins the writers' invalidation without any
    // writer gaining an obligation. Every row carries the one owning profile,
    // so the first is the whole answer.
    const [owner] = rows;
    if (owner) cacheTag(cacheTags.itemsOfProfile(owner.profile_id));

    return {
      claimedItemCount: new Set(
        rows.filter((row) => row.purchase_id !== null).map((row) => row.item_id)
      ).size,
    };
  } catch (error) {
    console.error('Error fetching list claimed count:', error);
    throw new Error('Failed to fetch list claimed count');
  }
}

// The `revealed` projection of one entry's claims, for the owner's claim list
// to fetch once they have confirmed the reveal. Scoped to the entry, matching
// the set the page already showed as nameless stubs; it re-resolves no spoiler
// state and changes nothing the page's own payload carries. Uncached, like the
// claim picker it sits beside — it is fetched in response to an act, and a
// stale set would name a claim that has since been removed.
export async function getRevealedEntryClaims(
  listId: string,
  itemId: string,
  viewerSelfProfileId: string | undefined
): Promise<PurchaseView[]> {
  try {
    const rows = await db.query.purchases.findMany({
      where: and(eq(purchases.list_id, listId), eq(purchases.item_id, itemId)),
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
    console.error('Error fetching revealed entry claims:', error);
    throw new Error('Failed to fetch revealed entry claims');
  }
}

// One entry's badge-level state, for the count-only reveal the claim
// affordance leads to. It names nobody: a viewer deciding whether to claim
// needs to know that the entry is spoken for and what capacity remains, and no
// more. Both numbers are units, so nothing here puts a unit count beside a
// person count and invites them to be read as one another.
export async function getEntryClaimSummary(listId: string, itemId: string) {
  try {
    const [entry] = await db
      .select({ quantity: list_items.quantity })
      .from(list_items)
      .where(
        and(eq(list_items.list_id, listId), eq(list_items.item_id, itemId))
      );
    if (!entry) return null;
    // Summed rather than read off a counter: a stored copy would be a second
    // answer to what the claim rows already say, and this driver has nothing
    // that holds the two equal (ADR-0016).
    const [summed] = await db
      .select({ units: sum(purchases.units) })
      .from(purchases)
      .where(and(eq(purchases.list_id, listId), eq(purchases.item_id, itemId)));
    const claimedUnits = Number(summed?.units ?? 0);
    return {
      claimedUnits,
      remaining: Math.max(0, entry.quantity - claimedUnits),
    };
  } catch (error) {
    console.error('Error fetching entry claim summary:', error);
    throw new Error('Failed to fetch entry claim summary');
  }
}
