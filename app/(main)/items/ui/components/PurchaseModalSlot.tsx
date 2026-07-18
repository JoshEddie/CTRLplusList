import { ItemDisplay, PurchaseView } from '@/lib/types';
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
  user_id,
  isOwner,
  showSpoilers,
  ownerCanClaim,
  ownerClaims,
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
  user_id?: string;
  isOwner: boolean;
  showSpoilers: boolean;
  ownerCanClaim: boolean;
  ownerClaims: PurchaseView[];
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
          <ModalStoreRow stores={item.stores} />
          <ClaimsList
            claims={claims}
            canRemove={(claim) => claim.by === 'self' || claim.claimedByViewer}
            onRemoveClaim={onRemoveClaim}
          />
        </div>
      </Modal>
    );
  }
  return (
    <Modal onClose={onClose}>
      <PurchaseFlowContainer
        user_id={user_id}
        isOwner={isOwner}
        showSpoilers={showSpoilers}
        ownerCanClaim={ownerCanClaim}
        ownerClaims={ownerClaims}
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
