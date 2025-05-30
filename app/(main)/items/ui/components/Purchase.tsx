'use client';

import { MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';
import '../styles/purchase.css';

type PurchaseProps = {
  purchasedBy: string | undefined;
  handlePurchaseClick: () => void;
};

export default function Purchase({
  purchasedBy,
  handlePurchaseClick,
}: PurchaseProps) {
  return (
    <div className="purchase-container">
      <div
        className={`purchase-checkbox ${purchasedBy ? 'purchased' : ''}`}
        onClick={handlePurchaseClick}
      >
        {purchasedBy ? (
          <MdCheckBox className="check-icon" />
        ) : (
          <MdCheckBoxOutlineBlank className="check-icon" />
        )}
      </div>
      <span className="purchase-text">
        {purchasedBy ? `Purchased by ${purchasedBy}` : 'I Purchased This'}
      </span>
    </div>
  );
}
