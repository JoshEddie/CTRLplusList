import {
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
}: {
  view: 'manage' | 'claim';
  /** Every sanitized claim on the item — the manage view lists them all, removal gated per row. */
  claims: PurchaseView[];
  viewerIsPurchaser: boolean;
  actor?: ProfileMembershipView;
  isOwner: boolean;
  tier: SpoilerTier;
  item: ItemDisplay;
  onClose: () => void;
  onSelfClaim: () => void;
  onAttributedClaim: (target: AttributedTarget) => void;
  onGuestClaim: (name: string) => void;
  onRemoveClaim: (claim: PurchaseView) => void;
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
            tier={tier}
            onRemoveClaim={onRemoveClaim}
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
        viewerIsPurchaser={viewerIsPurchaser}
        item={item}
        onSelfClaim={onSelfClaim}
        onAttributedClaim={onAttributedClaim}
        onGuestClaim={onGuestClaim}
        onRemoveClaim={onRemoveClaim}
      />
    </Modal>
  );
}
