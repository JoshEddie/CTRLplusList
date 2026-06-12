'use client';

import { Button } from '@/app/ui/components/button';
import { MdCheck } from 'react-icons/md';
import '../styles/purchase.css';

type PurchaseProps = {
  fullyClaimed?: boolean;
  viewerClaimed?: boolean;
  /** Owner's spoiler-gated claim entry — same modal, purchase-recording copy. */
  ownerClaim?: boolean;
  /** Owner's spoiler-gated claim management — the modal lists removable claims. */
  ownerManage?: boolean;
  handlePurchaseClick: () => void;
  className?: string;
};

export default function Purchase({
  fullyClaimed,
  viewerClaimed,
  ownerClaim,
  ownerManage,
  handlePurchaseClick,
  className,
}: PurchaseProps) {
  if (ownerManage) {
    return (
      <Button
        variant="primary"
        className={`manage-claim-btn ${className || ''}`}
        onClick={handlePurchaseClick}
        aria-label="Manage claims"
      >
        Manage claims
      </Button>
    );
  }

  if (viewerClaimed) {
    return (
      <Button
        variant="primary"
        className={`manage-claim-btn ${className || ''}`}
        onClick={handlePurchaseClick}
        aria-label="Manage your claim"
      >
        Manage your claim
      </Button>
    );
  }

  if (fullyClaimed) {
    return (
      <div
        className={`claimed-state claimed-state--fully ${className || ''}`}
        role="status"
      >
        <span className="claimed-state-label">
          <MdCheck aria-hidden />
          Fully claimed
        </span>
      </div>
    );
  }

  const label = ownerClaim ? 'Mark as claimed' : 'Get this gift';
  return (
    <Button
      variant="primary"
      className={`claim-cta-btn ${className || ''}`}
      onClick={handlePurchaseClick}
      aria-label={label}
    >
      {label}
    </Button>
  );
}
