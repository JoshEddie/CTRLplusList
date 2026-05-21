'use client';

import { archiveItem, createPurchase, removePurchase } from '@/app/actions/items';
import { Button } from '@/app/ui/components/button';
import { Menu, MenuItem, MenuLinkItem } from '@/app/ui/components/menu';
import { ItemDisplay, PurchaseView } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdArchive,
  MdModeEdit,
  MdMoreHoriz,
  MdUnarchive,
} from 'react-icons/md';
import '../styles/item.css';
import EditItemButton from './EditItemButton';
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
      ? `${claimCount}/∞ claimed`
      : `${claimCount}/${quantityLimit} claimed`;

  const kebabRef = useRef<HTMLButtonElement>(null);
  const [kebabOpen, setKebabOpen] = useState(false);

  return (
    <>
      <div
        className={`item-container ${className || ''} ${isOwner ? 'owner' : ''} ${showPurchased || showSpoilerInfo ? 'purchased' : ''} ${myClaim ? 'has-my-claim' : ''} ${preview ? 'preview' : ''}`}
      >
        <div
          className={`item ${className || ''} ${showPurchased || showSpoilerInfo ? 'purchased' : ''}`}
          title={item.name || ''}
        >
          <ItemPhoto name={item.name || ''} url={item.image_url || ''} />
          <div className="item-info">
            <div className="item-name-description">
              <h1 className="itemName">{item.name || ''}</h1>
              {item.description ? (
                <p className="itemDescription">{item.description}</p>
              ) : null}
            </div>
            <StoreLinks
              item={item}
              showStores={!showPurchased && !showSpoilerInfo}
            >
              {!isOwner && (
                <Purchase
                  purchasedBy={
                    showPurchased ? (myClaim ? 'You' : claimSummary) : undefined
                  }
                  handlePurchaseClick={handlePurchaseClick}
                  className={showPurchased ? 'purchased' : ''}
                  disabled={claimActionDisabled}
                  fullyClaimedLabel={
                    claimActionDisabled ? 'Fully claimed' : undefined
                  }
                />
              )}
            </StoreLinks>
            {showCounter && !isOwner && !showPurchased && (
              <div className="claim-counter">{counterText}</div>
            )}
          </div>
        </div>

        {showPurchased && !myClaim && (
          <div className="purchased-banner" role="status">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Claimed by {claimSummary}
          </div>
        )}
        {!isOwner && myClaim && (
          <div
            className="purchased-banner purchased-banner--mine"
            role="status"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            You claimed this
            <button
              type="button"
              className="purchased-banner-undo"
              onClick={handlePurchaseClick}
              aria-label="Remove your claim"
            >
              Undo
            </button>
          </div>
        )}
        {showSpoilerInfo && (
          <div
            className="purchased-banner purchased-banner--spoiler"
            role="status"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>
              <strong>Spoilers:</strong> {counterText}
              {claimSummary && ` — ${claimSummary}`}
            </span>
          </div>
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
            {user_id && <EditItemButton itemId={item.id} user_id={user_id} />}
          </div>
        )}
        {isOwner && (
          <div className="item-owner-actions-mobile">
            <Button
              ref={kebabRef}
              variant="ghost"
              size="sm"
              className="item-owner-actions-kebab"
              aria-haspopup="menu"
              aria-expanded={kebabOpen}
              aria-label="Item actions"
              onClick={() => setKebabOpen((o) => !o)}
            >
              <MdMoreHoriz />
            </Button>
            <Menu
              open={kebabOpen}
              onClose={() => setKebabOpen(false)}
              anchorRef={kebabRef}
              aria-label="Item actions"
            >
              <MenuLinkItem
                href={`/items/${item.id}?returnTo=${encodeURIComponent(
                  pathname +
                    (searchParams?.toString()
                      ? `?${searchParams.toString()}`
                      : '')
                )}`}
                icon={<MdModeEdit size={18} />}
                onClick={() => setKebabOpen(false)}
              >
                Edit
              </MenuLinkItem>
              {showArchiveAction && (
                <MenuItem
                  icon={
                    archivedView ? (
                      <MdUnarchive size={18} />
                    ) : (
                      <MdArchive size={18} />
                    )
                  }
                  onClick={async () => {
                    setKebabOpen(false);
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
                >
                  {archivedView ? 'Unarchive' : 'Archive'}
                </MenuItem>
              )}
            </Menu>
          </div>
        )}
      </div>

      {!preview && showModal && (
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
