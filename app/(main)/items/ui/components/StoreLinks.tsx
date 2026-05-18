'use client';

import { ItemDisplay } from '@/lib/types';
import { useMemo } from 'react';
import '../styles/store-links.css';

export default function StoreLinks({ item }: { item: ItemDisplay }) {
  const stores = item.stores ?? [];

  const validStores = useMemo(
    () =>
      stores.filter(
        (s) => s?.name && s?.link && !Number.isNaN(Number(s.price))
      ),
    [stores]
  );

  const lowestPrice = useMemo(() => {
    if (!validStores.length) return null;
    return validStores.reduce((min, s) =>
      Number(s.price) < Number(min.price) ? s : min
    );
  }, [validStores]);

  if (!lowestPrice) return null;

  return (
    <>
      <div className="item-price">
        ${Number(lowestPrice.price).toFixed(2)}
      </div>
      <div className="store-links-label-row">
        <span className="store-links-label from-label">
          from {lowestPrice.name}
        </span>
        <span className="store-links-label">Buy on</span>
      </div>
      <div className="storeLinks">
        {validStores.map((store) => (
          <a
            key={store.name}
            className="btn store-link-btn"
            href={store.link}
            target="_blank"
          >
            {store.name}
          </a>
        ))}
      </div>
    </>
  );
}
