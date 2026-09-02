'use client';

import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { ProfileMembershipView, ItemDisplay, SpoilerTier } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import '../styles/item.css';
import ClaimBanners from './ClaimBanners';
import ClaimUndoPopup from './ClaimUndoPopup';
import ItemCard from './ItemCard';
import OwnerActions from './OwnerActions';
import PurchaseModalSlot from './PurchaseModalSlot';
import { useItemClaims } from './useItemClaims';
import { containerClasses, resolveModalView } from './utils';

export default function Item({
  item,
  className,
  actor,
  user_name,
  tier = 'claims',
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

  // The owner's two routes resolve to the same modal view, so the affordance
  // that opened it is the parameter itself.
  const claimRoute = searchParams?.get('purchaseView') === 'claim';

  const isOwner = actor?.id === item.profile_id;

  const handleModalOpen = (view?: 'claim') => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('purchaseItem', item.id);
    if (view === 'claim') params.set('purchaseView', 'claim');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleModalClose = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('purchaseItem');
    params.delete('purchaseView');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const claim = useItemClaims({
    item,
    isOwner,
    tier,
    actor,
    userName: user_name,
    revealNames: showModal && !claimRoute,
    onSettled: handleModalClose,
  });

  const { undoClaim } = claim;

  const modalView = resolveModalView({
    isOwner,
    purchaseView: searchParams?.get('purchaseView'),
    hasViewerClaim: claim.hasViewerClaim,
  });

  // Per activation, never persisted: it presents again on the next item, alters
  // nothing behind it, and changes the resolved tier for nothing else.
  const [pendingReveal, setPendingReveal] = useState<'manage' | 'claim' | null>(
    null
  );

  const handlePurchaseClick = () => {
    /* v8 ignore next -- defensive: item.id is always present for a persisted item. */
    if (!item.id) return;
    /* v8 ignore next -- defensive: the claim affordance is disabled when fully claimed without a personal claim, so this early-return is unreachable from the UI. */
    if (!isOwner && claim.isFullyClaimed && !claim.hasViewerClaim) return;
    if (claim.countWithheld || claim.namesWithheld)
      return setPendingReveal('manage');
    handleModalOpen();
  };

  const handleAddClaimClick = () => {
    /* v8 ignore next -- defensive: item.id is always present for a persisted item. */
    if (!item.id) return;
    if (claim.countWithheld) return setPendingReveal('claim');
    handleModalOpen('claim');
  };

  return (
    <>
      <div
        className={containerClasses({
          className,
          isOwner,
          purchased: claim.showPurchased || claim.showSpoilerInfo,
          hasMyClaim: claim.hasViewerClaim,
          preview,
        })}
      >
        <ItemCard
          item={item}
          className={className}
          isOwner={isOwner}
          showPurchased={claim.showPurchased}
          showSpoilerInfo={claim.showSpoilerInfo}
          // The owner is included: a claim the viewer holds is disclosed at
          // every level, so it must reach the action matrix on their own list.
          viewerClaimed={claim.hasViewerClaim}
          guestViewer={!actor}
          fullyClaimed={claim.isFullyClaimed}
          showCounter={claim.showCounter}
          counterText={claim.counterText}
          hasAnyClaim={claim.hasAnyClaim}
          tier={tier}
          showBuyClaim={claim.showBuyClaim}
          viewOnly={preview}
          onPurchaseClick={preview ? undefined : handlePurchaseClick}
          onAddClaimClick={preview ? undefined : handleAddClaimClick}
          onBuyClaimClick={preview ? undefined : claim.handleBuyClaim}
        />

        <ClaimBanners
          showPurchased={claim.showPurchased}
          myClaims={claim.viewerClaims}
          isOwner={isOwner}
          tier={tier}
          claims={claim.claims}
          claimSummary={claim.claimSummary}
          counterText={claim.counterText}
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
          claims={(!claimRoute && claim.revealedClaims) || claim.claims}
          viewerIsPurchaser={claim.viewerIsPurchaser}
          actor={actor}
          isOwner={isOwner}
          tier={tier}
          item={item}
          onClose={handleModalClose}
          onSelfClaim={claim.handleSelfClaim}
          onAttributedClaim={claim.handleAttributedClaim}
          onGuestClaim={claim.handleGuestClaim}
          onRemoveClaim={isOwner ? claim.removeClaim : claim.handleManageRemove}
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
          message={
            claim.namesWithheld && pendingReveal === 'manage'
              ? "You'll see exactly who has claimed this item, by name."
              : "You'll see whether this item is already claimed — no names, just the count."
          }
          confirmText="Show me"
        />
      )}

      {!preview && undoClaim && (
        <ClaimUndoPopup
          isOpen
          onClose={claim.dismissUndo}
          onUndo={() => claim.removeClaim(undoClaim)}
        />
      )}
    </>
  );
}
