import {
  EntryCapacity,
  ProfileMembershipView,
  ItemDisplay,
  PurchaseView,
  SpoilerTier,
} from '@/lib/types';
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
  /** Every sanitized claim on the item — the manage view lists them all, removal gated per row. */
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
    return (
      <Modal onClose={onClose}>
        <div className="claim-modal">
          <PurchaseModalHeader item={item} />
          <ModalStoreRow store={item.store} />
          {/* The viewer's own claims and the ones they asserted — removing
              either compares the self-profile and takes no floor. */}
          <ClaimsList
            claims={claims}
            canRemove={(claim) => claim.by === 'self' || claim.claimedByViewer}
            capacity={capacity}
            onRemoveClaim={onRemoveClaim}
            onUpdateUnits={onUpdateUnits}
          />
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
