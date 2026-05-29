'use client';

import Modal from '@/app/(main)/items/ui/components/purchasemodal/Modal';
import ModalButtons from '@/app/(main)/items/ui/components/purchasemodal/ModalButtons';
import PurchaseFlow from '@/app/(main)/items/ui/components/purchasemodal/PurchaseFlow';
import { setListVisibility } from '@/app/actions/lists';
import { Button } from '@/app/ui/components/button';
import { ListTable } from '@/lib/types';
import { VISIBILITY, resolveListVisibility } from '@/lib/visibility';
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

  const visibility = resolveListVisibility(list);
  const isPrivate = visibility === VISIBILITY.OWNER;

  const handleShareClick = async () => {
    if (isPrivate) {
      setShowWarning(true);
      return;
    }
    await performShare();
  };

  const handleMakePublicAndShare = async () => {
    // Promote to link-only (private) before sharing. Owner can later promote
    // to followers (shared) from the visibility picker if they want feed broadcast.
    // Fire in parallel so navigator.share stays inside the user gesture window.
    void setListVisibility(list.id, VISIBILITY.LINK).then((result) => {
      if (result.success) {
        toast.success('Sharing enabled');
        router.refresh();
      } else {
        toast.error('Failed to enable sharing');
      }
    });
    setShowWarning(false);
    await performShare();
  };

  return (
    <>
      <Button
        variant="on-dark"
        onClick={handleShareClick}
        aria-label="Share list"
      >
        <MdOutlineIosShare />
        <span className="label">Share List</span>
      </Button>

      {showWarning && (
        <Modal onClose={() => setShowWarning(false)}>
          <PurchaseFlow
            primary_text="This list is hidden."
            secondary_text="No one can view it unless you make it private (link-only). Make private and share?"
          >
            <ModalButtons
              primary_button_text="Make private & share"
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
