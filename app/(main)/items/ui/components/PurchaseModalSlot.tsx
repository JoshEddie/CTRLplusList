import { PurchaseView } from '@/lib/types';
import { Dispatch, SetStateAction } from 'react';
import Modal from './purchasemodal/Modal';
import ModalButtons from './purchasemodal/ModalButtons';
import PurchaseFlow from './purchasemodal/PurchaseFlow';
import PurchaseFlowContainer from './purchasemodal/PurchaseFlowContainer';

export type PurchaseFlowState = 'initial' | 'self' | 'other' | 'guest';

export default function PurchaseModalSlot({
  myClaim,
  user_id,
  user_name,
  guestName,
  setGuestName,
  purchaseFlow,
  setPurchaseFlow,
  onClose,
  onPurchaseConfirm,
  onUndoConfirm,
}: {
  myClaim: PurchaseView | null;
  user_id?: string;
  user_name?: string | null;
  guestName: string;
  setGuestName: Dispatch<SetStateAction<string>>;
  purchaseFlow: PurchaseFlowState;
  setPurchaseFlow: Dispatch<SetStateAction<PurchaseFlowState>>;
  onClose: () => void;
  onPurchaseConfirm: (name: string, user_purchase?: boolean) => void;
  onUndoConfirm: () => void;
}) {
  if (myClaim) {
    return (
      <Modal onClose={onClose}>
        <PurchaseFlow primary_text="Remove your claim on this item?">
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
        guestName={guestName}
        setGuestName={setGuestName}
        handlePurchaseConfirm={onPurchaseConfirm}
        purchaseFlow={purchaseFlow}
        setPurchaseFlow={setPurchaseFlow}
        user_name={user_name}
      />
    </Modal>
  );
}
