'use client';

import { createPurchase, removePurchase } from '@/app/actions/items';
import { ItemDisplay, PurchaseView } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import '../styles/item.css';
import ClaimBanners from './ClaimBanners';
import ItemCard from './ItemCard';
import OwnerActions from './OwnerActions';
import PurchaseModalSlot, { PurchaseFlowState } from './PurchaseModalSlot';

function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0];
}

export default function Item({
  item,
  className,
  user_id,
  user_name,
  showArchiveAction,
  archivedView,
  preview,
}: {
  item: ItemDisplay;
  className?: string;
  user_id?: string;
  user_name?: string | null;
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
  const [purchaseFlow, setPurchaseFlow] =
    useState<PurchaseFlowState>('initial');

  const propPurchases = item.purchases ?? [];
  const propPurchasesKey = propPurchases
    .map((p) => `${p.id}:${p.firstName}:${p.by}`)
    .join('|');
  const [localPurchases, setLocalPurchases] =
    useState<PurchaseView[]>(propPurchases);
  const [prevPropKey, setPrevPropKey] = useState(propPurchasesKey);
  if (propPurchasesKey !== prevPropKey) {
    setPrevPropKey(propPurchasesKey);
    setLocalPurchases(propPurchases);
  }
  const [guestName, setGuestName] = useState('');

  const isOwner = user_id === item.user_id;
  const quantityLimit = item.quantity_limit;
  const claimCount = localPurchases.length;
  const isFullyClaimed =
    quantityLimit !== null &&
    quantityLimit !== undefined &&
    claimCount >= quantityLimit;

  const myClaim = useMemo(
    () => localPurchases.find((p) => p.by === 'self') ?? null,
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

  const claimSummary = useMemo(() => {
    if (!hasAnyClaim) return '';
    return localPurchases
      .map((p) => (p.by === 'self' ? 'You' : p.firstName))
      .join(', ');
  }, [localPurchases, hasAnyClaim]);

  const handleModalOpen = () => {
    setPurchaseFlow('initial');
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('purchaseItem', item.id || '');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleModalClose = async () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('purchaseItem');
    router.replace(`${pathname}?${params.toString()}`);
    setGuestName('');
  };

  const handlePurchaseClick = () => {
    /* v8 ignore next -- defensive: item.id is always present for a persisted item. */
    if (!item.id) return;
    /* v8 ignore next -- defensive: the claim affordance is disabled when fully claimed without a personal claim, so this early-return is unreachable from the UI. */
    if (isFullyClaimed && !myClaim) return;
    handleModalOpen();
  };

  const handleUndoConfirm = async () => {
    /* v8 ignore next -- defensive: item.id is always present for a persisted item. */
    if (!item.id) return;
    try {
      // Prefer purchase_id (works for both signed-in and guest paths and is
      // immune to display-name collisions). Fall back to the legacy
      // item_id-scoped shape, which the server only honors for signed-in
      // callers.
      const payload = myClaim
        ? { purchase_id: myClaim.id, guest_name: guestName || null }
        : { item_id: item.id, guest_name: guestName || null };
      const result = await toast.promise(removePurchase(payload), {
        loading: 'Removing purchased status',
        success: 'Purchased status removed successfully',
        error: 'Failed to remove purchased status',
      });
      if (result?.success && myClaim) {
        setLocalPurchases((prev) => prev.filter((p) => p.id !== myClaim.id));
      }
    } catch (error) {
      console.error('Failed to remove purchase:', error);
    }
    handleModalClose();
  };

  const handlePurchaseConfirm = async (
    name: string,
    user_purchase: boolean = false
  ) => {
    try {
      // user_purchase: signed-in self-claim — server resolves the actor from the
      // session, no name supplied. Otherwise supply guest_name: the unauth guest
      // path, or a signed-in caller marking a claim on behalf of a named other
      // person ("Someone else") — both record a named guest claim server-side.
      const payload =
        user_purchase && user_id
          ? { item_id: item.id || '', guest_name: null }
          : { item_id: item.id || '', guest_name: name };

      const result = await toast.promise(createPurchase(payload), {
        loading: 'Adding purchased status',
        success: 'Purchased status added successfully',
        error: (err: Error) => err?.message || 'Failed to add purchased status',
      });

      if (result?.success) {
        const optimistic: PurchaseView = {
          id: `optimistic-${Date.now()}`,
          by: user_purchase && user_id ? 'self' : 'other',
          firstName: firstToken(name),
        };
        setLocalPurchases((prev) => [...prev, optimistic]);
      } else if (result?.message) {
        toast.error(result.message);
      }
      handleModalClose();
    } catch (error) {
      console.error('Failed to create purchase:', error);
    }
  };

  const claimActionDisabled = isFullyClaimed && !myClaim;
  const showCounter = quantityLimit !== 1;
  const counterText =
    quantityLimit == null
      ? `${claimCount}/∞ claimed`
      : `${claimCount}/${quantityLimit} claimed`;

  return (
    <>
      <div
        className={`item-container ${className || ''} ${isOwner ? 'owner' : ''} ${showPurchased || showSpoilerInfo ? 'purchased' : ''} ${myClaim ? 'has-my-claim' : ''} ${preview ? 'preview' : ''}`}
      >
        <ItemCard
          item={item}
          className={className}
          isOwner={isOwner}
          showPurchased={showPurchased}
          showSpoilerInfo={showSpoilerInfo}
          myClaim={myClaim}
          claimSummary={claimSummary}
          claimActionDisabled={claimActionDisabled}
          showCounter={showCounter}
          counterText={counterText}
          onPurchaseClick={handlePurchaseClick}
        />

        <ClaimBanners
          showPurchased={showPurchased}
          myClaim={myClaim}
          isOwner={isOwner}
          showSpoilerInfo={showSpoilerInfo}
          claimSummary={claimSummary}
          counterText={counterText}
          onUndo={handlePurchaseClick}
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
          myClaim={myClaim}
          user_id={user_id}
          user_name={user_name}
          guestName={guestName}
          setGuestName={setGuestName}
          purchaseFlow={purchaseFlow}
          setPurchaseFlow={setPurchaseFlow}
          onClose={handleModalClose}
          onPurchaseConfirm={handlePurchaseConfirm}
          onUndoConfirm={handleUndoConfirm}
        />
      )}
    </>
  );
}
