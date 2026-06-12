'use client';

import { createPurchase, removePurchase } from '@/lib/data/purchase.actions';
import { ItemDisplay, PurchaseView } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import '../styles/item.css';
import ClaimBanners from './ClaimBanners';
import ItemCard from './ItemCard';
import OwnerActions from './OwnerActions';
import PurchaseModalSlot from './PurchaseModalSlot';
import { AttributedTarget } from './purchasemodal/PurchaseFlowContainer';
import { firstToken } from './utils';

export default function Item({
  item,
  className,
  user_id,
  user_name,
  showSpoilers,
  showArchiveAction,
  archivedView,
  preview,
}: {
  item: ItemDisplay;
  className?: string;
  user_id?: string;
  user_name?: string | null;
  /** Owner's spoiler view is enabled — gates the owner claim/unclaim affordances. */
  showSpoilers?: boolean;
  showArchiveAction?: boolean;
  archivedView?: boolean;
  /** Render as a live preview inside the item form: no modal, no interactions. */
  preview?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const showModal = useMemo(
    () => searchParams?.get('purchaseItem') === item.id,
    [searchParams, item.id]
  );

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

  const isOwner = user_id === item.user_id;
  const quantityLimit = item.quantity_limit;
  const claimCount = localPurchases.length;
  const isFullyClaimed =
    quantityLimit !== null &&
    quantityLimit !== undefined &&
    claimCount >= quantityLimit;

  // A claim this viewer can remove: their own (purchaser) or one they
  // asserted for someone else (claimed_by).
  const removableClaim = useMemo(
    () =>
      localPurchases.find((p) => p.by === 'self' || p.claimedByViewer) ?? null,
    [localPurchases]
  );
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

  const claimSummary = useMemo(() => {
    if (!hasAnyClaim) return '';
    return localPurchases
      .map((p) => (p.by === 'self' ? 'You' : p.firstName))
      .join(', ');
  }, [localPurchases, hasAnyClaim]);

  const handleModalOpen = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('purchaseItem', item.id || '');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleModalClose = async () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('purchaseItem');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePurchaseClick = () => {
    /* v8 ignore next -- defensive: item.id is always present for a persisted item. */
    if (!item.id) return;
    /* v8 ignore next -- defensive: the claim affordance is disabled when fully claimed without a personal claim, so this early-return is unreachable from the UI. */
    if (!isOwner && isFullyClaimed && !removableClaim) return;
    handleModalOpen();
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
      }
    } catch (error) {
      console.error('Failed to remove purchase:', error);
    }
  };

  const handleUndoConfirm = async () => {
    /* v8 ignore next -- defensive: the modal only renders the undo flow when a removable claim exists. */
    if (!removableClaim) return;
    await removeClaim(removableClaim);
    handleModalClose();
  };

  const recordClaim = async (
    payload: {
      item_id: string;
      guest_name: string | null;
      purchased_by?: string;
    },
    optimistic: Omit<PurchaseView, 'id'>
  ) => {
    try {
      const result = await toast.promise(createPurchase(payload), {
        loading: 'Adding claim',
        success: 'Claim added successfully',
        error: (err: Error) => err?.message || 'Failed to add claim',
      });
      if (result?.success && result.id) {
        const id = result.id;
        setLocalPurchases((prev) =>
          prev.some((p) => p.id === id) ? prev : [...prev, { ...optimistic, id }]
        );
      } else if (!result?.success && result?.message) {
        toast.error(result.message);
      }
      handleModalClose();
    } catch (error) {
      console.error('Failed to create purchase:', error);
    }
  };

  const handleSelfClaim = () =>
    recordClaim(
      { item_id: item.id || '', guest_name: null },
      {
        by: 'self',
        firstName: firstToken(user_name || 'You'),
        claimedByViewer: true,
      }
    );

  const handleAttributedClaim = (target: AttributedTarget) =>
    recordClaim(
      { item_id: item.id || '', guest_name: null, purchased_by: target.id },
      {
        by: target.id === user_id ? 'self' : 'other',
        firstName: firstToken(target.name || 'Someone'),
        claimedByViewer: true,
      }
    );

  const handleGuestClaim = (name: string) =>
    recordClaim(
      { item_id: item.id || '', guest_name: name },
      {
        by: 'other',
        firstName: firstToken(name),
        claimedByViewer: !!user_id,
      }
    );

  const claimActionDisabled = isFullyClaimed && !removableClaim;
  const showCounter = quantityLimit !== 1;
  const counterText =
    quantityLimit == null
      ? `${claimCount}/∞ claimed`
      : `${claimCount}/${quantityLimit} claimed`;

  return (
    <>
      <div
        className={`item-container ${className || ''} ${isOwner ? 'owner' : ''} ${showPurchased || showSpoilerInfo ? 'purchased' : ''} ${removableClaim ? 'has-my-claim' : ''} ${preview ? 'preview' : ''}`}
      >
        <ItemCard
          item={item}
          className={className}
          isOwner={isOwner}
          showPurchased={showPurchased}
          showSpoilerInfo={showSpoilerInfo}
          removableClaim={removableClaim}
          claimActionDisabled={claimActionDisabled}
          showCounter={showCounter}
          counterText={counterText}
          showOwnerClaimAction={showOwnerClaimAction}
          showOwnerManageAction={showOwnerManageAction}
          onPurchaseClick={handlePurchaseClick}
        />

        <ClaimBanners
          showPurchased={showPurchased}
          myClaim={removableClaim}
          isOwner={isOwner}
          showSpoilerInfo={showSpoilerInfo}
          claims={localPurchases}
          claimSummary={claimSummary}
          counterText={counterText}
        />

        {isOwner && (
          <OwnerActions
            itemId={item.id}
            user_id={user_id}
            showArchiveAction={showArchiveAction}
            archivedView={archivedView}
            pathname={pathname}
            searchParams={searchParams}
            onArchived={() => router.refresh()}
          />
        )}
      </div>

      {!preview && showModal && (
        <PurchaseModalSlot
          // The owner's unclaim affordance is the per-claim spoiler-banner row
          // (master unclaim), so their modal always opens on the claim flow.
          removableClaim={isOwner ? null : removableClaim}
          user_id={user_id}
          isOwner={isOwner}
          showSpoilers={!!showSpoilers}
          ownerCanClaim={showOwnerClaimAction}
          ownerClaims={isOwner && showSpoilers ? localPurchases : []}
          item={item}
          onClose={handleModalClose}
          onSelfClaim={handleSelfClaim}
          onAttributedClaim={handleAttributedClaim}
          onGuestClaim={handleGuestClaim}
          onRemoveClaim={removeClaim}
          onUndoConfirm={handleUndoConfirm}
        />
      )}
    </>
  );
}
