'use client';

import { ItemStoreTable } from '@/lib/types';
import { useRouter } from 'next/navigation';
import './StoreLinks.css';

export default function StoreLinks({ stores }: { stores: ItemStoreTable[] }) {
  const router = useRouter();

  return (
    <div className="storeLinks">
      {stores.map((store) => {
        const price = Number(store.price);
        return (
          store.name && (
            <button
              key={store.name}
              className="btn primary"
              onClick={() => router.push(store.link)}
            >
              ${price.toFixed(2)}
              <span className="store-name">{store.name}</span>
            </button>
          )
        );
      })}
    </div>
  );
}
