'use client';

import {
  createPurchase,
  removePurchase,
  revealedClaimsForEntry,
  setPurchaseUnits,
} from '@/lib/data/purchase.actions';
import { getMessage } from '@/lib/i18n/utils';
import { atLeast } from '@/lib/spoilers';
import { storeComplete } from '@/lib/storeValidity';
import {
  ItemDisplay,
  ProfileMembershipView,
  PurchaseView,
  SpoilerTier,
} from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AttributedTarget } from './purchasemodal/PurchaseFlowContainer';
import { claimSummaryOf, showsSpoilerBanner } from './utils';

// The one line a row carries under itself, so the card renders a single node.
// `progress` is the claim fraction where the viewer's tier grants it and null
// where it does not — the owner included, whose claim count belongs on the
// spoiler banner rather than beside their own number. Empty off a list, on an
// entry asking for one (so an ordinary list reads as it always has), and on a
// sold-out row, which leaves the line to its claimed-by banner.
function entryLineOf(
  entry: { quantity: number } | null,
  multiUnit: boolean,
  soldOut: boolean,
  progress: string | null
): string {
  if (!entry || !multiUnit || soldOut) return '';
  return (
    progress ??
    getMessage('entry_quantity_wanted', { quantity: entry.quantity })
  );
}

// The list entry a card was read through, or null on the item library, which
// spans every list and so has no entry to claim against. One discriminator for
// the whole hook: the id and the capacity arrive together or not at all, so
// nothing downstream can test one and assume the other.
//
// `claimedUnits` is the entry's own number, never summed from the projected
// claims — a per-claim unit count is not something the claims tier discloses.
// `unitDelta` keeps an optimistic claim visible until the page re-reads, and
// moves with the units a claim covers rather than by one per row.
function entryOf(item: ItemDisplay, unitDelta: number) {
  if (item.list_id === undefined || item.quantity === undefined) return null;
  return {
    listId: item.list_id,
    quantity: item.quantity,
    claimedUnits: (item.claimed_units ?? 0) + unitDelta,
    // Soft-removed: still an entry, and still one whose claims are managed,
    // but the owner has dropped the item so it takes no new ones.
    removed: !!item.removed,
  };
}

// A claim's own unit count where the viewer may see it, and one otherwise —
// the claims-tier stub for another party's claim carries none. The fallback
// only has to be stable, not true: the stubs are identical on both sides of
// the delta this feeds, so whatever they contribute cancels.
const sumUnits = (rows: PurchaseView[]) =>
  rows.reduce((total, row) => total + (row.units ?? 1), 0);

// The viewer's picture of one item's claims: the projected array the page
// arrived with, everything derived from it, and the writes that change it.
export function useItemClaims({
  item,
  isOwner,
  tier,
  actor,
  userName,
  revealNames,
  onSettled,
}: {
  item: ItemDisplay;
  isOwner: boolean;
  tier: SpoilerTier;
  actor?: ProfileMembershipView;
  userName?: string | null;
  /** The reveal that promises names is open, so nameless stubs must be re-read. */
  revealNames: boolean;
  /** Closes the modal a claim was recorded or removed from. */
  onSettled: () => void;
}) {
  const propPurchases = item.purchases ?? [];
  const propPurchasesKey = propPurchases
    .map(
      (p) =>
        `${p.id}:${p.units ?? ''}:${p.name ?? ''}:${p.by}:${p.claimedByViewer}`
    )
    .join('|');
  const [claims, setClaims] = useState<PurchaseView[]>(propPurchases);
  const [prevPropKey, setPrevPropKey] = useState(propPurchasesKey);
  if (propPurchasesKey !== prevPropKey) {
    setPrevPropKey(propPurchasesKey);
    setClaims(propPurchases);
  }

  // Ephemeral by design (claim-attribution spec): a reload lands on the
  // persistent Manage claim affordance, never re-pops the undo nudge. Holds
  // the just-recorded claim so undo can never retarget an older claim.
  const [undoClaim, setUndoClaim] = useState<PurchaseView | null>(null);
  const [revealedClaims, setRevealedClaims] = useState<PurchaseView[] | null>(
    null
  );

  const entry = entryOf(item, sumUnits(claims) - sumUnits(propPurchases));
  const isFullyClaimed = !!entry && entry.claimedUnits >= entry.quantity;
  const claimable = !!entry;
  // The one card that carries an entry and still takes no new claim: the owner
  // dropped the item, and the only reason a removed one is on the page at all
  // is a claim somebody already holds. Managing that claim is row-based, so it
  // is unaffected — and the entry's capacity is still real, which is why this
  // is a second signal rather than a narrowing of `claimable`.
  const acceptsClaims = claimable && !entry.removed;
  const entryListId = entry?.listId;

  // Claims this viewer can remove: their own (purchaser) or ones they
  // asserted for someone else (claimed_by_profile_id).
  const viewerClaims = useMemo(
    () => claims.filter((p) => p.by === 'self' || p.claimedByViewer),
    [claims]
  );
  const hasViewerClaim = viewerClaims.length > 0;
  const hasAnyClaim = claims.length > 0;
  const claimSummary = useMemo(() => claimSummaryOf(claims), [claims]);

  // The claim affordance's reveal is the count and the remaining capacity, which
  // only a tier below `claims` withholds. The owner's manage-claims list is the
  // one view that names the claiming parties, so it is also the one that has to
  // ask when the payload kept them as nameless stubs.
  const countWithheld = !atLeast(tier, 'claims');
  const namesWithheld =
    isOwner &&
    (countWithheld || claims.some((claim) => claim.name === undefined));

  // Keyed on the open modal rather than on the confirmation, so a direct link
  // to `?purchaseItem=` lands on the same disclosed set the dialog leads to.
  // The claim route is never that modal: its reveal promises the count and no
  // names, so it reads the page's payload however nameless it arrives.
  useEffect(() => {
    if (!revealNames || !namesWithheld || !item.id || !entryListId) return;
    let cancelled = false;
    revealedClaimsForEntry(entryListId, item.id).then((revealed) => {
      if (!cancelled) setRevealedClaims(revealed);
    });
    return () => {
      cancelled = true;
    };
  }, [revealNames, namesWithheld, item.id, entryListId]);

  // Both claim arrays the hook holds move together: the payload's set and the
  // reveal's, when one has been fetched.
  const applyLocally = (update: (rows: PurchaseView[]) => PurchaseView[]) => {
    setClaims(update);
    setRevealedClaims((prev) => (prev ? update(prev) : null));
  };

  // One home for claim removal: dispatch, toast copy, and local-state filter.
  const removeClaim = async (claim: PurchaseView) => {
    try {
      await toast.promise(
        // A refused removal answers `{ success: false }`, which resolves —
        // rejecting it is what routes the refusal to the error toast rather
        // than reporting the removal that did not happen.
        removePurchase({ purchase_id: claim.id }).then((response) => {
          if (!response?.success) throw new Error(response?.message);
          return response;
        }),
        {
          loading: getMessage('claim_remove_loading'),
          success: getMessage('claim_remove_success'),
          error: getMessage('claim_remove_error'),
        }
      );
      applyLocally((rows) => rows.filter((p) => p.id !== claim.id));
      return true;
    } catch (error) {
      console.error('Failed to remove purchase:', error);
      return false;
    }
  };

  // Moving a claim's units, including to zero — which the action routes to
  // removal, so the local state drops the row rather than showing a claim for
  // nothing.
  const updateClaimUnits = async (claim: PurchaseView, units: number) => {
    try {
      await toast.promise(
        setPurchaseUnits({ purchase_id: claim.id, units }).then((response) => {
          if (!response?.success) throw new Error(response?.message);
          return response;
        }),
        {
          loading: getMessage('claim_units_loading'),
          success: getMessage('claim_units_success'),
          error: (err: Error) => err?.message || getMessage('claim_units_error'),
        }
      );
      applyLocally((rows) =>
        units === 0
          ? rows.filter((p) => p.id !== claim.id)
          : rows.map((p) => (p.id === claim.id ? { ...p, units } : p))
      );
      return true;
    } catch (error) {
      console.error('Failed to update purchase units:', error);
      return false;
    }
  };

  const handleManageRemove = async (claim: PurchaseView) => {
    const wasLast = viewerClaims.length <= 1;
    const removed = await removeClaim(claim);
    if (removed && wasLast) onSettled();
  };

  const recordClaim = async (
    payload: {
      item_id: string;
      guest_name: string | null;
      purchased_by?: string;
      units?: number;
    },
    optimistic: Omit<PurchaseView, 'id'>,
    settle: (succeeded: boolean, claim?: PurchaseView) => void = onSettled
  ) => {
    // No entry, no claim — the one place the whole hook names a list, so no
    // handler can reach the action without one.
    if (!entryListId) return;
    try {
      const result = await toast.promise(
        createPurchase({ ...payload, list_id: entryListId }),
        {
          loading: getMessage('claim_add_loading'),
          success: getMessage('claim_add_success'),
          error: (err: Error) => err?.message || getMessage('claim_add_error'),
        }
      );
      const id = result?.success ? result.id : undefined;
      if (id) {
        setClaims((prev) =>
          prev.some((p) => p.id === id)
            ? prev
            : [...prev, { ...optimistic, id }]
        );
      } else if (!result?.success && result?.message) {
        toast.error(result.message);
      }
      settle(!!id, id ? { ...optimistic, id } : undefined);
    } catch (error) {
      console.error('Failed to create purchase:', error);
    }
  };

  const recordSelfClaim = (
    units: number,
    settle?: (succeeded: boolean, claim?: PurchaseView) => void
  ) =>
    recordClaim(
      { item_id: item.id || '', guest_name: null, units },
      {
        units,
        by: 'self',
        name: userName || getMessage('viewer_name_placeholder'),
        claimedByViewer: true,
        purchasedAt: new Date(),
      },
      settle
    );

  // An entry asking for one has no fraction to show, and the library has no
  // entry at all.
  const multiUnit = !!entry && entry.quantity !== 1;

  // Below `claims` the entry's count is withheld, so a counter drawn from the
  // payload would state a false zero rather than hide.
  const showCounter = multiUnit && atLeast(tier, 'claims');

  // An entry meeting its quantity says so plainly rather than showing a
  // fraction: an owner who lowered the number afterwards would otherwise be
  // presented with one that looks broken. Empty off a list, where there is no
  // capacity to count against — what a surface shows instead is that surface's
  // to decide, not this hook's to invent a second phrasing for.
  const counterText = !entry
    ? ''
    : isFullyClaimed
      ? getMessage('claim_fully_claimed')
      : getMessage('claim_counter', {
          claimed: entry.claimedUnits,
          quantity: entry.quantity,
        });

  const showPurchased = isFullyClaimed && !isOwner;

  const entryLine = entryLineOf(
    entry,
    multiUnit,
    showPurchased,
    showCounter && !isOwner ? counterText : null
  );

  return {
    claims,
    revealedClaims,
    viewerClaims,
    hasViewerClaim,
    viewerIsPurchaser: viewerClaims.some((p) => p.by === 'self'),
    hasAnyClaim,
    isFullyClaimed,
    claimSummary,
    countWithheld,
    namesWithheld,
    counterText,
    entryLine,
    // "Sold out" treatment (strikethrough price, faded stores, hidden claim
    // button) only fires once the entry's units are all spoken for. An entry
    // with room left still accepts buyers, so stores + claim button stay live
    // and price stays unstruck.
    showPurchased,
    // The owner-side claim pill. Keyed on the resolved tier rather than on a
    // spoiler parameter: never below `claims`, and from `claims` upward whenever
    // claims exist (`item-store-links`).
    showSpoilerInfo: showsSpoilerBanner(isOwner, tier, hasAnyClaim),
    // No entry, no claim: the library's items span every list and some sit on
    // none, so the affordance that creates a claim is not offered there.
    claimable,
    acceptsClaims,
    // What a units control may offer. Null off a list, which is what withdraws
    // the control entirely — the same discriminator the claim affordance uses.
    capacity: entry
      ? {
          quantity: entry.quantity,
          remaining: Math.max(0, entry.quantity - entry.claimedUnits),
        }
      : null,
    showBuyClaim:
      !!actor &&
      acceptsClaims &&
      !isOwner &&
      !isFullyClaimed &&
      !hasViewerClaim &&
      storeComplete(item.store),
    undoClaim,
    dismissUndo: () => setUndoClaim(null),
    removeClaim,
    updateClaimUnits,
    handleManageRemove,
    handleSelfClaim: (units = 1) => recordSelfClaim(units),
    // Buy & Claim stays one unit however many the entry wants: the fast path
    // records a claim without asking anything. Its confirmation is where a
    // purchaser who bought several raises the count.
    handleBuyClaim: () =>
      recordSelfClaim(1, (succeeded, claim) => {
        if (succeeded && claim) setUndoClaim(claim);
      }),
    handleAttributedClaim: (target: AttributedTarget, units = 1) =>
      recordClaim(
        {
          item_id: item.id || '',
          guest_name: null,
          purchased_by: target.id,
          units,
        },
        {
          units,
          by: target.id === actor?.id ? 'self' : 'other',
          name: target.name,
          claimedByViewer: true,
          purchasedAt: new Date(),
        }
      ),
    handleGuestClaim: (name: string, units = 1) =>
      recordClaim(
        { item_id: item.id || '', guest_name: name, units },
        {
          units,
          // Signed-out guest: the cookie written by the action makes this the
          // viewer's own claim, matching the server overlay's by:'self' marking.
          by: actor ? 'other' : 'self',
          name,
          claimedByViewer: true,
          purchasedAt: new Date(),
        }
      ),
  };
}
