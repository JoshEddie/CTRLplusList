'use client';

import { MdCheck, MdLock } from 'react-icons/md';
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
  const isClaimed = !!purchasedBy;

  if (disabled) {
    return (
      <div
        className={`claimed-state claimed-state--fully ${className || ''}`}
        role="status"
      >
        <span className="claimed-state-label">
          <MdLock aria-hidden />
          {fullyClaimedLabel || 'Fully claimed'}
        </span>
      </div>
    );
  }

  if (isClaimed) {
    return (
      <div className={`claimed-state ${className || ''}`} role="status">
        <span className="claimed-state-label">
          <MdCheck aria-hidden />
          {purchasedBy === 'You' ? 'You claimed this' : `Claimed: ${purchasedBy}`}
        </span>
        <button
          type="button"
          className="claimed-state-undo"
          onClick={onClick}
          aria-label="Remove your claim"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`claim-cta-btn ${className || ''}`}
      onClick={onClick}
      aria-label="Claim this item"
    >
      Claim this gift
    </button>
  );
}
