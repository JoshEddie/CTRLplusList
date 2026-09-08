'use client';

import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { ProfileMembershipView, ItemDisplay, SpoilerTier } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import '../styles/item.css';
import ClaimBanners from './ClaimBanners';
import ClaimUndoPopup from './ClaimUndoPopup';
import EntryStepper from './EntryStepper';
import ItemCard from './ItemCard';
import OwnerActions, { type ListEnds } from './OwnerActions';
import PurchaseModalSlot from './PurchaseModalSlot';
import { useItemClaims } from './useItemClaims';
import { useListEntry } from './useListEntry';
import { claimUnitsCeiling, containerClasses, resolveModalView } from './utils';

export default function Item({
  item,
  className,
  actor,
  user_name,
  tier = 'claims',
  showArchiveAction,
  archivedView,
  listEnds,
  onEntryPresence,
  claimless,
  preview,
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
  /** The ends of the list's own order, for the owner's move rows. Absent off the list surface and while another sort overrides that order. */
  listEnds?: ListEnds;
  /** Reports the card on or off the list as its quantity crosses 0, so the surface can keep those ends naming entries that still exist. */
  onEntryPresence?: (itemId: string, onList: boolean) => void;
  /** The surface names a list for entry writes but resolves no claims against it — the owner's library browser, where a card's quantity is the ask on one list and its claims span every one. */
  claimless?: boolean;
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

  // The owner's two routes resolve to the same modal view, so the affordance
  // that opened it is the parameter itself.
  const claimRoute = searchParams?.get('purchaseView') === 'claim';

  const isOwner = actor?.id === item.profile_id;

  // The entry's own controls, live on the list's own surface. `list_id` is what
  // names one: an item read through the library carries none, so its card
  // offers nothing that would edit a list it does not name.
  const entry = useListEntry(
    item.list_id ?? '',
    item.id,
    item.quantity ?? 0,
    onEntryPresence
  );
  const ownsEntry = isOwner && !!item.list_id && !preview;

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

  // Withdrawing the quantity withdraws the entry the hook keys every claim
  // reading on — the same discriminator the item library resolves to when a
  // card was read through no entry at all.
  const claimItem = useMemo(
    () => (claimless ? { ...item, quantity: undefined } : item),
    [claimless, item]
  );

  const claim = useItemClaims({
    item: claimItem,
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
          purchased: claim.isFullyClaimed,
          hasMyClaim: claim.hasViewerClaim,
          preview,
        })}
      >
        <ItemCard
          item={item}
          className={className}
          isOwner={isOwner}
          // The owner is included: a claim the viewer holds is disclosed at
          // every level, so it must reach the action matrix on their own list.
          viewerClaimed={claim.hasViewerClaim}
          guestViewer={!actor}
          fullyClaimed={claim.isFullyClaimed}
          hasAnyClaim={claim.hasAnyClaim}
          claimable={claim.claimable}
          tier={tier}
          showBuyClaim={claim.showBuyClaim}
          viewOnly={preview}
          onPurchaseClick={preview ? undefined : handlePurchaseClick}
          onAddClaimClick={preview ? undefined : handleAddClaimClick}
          onBuyClaimClick={preview ? undefined : claim.handleBuyClaim}
        />

        {claim.banner && !(ownsEntry && claim.banner.withheld) && (
          <ClaimBanners {...claim.banner} />
        )}

        {ownsEntry && (
          <EntryStepper
            name={item.name}
            quantity={entry.quantity}
            onChange={entry.setQuantity}
          />
        )}

        {isOwner && (
          <OwnerActions
            itemId={item.id}
            showArchiveAction={showArchiveAction}
            archivedView={archivedView}
            pathname={pathname}
            searchParams={searchParams}
            onChanged={() => router.refresh()}
            entry={
              ownsEntry && entry.quantity > 0
                ? { ends: listEnds, move: entry.moveTo, remove: entry.remove }
                : undefined
            }
          />
        )}
      </div>

      {!preview && !claimless && showModal && (
        <PurchaseModalSlot
          view={modalView}
          claims={(!claimRoute && claim.revealedClaims) || claim.claims}
          capacity={claim.capacity}
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
          onUpdateUnits={claim.updateClaimUnits}
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
          maxUnits={claimUnitsCeiling(claim.capacity, undoClaim)}
          onClose={claim.dismissUndo}
          onUndo={() => claim.removeClaim(undoClaim)}
          onUpdateUnits={(units) => claim.updateClaimUnits(undoClaim, units)}
        />
      )}
    </>
  );
}
