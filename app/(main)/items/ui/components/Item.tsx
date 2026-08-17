'use client';

import { createPurchase, removePurchase } from '@/lib/data/purchase.actions';
import { ItemDisplay, PurchaseView } from '@/lib/types';
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
import { containerClasses, firstToken, resolveModalView } from './utils';

export default function Item({
  item,
  className,
  profile_id,
  user_name,
  showSpoilers,
  showArchiveAction,
  archivedView,
  preview,
  listId,
}: {
  item: ItemDisplay;
  className?: string;
  profile_id?: string;
  user_name?: string | null;
  /** Owner's spoiler view is enabled — gates the owner claim/unclaim affordances. */
  showSpoilers?: boolean;
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
    .map((p) => `${p.id}:${p.firstName}:${p.by}:${p.claimedByViewer}`)
    .join('|');
  const [localPurchases, setLocalPurchases] =
    useState<PurchaseView[]>(propPurchases);
  const [prevPropKey, setPrevPropKey] = useState(propPurchasesKey);
  if (propPurchasesKey !== prevPropKey) {
    setPrevPropKey(propPurchasesKey);
    setLocalPurchases(propPurchases);
  }

  const isOwner = profile_id === item.profile_id;
  const quantityLimit = item.quantity_limit;
  const claimCount = localPurchases.length;
  const isFullyClaimed =
    quantityLimit !== null &&
    quantityLimit !== undefined &&
    claimCount >= quantityLimit;

  // Claims this viewer can remove: their own (purchaser) or ones they
  // asserted for someone else (claimed_by).
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
  // Owner only sees purchase state when spoilers are on (DAL returns empty otherwise)
  const showSpoilerInfo = hasAnyClaim && isOwner;
  const showOwnerClaimAction = isOwner && !!showSpoilers && !isFullyClaimed;
  // Owner claim management (master unclaim) lives in the purchase modal's
  // claims list; the card affordance is "Manage claims" once any claim exists.
  const showOwnerManageAction = isOwner && !!showSpoilers && hasAnyClaim;
  const showBuyClaim =
    !!profile_id &&
    !isOwner &&
    !isFullyClaimed &&
    !hasViewerClaim &&
    storeComplete(item.store);

  const modalView = resolveModalView({
    isOwner,
    purchaseView: searchParams?.get('purchaseView'),
    hasViewerClaim,
  });

  const claimSummary = useMemo(() => {
    if (!hasAnyClaim) return '';
    return localPurchases
      .map((p) => (p.by === 'self' ? 'You' : p.firstName))
      .join(', ');
  }, [localPurchases, hasAnyClaim]);

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
    handleModalOpen();
  };

  const handleAddClaimClick = () => {
    /* v8 ignore next -- defensive: item.id is always present for a persisted item. */
    if (!item.id) return;
    handleModalOpen('claim');
  };

  // One home for claim removal: dispatch, toast copy, and local-state filter.
  const removeClaim = async (claim: PurchaseView) => {
    try {
      const result = await toast.promise(
        removePurchase({ purchase_id: claim.id }),
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
        by: target.id === profile_id ? 'self' : 'other',
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
        by: profile_id ? 'other' : 'self',
        firstName: firstToken(name),
        claimedByViewer: true,
        purchasedAt: new Date(),
      }
    );

  const showCounter = quantityLimit !== 1;
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
          viewerClaimed={!isOwner && hasViewerClaim}
          guestViewer={!profile_id}
          fullyClaimed={isFullyClaimed}
          showCounter={showCounter}
          counterText={counterText}
          showOwnerClaimAction={showOwnerClaimAction}
          showOwnerManageAction={showOwnerManageAction}
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
          showSpoilerInfo={showSpoilerInfo}
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
          profile_id={profile_id}
          isOwner={isOwner}
          showSpoilers={!!showSpoilers}
          ownerCanClaim={showOwnerClaimAction}
          ownerClaims={isOwner && showSpoilers ? localPurchases : []}
          item={item}
          onClose={handleModalClose}
          onSelfClaim={handleSelfClaim}
          onAttributedClaim={handleAttributedClaim}
          onGuestClaim={handleGuestClaim}
          onRemoveClaim={isOwner ? removeClaim : handleManageRemove}
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
