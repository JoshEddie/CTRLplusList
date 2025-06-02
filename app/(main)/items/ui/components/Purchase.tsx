'use client';

import { FaShoppingCart } from 'react-icons/fa';
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
        <FaShoppingCart size={20}/>
        {purchasedBy ? (
          <div className="purchased-by-container">
            <div>Purchased by:</div>
            <div className="purchased-by">{purchasedBy}</div>
          </div>
        ) : (
          'Mark as Purchased'
        )}
      </div>
  );
}
