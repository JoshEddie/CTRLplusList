'use client';

import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { useState } from 'react';
import Modal from './purchasemodal/Modal';
import UnitsField from './purchasemodal/UnitsField';
import '../styles/purchase.css';

export default function ClaimUndoPopup({
  isOpen,
  maxUnits,
  onClose,
  onUndo,
  onUpdateUnits,
}: {
  isOpen: boolean;
  /** What this claim could be raised to — the one unit it holds plus whatever the entry has spare. One means there is nothing to raise. */
  maxUnits: number;
  onClose: () => void;
  onUndo: () => void;
  onUpdateUnits: (units: number) => void;
}) {
  const [unitsValue, setUnitsValue] = useState(1);
  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <div className="claim-undo">
        <h3 className="claim-undo-title">You&apos;ve claimed this</h3>
        <p className="claim-undo-message">
          Did you purchase it? If not — wrong price, sold out, changed your
          mind — undo to make it available for someone else.
        </p>
        {/* Buy & Claim records one unit to keep the fast path fast. Somebody
            who bought several corrects the record here, in one step, rather
            than unclaiming and starting over. */}
        {maxUnits > 1 && (
          <UnitsField
            label={getMessage('claim_units_bought_label')}
            value={unitsValue}
            max={maxUnits}
            saved={1}
            onChange={setUnitsValue}
            onSubmit={(units) => {
              onUpdateUnits(units);
              onClose();
            }}
          />
        )}
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
