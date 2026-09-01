'use client';

import { createPurchase, removePurchase } from '@/lib/data/purchase.actions';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import {
  ProfileMembershipView,
  ItemDisplay,
  PurchaseView,
  SpoilerTier,
} from '@/lib/types';
import { atLeast } from '@/lib/spoilers';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import '../styles/item.css';
import ClaimBanners from './ClaimBanners';
import ClaimUndoPopup from './ClaimUndoPopup';
import ItemCard from './ItemCard';
import OwnerActions from './OwnerActions';
import PurchaseModalSlot from './PurchaseModalSlot';
import { AttributedTarget } from './purchasemodal/PurchaseFlowContainer';
import { storeComplete } from '@/lib/storeValidity';
import {
  claimSummaryOf,
  containerClasses,
  firstToken,
  resolveModalView,
  showsSpoilerBanner,
} from './utils';

export default function Item({
  item,
  className,
  actor,
  user_name,
  tier = 'identity',
  showArchiveAction,
  archivedView,
  preview,
  listId,
}: {
  item: ItemDisplay;
  className?: string;
  /** The profile the request acts as, absent for a signed-out visitor. */
  actor?: ProfileMembershipView;
  user_name?: string | null;
  /** The viewer's resolved tier (`spoiler-visibility`). Defaults to the maximal projection, which is what a non-member resolves to. */
  tier?: SpoilerTier;
  showArchiveAction?: boolean;
  archivedView?: boolean;
  /** Render as a live preview inside the item form: no modal, no interactions. */
  preview?: boolean;
  /** Owned-list context — enables the "Remove from list" owner action. */
  listId?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const showModal = useMemo(
    () => searchParams?.get('purchaseItem') === item.id,
    [searchParams, item.id]
  );

  // Ephemeral by design (claim-attribution spec): a reload lands on the
  // persistent Manage claim affordance, never re-pops the undo nudge. Holds
  // the just-recorded claim so undo can never retarget an older claim.
  const [undoClaim, setUndoClaim] = useState<PurchaseView | null>(null);

  const propPurchases = item.purchases ?? [];
  const propPurchasesKey = propPurchases
    .map((p) => `${p.id}:${p.firstName ?? ''}:${p.by}:${p.claimedByViewer}`)
    .join('|');
  const [localPurchases, setLocalPurchases] =
    useState<PurchaseView[]>(propPurchases);
  const [prevPropKey, setPrevPropKey] = useState(propPurchasesKey);
  if (propPurchasesKey !== prevPropKey) {
    setPrevPropKey(propPurchasesKey);
    setLocalPurchases(propPurchases);
  }

  const isOwner = actor?.id === item.profile_id;
  const quantityLimit = item.quantity_limit;
  const claimCount = localPurchases.length;
  const isFullyClaimed =
    quantityLimit !== null &&
    quantityLimit !== undefined &&
    claimCount >= quantityLimit;

  // Claims this viewer can remove: their own (purchaser) or ones they
  // asserted for someone else (claimed_by_profile_id).
  const viewerClaims = useMemo(
    () => localPurchases.filter((p) => p.by === 'self' || p.claimedByViewer),
    [localPurchases]
  );
  const hasViewerClaim = viewerClaims.length > 0;
  const viewerIsPurchaser = viewerClaims.some((p) => p.by === 'self');
  const hasAnyClaim = claimCount > 0;
  // "Sold out" treatment (strikethrough price, faded stores, hidden claim
  // button) only fires when the item is fully claimed. Partial multi-claim
  // and unlimited items still accept buyers, so stores + claim button stay
  // live and price stays unstruck.
  const showPurchased = isFullyClaimed && !isOwner;
  // The owner-side claim pill. Keyed on the resolved tier rather than on a
  // spoiler parameter: never below `claims`, and from `claims` upward whenever
  // claims exist (`item-store-links`).
  const showSpoilerInfo = showsSpoilerBanner(isOwner, tier, hasAnyClaim);
  const showBuyClaim =
    !!actor &&
    !isOwner &&
    !isFullyClaimed &&
    !hasViewerClaim &&
    storeComplete(item.store);

  const modalView = resolveModalView({
    isOwner,
    purchaseView: searchParams?.get('purchaseView'),
    hasViewerClaim,
  });

  const claimSummary = useMemo(
    () => claimSummaryOf(localPurchases, tier),
    [localPurchases, tier]
  );

  // Per activation, never persisted: it presents again on the next item, alters
  // nothing behind it, and changes the resolved tier for nothing else. A
  // viewer at `claims` or `identity` is never asked — the modal would disclose
  // nothing they are not already shown.
  const [pendingReveal, setPendingReveal] = useState<'manage' | 'claim' | null>(
    null
  );
  const needsReveal = !atLeast(tier, 'claims');

  const handleModalOpen = (view?: 'claim') => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('purchaseItem', item.id || '');
    if (view === 'claim') params.set('purchaseView', 'claim');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleModalClose = async () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('purchaseItem');
    params.delete('purchaseView');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePurchaseClick = () => {
    /* v8 ignore next -- defensive: item.id is always present for a persisted item. */
    if (!item.id) return;
    /* v8 ignore next -- defensive: the claim affordance is disabled when fully claimed without a personal claim, so this early-return is unreachable from the UI. */
    if (!isOwner && isFullyClaimed && !hasViewerClaim) return;
    if (needsReveal) return setPendingReveal('manage');
    handleModalOpen();
  };

  const handleAddClaimClick = () => {
    /* v8 ignore next -- defensive: item.id is always present for a persisted item. */
    if (!item.id) return;
    if (needsReveal) return setPendingReveal('claim');
    handleModalOpen('claim');
  };

  // One home for claim removal: dispatch, toast copy, and local-state filter.
  const removeClaim = async (claim: PurchaseView) => {
    try {
      const result = await toast.promise(
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
      if (result?.success) {
        setLocalPurchases((prev) => prev.filter((p) => p.id !== claim.id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to remove purchase:', error);
      return false;
    }
  };

  const handleManageRemove = async (claim: PurchaseView) => {
    const wasLast = viewerClaims.length <= 1;
    const removed = await removeClaim(claim);
    if (removed && wasLast) handleModalClose();
  };

  const recordClaim = async (
    payload: {
      item_id: string;
      guest_name: string | null;
      purchased_by?: string;
    },
    optimistic: Omit<PurchaseView, 'id'>,
    onSettled: (succeeded: boolean, claim?: PurchaseView) => void = handleModalClose
  ) => {
    try {
      const result = await toast.promise(createPurchase(payload), {
        loading: 'Adding claim',
        success: 'Claim added successfully',
        error: (err: Error) => err?.message || 'Failed to add claim',
      });
      const id = result?.success ? result.id : undefined;
      if (id) {
        setLocalPurchases((prev) =>
          prev.some((p) => p.id === id) ? prev : [...prev, { ...optimistic, id }]
        );
      } else if (!result?.success && result?.message) {
        toast.error(result.message);
      }
      onSettled(!!id, id ? { ...optimistic, id } : undefined);
    } catch (error) {
      console.error('Failed to create purchase:', error);
    }
  };

  const recordSelfClaim = (
    onSettled?: (succeeded: boolean, claim?: PurchaseView) => void
  ) =>
    recordClaim(
      { item_id: item.id || '', guest_name: null },
      {
        by: 'self',
        firstName: firstToken(user_name || 'You'),
        claimedByViewer: true,
        purchasedAt: new Date(),
      },
      onSettled
    );

  const handleSelfClaim = () => recordSelfClaim();

  const handleBuyClaim = () =>
    recordSelfClaim((succeeded, claim) => {
      if (succeeded && claim) setUndoClaim(claim);
    });

  const handleAttributedClaim = (target: AttributedTarget) =>
    recordClaim(
      { item_id: item.id || '', guest_name: null, purchased_by: target.id },
      {
        by: target.id === actor?.id ? 'self' : 'other',
        firstName: firstToken(target.name || 'Someone'),
        claimedByViewer: true,
        purchasedAt: new Date(),
      }
    );

  const handleGuestClaim = (name: string) =>
    recordClaim(
      { item_id: item.id || '', guest_name: name },
      {
        // Signed-out guest: the cookie written by the action makes this the
        // viewer's own claim, matching the server overlay's by:'self' marking.
        by: actor ? 'other' : 'self',
        firstName: firstToken(name),
        claimedByViewer: true,
        purchasedAt: new Date(),
      }
    );

  // Below `claims` the projection withheld other parties' claims, so a counter
  // computed from the payload would state a false zero rather than hide.
  const showCounter = quantityLimit !== 1 && atLeast(tier, 'claims');
  const counterText =
    quantityLimit == null
      ? `${claimCount}/∞ claimed`
      : `${claimCount}/${quantityLimit} claimed`;

  return (
    <>
      <div
        className={containerClasses({
          className,
          isOwner,
          purchased: showPurchased || showSpoilerInfo,
          hasMyClaim: hasViewerClaim,
          preview,
        })}
      >
        <ItemCard
          item={item}
          className={className}
          isOwner={isOwner}
          showPurchased={showPurchased}
          showSpoilerInfo={showSpoilerInfo}
          // The owner is included: a claim the viewer holds is disclosed at
          // every level, so it must reach the action matrix on their own list.
          viewerClaimed={hasViewerClaim}
          guestViewer={!actor}
          fullyClaimed={isFullyClaimed}
          showCounter={showCounter}
          counterText={counterText}
          hasAnyClaim={hasAnyClaim}
          tier={tier}
          showBuyClaim={showBuyClaim}
          viewOnly={preview}
          onPurchaseClick={preview ? undefined : handlePurchaseClick}
          onAddClaimClick={preview ? undefined : handleAddClaimClick}
          onBuyClaimClick={preview ? undefined : handleBuyClaim}
        />

        <ClaimBanners
          showPurchased={showPurchased}
          myClaims={viewerClaims}
          isOwner={isOwner}
          tier={tier}
          claims={localPurchases}
          claimSummary={claimSummary}
          counterText={counterText}
        />

        {isOwner && (
          <OwnerActions
            itemId={item.id}
            showArchiveAction={showArchiveAction}
            archivedView={archivedView}
            listId={listId}
            pathname={pathname}
            searchParams={searchParams}
            onArchived={() => router.refresh()}
          />
        )}
      </div>

      {!preview && showModal && (
        <PurchaseModalSlot
          view={modalView}
          claims={localPurchases}
          viewerIsPurchaser={viewerIsPurchaser}
          actor={actor}
          isOwner={isOwner}
          tier={tier}
          item={item}
          onClose={handleModalClose}
          onSelfClaim={handleSelfClaim}
          onAttributedClaim={handleAttributedClaim}
          onGuestClaim={handleGuestClaim}
          onRemoveClaim={isOwner ? removeClaim : handleManageRemove}
        />
      )}

      {!preview && pendingReveal && (
        <ConfirmDialog
          isOpen
          onClose={() => setPendingReveal(null)}
          onConfirm={() =>
            handleModalOpen(pendingReveal === 'claim' ? 'claim' : undefined)
          }
          title="This could spoil a surprise"
          message="You'll see whether this item is already claimed — no names, just the count."
          confirmText="Show me"
        />
      )}

      {!preview && undoClaim && (
        <ClaimUndoPopup
          isOpen
          onClose={() => setUndoClaim(null)}
          onUndo={() => removeClaim(undoClaim)}
        />
      )}
    </>
  );
}
