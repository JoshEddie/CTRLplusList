'use client';

import { MdCheckBox, MdCheckBoxOutlineBlank, MdLock } from 'react-icons/md';
import '../styles/purchase.css';

type PurchaseProps = {
  purchasedBy: string | undefined;
  handlePurchaseClick: () => void;
  className?: string;
  disabled?: boolean;
  fullyClaimedLabel?: string;
};

export default function Purchase({
  purchasedBy,
  handlePurchaseClick,
  className,
  disabled,
  fullyClaimedLabel,
}: PurchaseProps) {
  const onClick = disabled ? undefined : handlePurchaseClick;

  return (
    <button
      type="button"
      className={`btn purchase ${purchasedBy ? 'purchased' : ''} ${
        disabled ? 'disabled' : ''
      } ${className || ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={
        disabled
          ? fullyClaimedLabel || 'Fully claimed'
          : purchasedBy
            ? `Claimed: ${purchasedBy}`
            : 'Claim this item'
      }
    >
      {disabled ? (
        <MdLock size={30} className="check-icon" />
      ) : purchasedBy ? (
        <MdCheckBox size={30} className="check-icon" />
      ) : (
        <MdCheckBoxOutlineBlank size={30} className="check-icon" />
      )}
      {disabled ? (
        <div className="purchased-by-container">
          <div>{fullyClaimedLabel || 'Fully claimed'}</div>
        </div>
      ) : purchasedBy ? (
        <div className="purchased-by-container">
          <div>Claimed:</div>
          <div className="purchased-by">{purchasedBy}</div>
        </div>
      ) : (
        'Claim'
      )}
    </button>
  );
}
