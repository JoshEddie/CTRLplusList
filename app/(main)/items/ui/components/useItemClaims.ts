'use client';

import {
  createPurchase,
  removePurchase,
  revealedClaimsForItem,
} from '@/lib/data/purchase.actions';
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
    .map((p) => `${p.id}:${p.name ?? ''}:${p.by}:${p.claimedByViewer}`)
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

  const quantityLimit = item.quantity_limit;
  const claimCount = claims.length;
  const isFullyClaimed =
    quantityLimit !== null &&
    quantityLimit !== undefined &&
    claimCount >= quantityLimit;

  // Claims this viewer can remove: their own (purchaser) or ones they
  // asserted for someone else (claimed_by_profile_id).
  const viewerClaims = useMemo(
    () => claims.filter((p) => p.by === 'self' || p.claimedByViewer),
    [claims]
  );
  const hasViewerClaim = viewerClaims.length > 0;
  const hasAnyClaim = claimCount > 0;
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
    if (!revealNames || !namesWithheld || !item.id) return;
    let cancelled = false;
    revealedClaimsForItem(item.id).then((revealed) => {
      if (!cancelled) setRevealedClaims(revealed);
    });
    return () => {
      cancelled = true;
    };
  }, [revealNames, namesWithheld, item.id]);

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
          loading: 'Removing claim',
          success: 'Claim removed successfully',
          error: 'Failed to remove claim',
        }
      );
      setClaims((prev) => prev.filter((p) => p.id !== claim.id));
      setRevealedClaims((prev) => prev?.filter((p) => p.id !== claim.id) ?? null);
      return true;
    } catch (error) {
      console.error('Failed to remove purchase:', error);
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
    },
    optimistic: Omit<PurchaseView, 'id'>,
    settle: (succeeded: boolean, claim?: PurchaseView) => void = onSettled
  ) => {
    try {
      const result = await toast.promise(createPurchase(payload), {
        loading: 'Adding claim',
        success: 'Claim added successfully',
        error: (err: Error) => err?.message || 'Failed to add claim',
      });
      const id = result?.success ? result.id : undefined;
      if (id) {
        setClaims((prev) =>
          prev.some((p) => p.id === id) ? prev : [...prev, { ...optimistic, id }]
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
    settle?: (succeeded: boolean, claim?: PurchaseView) => void
  ) =>
    recordClaim(
      { item_id: item.id || '', guest_name: null },
      {
        by: 'self',
        name: userName || 'You',
        claimedByViewer: true,
        purchasedAt: new Date(),
      },
      settle
    );

  // Below `claims` the projection withheld other parties' claims, so a counter
  // computed from the payload would state a false zero rather than hide.
  const showCounter = quantityLimit !== 1 && atLeast(tier, 'claims');

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
    showCounter,
    counterText:
      quantityLimit == null
        ? `${claimCount}/∞ claimed`
        : `${claimCount}/${quantityLimit} claimed`,
    // "Sold out" treatment (strikethrough price, faded stores, hidden claim
    // button) only fires when the item is fully claimed. Partial multi-claim
    // and unlimited items still accept buyers, so stores + claim button stay
    // live and price stays unstruck.
    showPurchased: isFullyClaimed && !isOwner,
    // The owner-side claim pill. Keyed on the resolved tier rather than on a
    // spoiler parameter: never below `claims`, and from `claims` upward whenever
    // claims exist (`item-store-links`).
    showSpoilerInfo: showsSpoilerBanner(isOwner, tier, hasAnyClaim),
    showBuyClaim:
      !!actor &&
      !isOwner &&
      !isFullyClaimed &&
      !hasViewerClaim &&
      storeComplete(item.store),
    undoClaim,
    dismissUndo: () => setUndoClaim(null),
    removeClaim,
    handleManageRemove,
    handleSelfClaim: () => recordSelfClaim(),
    handleBuyClaim: () =>
      recordSelfClaim((succeeded, claim) => {
        if (succeeded && claim) setUndoClaim(claim);
      }),
    handleAttributedClaim: (target: AttributedTarget) =>
      recordClaim(
        { item_id: item.id || '', guest_name: null, purchased_by: target.id },
        {
          by: target.id === actor?.id ? 'self' : 'other',
          name: target.name,
          claimedByViewer: true,
          purchasedAt: new Date(),
        }
      ),
    handleGuestClaim: (name: string) =>
      recordClaim(
        { item_id: item.id || '', guest_name: name },
        {
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
