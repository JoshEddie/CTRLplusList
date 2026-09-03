'use client';

import { Button, LinkButton } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
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
  /** A list entry exists to claim against and still takes new claims. False on the item library, which spans every list and so names none, and on a soft-removed entry, which the owner has dropped. */
  acceptsClaims: boolean;
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
  acceptsClaims,
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
  const ownerCanAdd = revealed ? !fullyClaimed && !hasAnyClaim : !viewerClaimed;
  const nonOwnerCanAdd = !claimedGuest && (!revealed || !fullyClaimed);
  // No entry, no claim: a claim is made against an item's presence on a list,
  // so a surface that names no list offers no way to create one, and neither
  // does an entry the owner has removed. Managing a claim that already exists
  // is unaffected — removal is row-based.
  const showAdd =
    !viewOnly && acceptsClaims && (isOwner ? ownerCanAdd : nonOwnerCanAdd);
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
          aria-label={getMessage('buy_claim_aria_label')}
          onClick={(e) => {
            e.stopPropagation();
            onBuyClaimClick?.();
          }}
        >
          <span>{getMessage('buy_claim_label')}</span>
          <MdOpenInNew aria-hidden />
        </LinkButton>
      )}
      {showManage && (
        <Button
          variant="primary"
          className="item-actions-claim"
          onClick={onPurchaseClick}
        >
          {getMessage(isOwner ? 'claim_manage_owner' : 'claim_manage_viewer')}
        </Button>
      )}
      {showStatus && (
        <div
          className="item-actions-status claimed-state claimed-state--fully"
          role="status"
        >
          <span className="claimed-state-label">
            <MdCheck aria-hidden />
            {getMessage('claim_fully_claimed')}
          </span>
        </div>
      )}
      {showAdd && (
        <Button
          variant="primary"
          className="item-actions-add"
          onClick={onAddClaimClick}
        >
          {getMessage('claim_add_label')}
        </Button>
      )}
      {showView && (
        <LinkButton
          variant={viewIsOnlyAction ? 'primary' : 'secondary'}
          className="item-actions-view"
          href={store.link}
          target="_blank"
          rel="noreferrer"
          aria-label={getMessage('view_item_aria_label')}
          onClick={(e) => e.stopPropagation()}
        >
          <span>
            <span className="item-actions-view-label">
              {getMessage('view_item_label')}
            </span>
            <span className="item-actions-view-short">
              {getMessage('view_item_label_short')}
            </span>
          </span>
          <MdOpenInNew aria-hidden />
        </LinkButton>
      )}
    </div>
  );
}
