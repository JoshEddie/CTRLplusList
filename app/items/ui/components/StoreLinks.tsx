'use client';

import { ItemStoreTable } from '@/lib/types';
import './StoreLinks.css';

export default function StoreLinks({ stores }: { stores: ItemStoreTable[] }) {

  return (
    <div className="storeLinks">
      {stores.map((store) => {
        const price = Number(store.price);
        return (
          store.name && (
            <a
              key={store.name}
              className="btn primary"
              href={store.link}
              target="_blank"
            >
              ${price.toFixed(2)}
              <span className="store-name">{store.name}</span>
            </a>
          )
        );
      })}
    </div>
  );
}
