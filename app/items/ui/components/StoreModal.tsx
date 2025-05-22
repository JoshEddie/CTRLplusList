'use client';

import { createPurchase } from '@/app/actions/items';
import { ItemDetails, ItemStoreTable } from '@/lib/types';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

interface StoreModalProps {
  store: ItemStoreTable | null;
  item: ItemDetails;
  onClose: () => void;
  onPurchase: () => void;
}

export default function StoreModal({
  store,
  item,
  onClose,
  onPurchase,
}: StoreModalProps) {
  const redirectTimer = useRef<number>(5);
  const timerRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (redirectTimer.current > 0) {
      timerRef.current = setInterval(() => {
        redirectTimer.current -= 1;
        if (redirectTimer.current <= 0) {
          const currentTimer = timerRef.current;
          if (currentTimer) {
            clearInterval(currentTimer);
          }
          window.open(`${store?.link}`, '_blank');
        }
      }, 1000);
    } else {
      window.open(`${store?.link}`, '_blank');
    }

    return () => {
      const currentTimer = timerRef.current;
      if (currentTimer) {
        clearInterval(currentTimer);
      }
    };
  }, [redirectTimer, store?.link]);

  const handleGoNow = () => {
    const newWindow = window.open(store?.link, '_blank');
    if (!newWindow) {
      toast.error(
        'Popup blocked! Please allow popups for this site or copy the link manually.'
      );
    }
  };

  const handlePurchase = async () => {
    if (!item.id || !item.user_id) return;

    const result = await createPurchase({
      item_id: Number(item.id),
      user_id: item.user_id,
    });

    if (result.success) {
      toast.success('Item marked as purchased!');
      onPurchase();
    } else {
      toast.error(result.error || 'Failed to mark item as purchased');
    }
  };

  return (
    <div className="modalBackdrop">
      <div
        className="storeModal"
        style={{
          transform: `translateY(${redirectTimer.current === 5 ? '20px' : '0'})`,
          opacity: redirectTimer.current === 5 ? 0 : 1,
          transition: 'all 0.3s ease-in-out',
        }}
      >
        <button onClick={onClose} className="closeButton">
          ×
        </button>
        <div className="modalContent">
          {redirectTimer.current > 0 ? (
            <h3>
              Opening {store?.name} in {redirectTimer.current} seconds...
            </h3>
          ) : (
            <h3>Did you buy {item.name}?</h3>
          )}
          <p>
            Remember to return to this site to mark the item as purchased if you
            buy it!
          </p>
          <button onClick={handleGoNow} className="goNowButton">
            Go Now
          </button>
          <button
            onClick={handlePurchase}
            className="markPurchasedButton"
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            Mark as Purchased
          </button>
        </div>
      </div>
    </div>
  );
}
