'use client';

import { Button } from '@/app/ui/components/button';
import Modal from './purchasemodal/Modal';
import '../styles/purchase.css';

export default function ClaimUndoPopup({
  isOpen,
  onClose,
  onUndo,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUndo: () => void;
}) {
  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <div className="claim-undo">
        <h3 className="claim-undo-title">You&apos;ve claimed this</h3>
        <p className="claim-undo-message">
          Did you purchase it? If not — wrong price, sold out, changed your
          mind — undo to make it available for someone else.
        </p>
        <div className="claim-undo-buttons">
          <Button
            variant="ghost"
            onClick={() => {
              onUndo();
              onClose();
            }}
          >
            No — undo claim
          </Button>
          <Button variant="primary" onClick={onClose}>
            Yes, I purchased it
          </Button>
        </div>
      </div>
    </Modal>
  );
}
