'use client';

import { MdCheckBox, MdCheckBoxOutlineBlank } from 'react-icons/md';
import '../styles/purchase.css';

type PurchaseProps = {
  purchasedBy: string | undefined;
  handlePurchaseClick: () => void;
  className?: string;
};

export default function Purchase({
  purchasedBy,
  handlePurchaseClick,
  className,
}: PurchaseProps) {
  return (
    <div
      className={`btn purchase ${purchasedBy ? 'purchased' : ''} ${className || ''}`}
      onClick={handlePurchaseClick}
    >
      {purchasedBy ? (
        <MdCheckBox size={30} className="check-icon" />
      ) : (
        <MdCheckBoxOutlineBlank size={30} className="check-icon" />
      )}
      {purchasedBy ? (
        <div className="purchased-by-container">
          <div>Purchased:</div>
          <div className="purchased-by">{purchasedBy}</div>
        </div>
      ) : (
        'Purchase'
      )}
    </div>
  );
}
