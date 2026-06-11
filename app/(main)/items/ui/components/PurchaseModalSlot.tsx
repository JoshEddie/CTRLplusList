import { PurchaseView } from '@/lib/types';
import Modal from './purchasemodal/Modal';
import ModalButtons from './purchasemodal/ModalButtons';
import PurchaseFlow from './purchasemodal/PurchaseFlow';
import PurchaseFlowContainer, {
  AttributedTarget,
} from './purchasemodal/PurchaseFlowContainer';

export default function PurchaseModalSlot({
  removableClaim,
  user_id,
  isOwner,
  itemId,
  itemName,
  onClose,
  onSelfClaim,
  onAttributedClaim,
  onGuestClaim,
  onUndoConfirm,
}: {
  removableClaim: PurchaseView | null;
  user_id?: string;
  isOwner: boolean;
  itemId: string;
  itemName: string;
  onClose: () => void;
  onSelfClaim: () => void;
  onAttributedClaim: (target: AttributedTarget) => void;
  onGuestClaim: (name: string) => void;
  onUndoConfirm: () => void;
}) {
  if (removableClaim) {
    return (
      <Modal onClose={onClose}>
        <PurchaseFlow
          primary_text={
            removableClaim.by === 'self'
              ? 'Remove your claim on this item?'
              : `Remove your claim for ${removableClaim.firstName}?`
          }
        >
          <ModalButtons
            primary_button_text="Remove my claim"
            primary_button_onclick={onUndoConfirm}
          />
        </PurchaseFlow>
      </Modal>
    );
  }
  return (
    <Modal onClose={onClose}>
      <PurchaseFlowContainer
        user_id={user_id}
        isOwner={isOwner}
        itemId={itemId}
        itemName={itemName}
        onSelfClaim={onSelfClaim}
        onAttributedClaim={onAttributedClaim}
        onGuestClaim={onGuestClaim}
      />
    </Modal>
  );
}
