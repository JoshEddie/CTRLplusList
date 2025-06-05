'use client';

import { ItemDisplay } from '@/lib/types';
import { useMemo, useState } from 'react';
import '../styles/store-links.css';
import Modal from './purchasemodal/Modal';

export default function StoreLinks({ item }: { item: ItemDisplay }) {
  const [showModal, setShowModal] = useState(false);
  
  const firstStore = item.stores?.[0];
  const showFirstStore = useMemo(
    () => firstStore?.name || firstStore?.link || firstStore?.price, 
    [firstStore]
  );
  
  if (!item.stores?.length) return null;

  return (
    <>
    <div className="storeLinks">
      {item.stores.length === 0 && <p>No stores found</p>}
      {firstStore && showFirstStore && (
        <a
          key={firstStore.name}
          className="btn primary"
          href={firstStore.link}
          target="_blank"
      >
        <div className="price">${Number(firstStore.price).toFixed(2)}</div>
        <div className="store-name">{firstStore.name}</div>
      </a>)}

    </div>
      {showModal && item.stores.length > 1 && (
        <Modal className="storeLinksModal" onClose={() => setShowModal(false)}>
          <div className="modalContent">
            <div className="modal-item-name">{item.name}</div>
            <div className="modal-store-links">
              {item.stores.map((store) => {
                return (
                  store.name && (
                    <a
                      key={store.name}
                      className="btn primary"
                      href={store.link}
                      target="_blank"
                    >
                      <div className="price">${Number(store.price).toFixed(2)}</div>
                      <div className="store-name">{store.name}</div>
                    </a>
                  )
                );
              })}
            </div>
          </div>
        </Modal>
      )}
      {item.stores.length > 1 && (
        <button
          className="stores-show-more"
          onClick={() => setShowModal(!showModal)}
        >
          See More Stores
        </button>
      )}
    </>
  );
}
