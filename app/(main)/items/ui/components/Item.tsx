'use client';

import { createPurchase, removePurchase } from '@/app/actions/items';
import { ItemDisplay } from '@/lib/types';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { MdModeEdit } from 'react-icons/md';
import '../styles/item.css';
import ItemPhoto from './ItemPhoto';
import Purchase from './Purchase';
import Modal from './purchasemodal/Modal';
import ModalButtons from './purchasemodal/ModalButtons';
import PurchaseFlow from './purchasemodal/PurchaseFlow';
import PurchaseFlowContainer from './purchasemodal/PurchaseFlowContainer';
import StoreLinks from './StoreLinks';

export default function Item({
  item,
  className,
  user_id,
  user_name,
}: {
  item: ItemDisplay;
  className?: string;
  user_id?: string;
  user_name?: string | null;
}) {

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const showModal = useMemo(
    () => searchParams?.get('purchaseItem') === item.id,
    [searchParams, item.id]
  );
  const [purchaseFlow, setPurchaseFlow] = useState<
    'initial' | 'self' | 'other' | 'guest'
  >('initial');

  const initialName = useMemo(() => {
    if (item.purchase?.user?.name) {
      const firstLastName: string[] = item.purchase?.user?.name?.split(' ');
      return `${firstLastName[0]} ${firstLastName[1]?.[0]}`;
    }
    return item.purchase?.guest_name || '';
  }, [item.purchase?.guest_name, item.purchase?.user?.name]);

  const [purchasedBy, setPurchasedBy] = useState<string | undefined>(
    initialName
  );
  const [guestName, setGuestName] = useState('');

  const isOwner = user_id === item.user_id;
  const showPurchased = purchasedBy && !isOwner;

  const handleModalOpen = () => {
    setPurchaseFlow('initial');
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('purchaseItem', item.id || '');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleModalClose = async () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('purchaseItem');
    router.replace(`${pathname}?${params.toString()}`);
    setGuestName('');
  };

  const handlePurchaseClick = () => {
    if (!item.id) return;
    handleModalOpen();
  };

  const handleUndoConfirm = async () => {
    if (!item.id) return;
    try {
      await removePurchase({ item_id: item.id });
      setPurchasedBy(undefined);
    } catch (error) {
      console.error('Failed to remove purchase:', error);
    }
    handleModalClose();
  };

  const handlePurchaseConfirm = (name: string, user_purchase: boolean = false) => {
    if (user_purchase && user_id) {
      createPurchase({
        item_id: item.id || '',
        user_id,
        guest_name: null,
      });
    } else {
      createPurchase({
        item_id: item.id || '',
        user_id: null,
        guest_name: name,
      });
    }
    setPurchasedBy(name);
    handleModalClose();
  };

  return (
    <div
      className={`item ${className || ''} ${showPurchased ? 'purchased' : ''}`}
      title={item.name || ''}
    >
      <ItemPhoto name={item.name || ''} url={item.image_url || ''} />
      <h1 className="itemName">{item.name || ''}</h1>
      <StoreLinks stores={item.stores || []} />
      {!isOwner && (
        <Purchase
          purchasedBy={purchasedBy || undefined}
          handlePurchaseClick={handlePurchaseClick}
        />
      )}

      {isOwner && (
        <Link href={`/items/${item.id}`} className="edit-button">
          <MdModeEdit />
        </Link>
      )}

      {showModal && (
        <>
        {!purchasedBy ? (
        <Modal onClose={handleModalClose}>
          <PurchaseFlowContainer
            user_id={user_id}
            guestName={guestName}
            setGuestName={setGuestName}
            handlePurchaseConfirm={handlePurchaseConfirm}
            purchaseFlow={purchaseFlow}
            setPurchaseFlow={setPurchaseFlow}
            user_name={user_name}
          />
        </Modal>
      ) : (
        <Modal onClose={handleModalClose}>
          <PurchaseFlow
              primary_text="Are you sure you want to mark this item as not purchased?">
            <ModalButtons
              primary_button_text="Mark as Not Purchased"
              primary_button_onclick={() => handleUndoConfirm()}
            />
          </PurchaseFlow>
        </Modal>
      )}
      </>
      )}
    </div>
  );
}
