'use client';

import { archiveItem, createPurchase, removePurchase } from '@/app/actions/items';
import { ItemDisplay, PurchaseView } from '@/lib/types';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MdArchive, MdModeEdit, MdUnarchive } from 'react-icons/md';
import '../styles/item.css';
import ItemPhoto from './ItemPhoto';
import Purchase from './Purchase';
import Modal from './purchasemodal/Modal';
import ModalButtons from './purchasemodal/ModalButtons';
import PurchaseFlow from './purchasemodal/PurchaseFlow';
import PurchaseFlowContainer from './purchasemodal/PurchaseFlowContainer';
import StoreLinks from './StoreLinks';

function firstToken(name: string | null | undefined): string {
  if (!name) return 'Someone';
  const trimmed = name.trim();
  if (!trimmed) return 'Someone';
  return trimmed.split(/\s+/)[0];
}

export default function Item({
  item,
  className,
  user_id,
  user_name,
  showArchiveAction,
  archivedView,
}: {
  item: ItemDisplay;
  className?: string;
  user_id?: string;
  user_name?: string | null;
  showArchiveAction?: boolean;
  archivedView?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const showModal = useMemo(
    () => searchParams?.get('purchaseItem') === item.id,
    [searchParams, item.id]
  );
  const [purchaseFlow, setPurchaseFlow] = useState<
    'initial' | 'self' | 'other' | 'guest'
  >('initial');

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
  const showPurchased = hasAnyClaim && !isOwner;
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
    if (!item.id) return;
    if (isFullyClaimed && !myClaim) return;
    handleModalOpen();
  };

  const handleUndoConfirm = async () => {
    if (!item.id) return;
    try {
      const result = await toast.promise(
        removePurchase({
          item_id: item.id,
          guest_name: guestName || null,
        }),
        {
          loading: 'Removing purchased status',
          success: 'Purchased status removed successfully',
          error: 'Failed to remove purchased status',
        }
      );
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
      const payload =
        user_purchase && user_id
          ? { item_id: item.id || '', user_id, guest_name: null }
          : { item_id: item.id || '', user_id: null, guest_name: name };

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
      ? `${claimCount} claimed`
      : `${claimCount}/${quantityLimit} claimed`;

  return (
    <>
      <div
        className={`item-container ${className || ''} ${isOwner ? 'owner' : ''}`}
      >
        <div
          className={`item ${className || ''} ${showPurchased ? 'purchased' : ''}`}
          title={item.name || ''}
        >
          <ItemPhoto name={item.name || ''} url={item.image_url || ''} />
          <div className="item-info">
            <div className="item-name-description">
              <h1 className="itemName">{item.name || ''}</h1>
              <p className="itemDescription">{item.description || ''}</p>
            </div>
            <StoreLinks item={item} />
            {showCounter && !isOwner && (
              <div className="claim-counter">{counterText}</div>
            )}
            {showSpoilerInfo && (
              <div className="spoiler-info">
                <span className="spoiler-badge">Spoilers</span>
                <span>
                  {counterText}
                  {claimSummary && ` — ${claimSummary}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {!isOwner && (
          <Purchase
            purchasedBy={
              showPurchased ? (myClaim ? 'You' : claimSummary) : undefined
            }
            handlePurchaseClick={handlePurchaseClick}
            className={showPurchased ? 'purchased' : ''}
            disabled={claimActionDisabled}
            fullyClaimedLabel={claimActionDisabled ? 'Fully claimed' : undefined}
          />
        )}

        {isOwner && (
          <div className="item-owner-actions">
            {showArchiveAction && (
              <button
                type="button"
                className="archive-button"
                onClick={async () => {
                  const nextArchived = !archivedView;
                  const result = await toast.promise(
                    archiveItem(item.id, nextArchived),
                    {
                      loading: nextArchived ? 'Archiving' : 'Unarchiving',
                      success: nextArchived ? 'Archived' : 'Unarchived',
                      error: 'Failed',
                    }
                  );
                  if (result?.success) router.refresh();
                }}
                aria-label={archivedView ? 'Unarchive item' : 'Archive item'}
                title={archivedView ? 'Unarchive item' : 'Archive item'}
              >
                {archivedView ? <MdUnarchive /> : <MdArchive />}
              </button>
            )}
            <Link
              href={`/items/${item.id}?returnTo=${encodeURIComponent(
                pathname +
                  (searchParams?.toString()
                    ? `?${searchParams.toString()}`
                    : '')
              )}`}
              className="edit-button"
            >
              <MdModeEdit />
            </Link>
          </div>
        )}
      </div>

      {showModal && (
        <>
          {!myClaim ? (
            <Modal onClose={handleModalClose}>
              <PurchaseFlowContainer
                user_id={user_id}
                guestName={guestName}
                setGuestName={setGuestName}
                handlePurchaseConfirm={handlePurchaseConfirm}
                purchaseFlow={purchaseFlow}
                setPurchaseFlow={setPurchaseFlow}
                user_name={user_name}
              />
            </Modal>
          ) : (
            <Modal onClose={handleModalClose}>
              <PurchaseFlow primary_text="Remove your claim on this item?">
                <ModalButtons
                  primary_button_text="Remove my claim"
                  primary_button_onclick={() => handleUndoConfirm()}
                />
              </PurchaseFlow>
            </Modal>
          )}
        </>
      )}
    </>
  );
}
