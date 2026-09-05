'use client';

import { Button, LinkButton } from '@/app/ui/components/button';
import { atLeast } from '@/lib/spoilers';
import type { ItemStoreTable, SpoilerTier } from '@/lib/types';
import { MdCheck, MdOpenInNew } from 'react-icons/md';
import '../styles/purchase.css';

type ItemActionsProps = {
  isOwner: boolean;
  fullyClaimed: boolean;
  /** The viewer holds a removable claim (their own, or one they recorded). */
  viewerClaimed: boolean;
  /** Signed-out viewer — a claimed guest is never offered Add Claim (cannot attribute, no repeat self-claim). */
  guestViewer?: boolean;
  /** The item carries claims the viewer's resolved tier discloses. */
  hasAnyClaim: boolean;
  /** The viewer's resolved tier (`spoiler-visibility`). */
  tier: SpoilerTier;
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
  guestViewer,
  hasAnyClaim,
  tier,
  showBuyClaim,
  store,
  viewOnly,
  onPurchaseClick,
  onAddClaimClick,
  onBuyClaimClick,
}: ItemActionsProps) {
  // Below `claims` the action set may not vary with another party's claim:
  // `Fully claimed`, `Manage claims` and the absence of `Buy & Claim` each
  // state that an item carries claims, which is exactly what the tier
  // withholds. A claim the VIEWER holds is no surprise to them, so it still
  // reaches `Manage claim`.
  const revealed = atLeast(tier, 'claims');
  const claimedGuest = !!guestViewer && viewerClaimed;

  const showManage =
    !viewOnly && (viewerClaimed || (isOwner && revealed && hasAnyClaim));
  const showStatus =
    !viewOnly && revealed && !isOwner && fullyClaimed && !viewerClaimed;
  const ownerCanAdd = revealed
    ? !fullyClaimed && !hasAnyClaim
    : !viewerClaimed;
  const nonOwnerCanAdd = !claimedGuest && (!revealed || !fullyClaimed);
  const showAdd = !viewOnly && (isOwner ? ownerCanAdd : nonOwnerCanAdd);
  // Keyed on a navigable link, never mere store presence — a PRICED/linkless
  // item must keep its Add Claim-only action set (design D-Linkless-256).
  const showBuy = !viewOnly && revealed && !!showBuyClaim && !!store?.link;
  // Keyed on a navigable link, never mere store presence — a PRICED/linkless
  // store carries a price line but no View item link (item-actions spec).
  const showView = !!store?.link;
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
