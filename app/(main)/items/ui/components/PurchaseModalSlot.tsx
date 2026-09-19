import {
  EntryCapacity,
  ProfileMembershipView,
  ItemDisplay,
  PurchaseView,
  SpoilerTier,
} from '@/lib/types';
import { getMessage } from '@/lib/i18n/utils';
import { atLeast } from '@/lib/spoilers';
import { heldByViewer, othersClaimCount, unitsClaimedLabel } from './utils';
import ClaimsList from './purchasemodal/ClaimsList';
import Modal from './purchasemodal/Modal';
import ModalStoreRow from './purchasemodal/ModalStoreRow';
import PurchaseFlowContainer, {
  AttributedTarget,
} from './purchasemodal/PurchaseFlowContainer';
import PurchaseModalHeader from './purchasemodal/PurchaseModalHeader';

export default function PurchaseModalSlot({
  view,
  claims,
  capacity,
  viewerIsPurchaser,
  actor,
  isOwner,
  tier,
  item,
  onClose,
  onSelfClaim,
  onAttributedClaim,
  onGuestClaim,
  onRemoveClaim,
  onUpdateUnits,
}: {
  view: 'manage' | 'claim';
  /** Every sanitized claim on the item. The manage view lists the viewer's own and counts the rest; the claim flow hands them all to the owner's master list. */
  claims: PurchaseView[];
  /** Null off a list, where there is nothing to claim against. */
  capacity: EntryCapacity | null;
  viewerIsPurchaser: boolean;
  actor?: ProfileMembershipView;
  isOwner: boolean;
  tier: SpoilerTier;
  item: ItemDisplay;
  onClose: () => void;
  onSelfClaim: (units: number) => void;
  onAttributedClaim: (target: AttributedTarget, units: number) => void;
  onGuestClaim: (name: string, units: number) => void;
  onRemoveClaim: (claim: PurchaseView) => void;
  onUpdateUnits: (claim: PurchaseView, units: number) => void;
}) {
  if (view === 'manage') {
    // The rows this view manages are the viewer's own and the ones they
    // asserted — removing either compares the self-profile and takes no floor.
    const held = claims.filter(heldByViewer);
    // Below `claims` no other party is in the payload at all, so the line
    // below falls away on the zero rather than on a tier this view would
    // otherwise have to read.
    const others = othersClaimCount(claims);
    return (
      <Modal onClose={onClose}>
        <div className="claim-modal">
          <PurchaseModalHeader item={item} />
          <ModalStoreRow store={item.store} />
          <ClaimsList
            claims={held}
            canRemove={() => true}
            capacity={capacity}
            unitsStatus={
              capacity && atLeast(tier, 'claims')
                ? unitsClaimedLabel(capacity.quantity, capacity.remaining)
                : undefined
            }
            onRemoveClaim={onRemoveClaim}
            onUpdateUnits={onUpdateUnits}
          />
          {others > 0 && (
            <p className="claims-other-count" role="status">
              {getMessage('claim_other_claims', { count: others })}
            </p>
          )}
        </div>
      </Modal>
    );
  }
  return (
    <Modal onClose={onClose}>
      <PurchaseFlowContainer
        actor={actor}
        isOwner={isOwner}
        tier={tier}
        claims={claims}
        capacity={capacity}
        viewerIsPurchaser={viewerIsPurchaser}
        item={item}
        onSelfClaim={onSelfClaim}
        onAttributedClaim={onAttributedClaim}
        onGuestClaim={onGuestClaim}
        onRemoveClaim={onRemoveClaim}
        onUpdateUnits={onUpdateUnits}
      />
    </Modal>
  );
}
