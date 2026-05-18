'use client';

import Modal from '@/app/(main)/items/ui/components/purchasemodal/Modal';
import ModalButtons from '@/app/(main)/items/ui/components/purchasemodal/ModalButtons';
import PurchaseFlow from '@/app/(main)/items/ui/components/purchasemodal/PurchaseFlow';
import { toggleShareList } from '@/app/actions/lists';
import { ListTable } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { MdOutlineIosShare } from 'react-icons/md';

export default function ShareButton({ list }: { list: ListTable }) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const listUrl = `https://www.ctrlpluslist.com/lists/${list.id}`;

  const copyToClipboard = async () => {
    try {
      await toast.promise(navigator.clipboard.writeText(listUrl), {
        loading: 'Copying',
        success: 'Copied to clipboard',
        error: 'Failed to copy URL to clipboard',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const performShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: list.name,
          url: listUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing list:', error);
          toast.error('Failed to share list');
        }
      }
    } else {
      await copyToClipboard();
    }
  };

  const handleShareClick = async () => {
    if (!list.shared) {
      setShowWarning(true);
      return;
    }
    await performShare();
  };

  const handleMakePublicAndShare = async () => {
    // Fire toggle in parallel so navigator.share stays inside the user gesture window
    void toggleShareList(list.id, true).then((result) => {
      if (result.success) {
        toast.success('List is now public');
        router.refresh();
      } else {
        toast.error('Failed to make list public');
      }
    });
    setShowWarning(false);
    await performShare();
  };

  return (
    <>
      <button
        className={`btn primary`}
        onClick={handleShareClick}
        aria-label={'Share list'}
      >
        <MdOutlineIosShare />
        <span className="label mobile-hide">
          Share List
        </span>
      </button>

      {showWarning && (
        <Modal onClose={() => setShowWarning(false)}>
          <PurchaseFlow
            primary_text="This list is private."
            secondary_text="No one will be able to view it unless you make it public. Make it public and share?"
          >
            <ModalButtons
              primary_button_text="Make public & share"
              primary_button_onclick={handleMakePublicAndShare}
              secondary_button_text="Cancel"
              secondary_button_onclick={() => setShowWarning(false)}
            />
          </PurchaseFlow>
        </Modal>
      )}
    </>
  );
}
