/* eslint-disable @next/next/no-img-element */

import { ItemDisplay } from '@/lib/types';
import { formatStorePrice, lowestPricedStore } from '../utils';

export default function PurchaseModalHeader({ item }: { item: ItemDisplay }) {
  const lowest = lowestPricedStore(item.stores);
  return (
    <header className="claim-modal-header">
      <span className="claim-modal-thumb" aria-hidden>
        {item.image_url && (
          <img src={item.image_url} alt="" loading="lazy" decoding="async" />
        )}
      </span>
      <div className="claim-modal-heading">
        <h2>{item.name || ''}</h2>
        {lowest && (
          <p className="claim-modal-price">{formatStorePrice(lowest.price)}</p>
        )}
      </div>
    </header>
  );
}
