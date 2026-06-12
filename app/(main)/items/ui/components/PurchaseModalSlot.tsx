import { Button } from '@/app/ui/components/button';
import { ItemDisplay, PurchaseView } from '@/lib/types';
import { MdCheck } from 'react-icons/md';
import Modal from './purchasemodal/Modal';
import ModalStoreRow from './purchasemodal/ModalStoreRow';
import PurchaseFlowContainer, {
  AttributedTarget,
} from './purchasemodal/PurchaseFlowContainer';
import PurchaseModalHeader from './purchasemodal/PurchaseModalHeader';

export default function PurchaseModalSlot({
  removableClaim,
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
  onUndoConfirm,
}: {
  removableClaim: PurchaseView | null;
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
  onUndoConfirm: () => void;
}) {
  if (removableClaim) {
    return (
      <Modal onClose={onClose}>
        <div className="claim-modal">
          <PurchaseModalHeader item={item} />
          <ModalStoreRow stores={item.stores} />
          <div className="claimed-banner" role="status">
            <MdCheck aria-hidden />
            {removableClaim.by === 'self'
              ? 'You claimed this'
              : `You claimed this for ${removableClaim.firstName}`}
          </div>
          <Button
            variant="danger"
            className="remove-claim-btn"
            onClick={onUndoConfirm}
          >
            Remove my claim
          </Button>
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
        item={item}
        onSelfClaim={onSelfClaim}
        onAttributedClaim={onAttributedClaim}
        onGuestClaim={onGuestClaim}
        onRemoveClaim={onRemoveClaim}
      />
    </Modal>
  );
}
