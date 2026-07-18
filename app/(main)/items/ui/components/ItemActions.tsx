'use client';

import { Button, LinkButton } from '@/app/ui/components/button';
import type { ItemStoreTable } from '@/lib/types';
import { MdCheck, MdOpenInNew } from 'react-icons/md';
import '../styles/purchase.css';

type ItemActionsProps = {
  isOwner: boolean;
  fullyClaimed: boolean;
  /** The viewer holds a removable claim (their own, or one they recorded). */
  viewerClaimed: boolean;
  /** Owner's spoiler-gated claim entry — same modal, purchase-recording copy. */
  showOwnerClaimAction: boolean;
  /** Owner's spoiler-gated claim management — the modal lists removable claims. */
  showOwnerManageAction: boolean;
  /** Authed non-owner Buy & Claim signal. */
  showBuyClaim?: boolean;
  /** The primary (lowest-priced complete) store, or null when none exists. */
  store: ItemStoreTable | null;
  /** Non-interactive preview surfaces: only the live View item link renders. */
  viewOnly?: boolean;
  onPurchaseClick?: () => void;
  /** Add Claim's own opener — routes the modal to the claim flow even when the viewer already holds a claim (claim-attribution's affordance-routed opening state). */
  onAddClaimClick?: () => void;
  onBuyClaimClick?: () => void;
};

// The single owner of the per-item action area (item-actions spec, design D1):
// the DOM decides which actions show — a flat, fixed-priority list of
// conditional children — and purchase.css decides their layout (full-width
// rows by default, the View · Add two-up pair via sibling detection).
export default function ItemActions({
  isOwner,
  fullyClaimed,
  viewerClaimed,
  showOwnerClaimAction,
  showOwnerManageAction,
  showBuyClaim,
  store,
  viewOnly,
  onPurchaseClick,
  onAddClaimClick,
  onBuyClaimClick,
}: ItemActionsProps) {
  const showManage =
    !viewOnly && (isOwner ? showOwnerManageAction : viewerClaimed);
  const showStatus = !viewOnly && !isOwner && fullyClaimed && !viewerClaimed;
  const showAdd =
    !viewOnly &&
    (isOwner ? showOwnerClaimAction && !showOwnerManageAction : !fullyClaimed);
  // Keyed on a navigable link, never mere store presence — a PRICED/linkless
  // item must keep its Add Claim-only action set (design D-Linkless-256).
  const showBuy = !viewOnly && !!showBuyClaim && !!store?.link;
  const showView = !!store;
  // When View item is the card's only action (owner spoilers off, view-only)
  // it is the primary intent — promote it from the subordinate secondary look.
  const viewIsOnlyAction = showView && !showManage && !showStatus && !showAdd;

  if (!showManage && !showStatus && !showAdd && !showView) return null;

  return (
    <div className="item-actions">
      {showBuy && (
        <LinkButton
          variant="primary"
          className="item-actions-buy"
          href={store.link}
          target="_blank"
          rel="noreferrer"
          aria-label="Buy & Claim — opens in new tab"
          onClick={(e) => {
            e.stopPropagation();
            onBuyClaimClick?.();
          }}
        >
          <span>Buy &amp; Claim</span>
          <MdOpenInNew aria-hidden />
        </LinkButton>
      )}
      {showManage && (
        <Button
          variant="primary"
          className="item-actions-claim"
          onClick={onPurchaseClick}
        >
          {isOwner ? 'Manage claims' : 'Manage claim'}
        </Button>
      )}
      {showStatus && (
        <div
          className="item-actions-status claimed-state claimed-state--fully"
          role="status"
        >
          <span className="claimed-state-label">
            <MdCheck aria-hidden />
            Fully claimed
          </span>
        </div>
      )}
      {showAdd && (
        <Button
          variant="primary"
          className="item-actions-add"
          onClick={onAddClaimClick}
        >
          Add Claim
        </Button>
      )}
      {showView && (
        <LinkButton
          variant={viewIsOnlyAction ? 'primary' : 'secondary'}
          className="item-actions-view"
          href={store.link}
          target="_blank"
          rel="noreferrer"
          aria-label="View item — opens in new tab"
          onClick={(e) => e.stopPropagation()}
        >
          <span>
            View <span className="item-actions-view-label">item</span>
          </span>
          <MdOpenInNew aria-hidden />
        </LinkButton>
      )}
    </div>
  );
}
