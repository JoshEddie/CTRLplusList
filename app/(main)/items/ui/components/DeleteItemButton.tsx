'use client';

import { archiveItem, deleteItem } from '@/lib/data/item.actions';
import { Button } from '@/app/ui/components/button';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function DeleteItemButton({
  id,
  returnTo,
  onDeleted,
  archived = false,
}: {
  id: string;
  returnTo?: string;
  onDeleted?: () => void;
  archived?: boolean;
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteItemClick = async (id: string) => {
    try {
      const result = await toast.promise(deleteItem(id), {
        loading: 'Deleting',
        success: 'Item deleted successfully',
        error: 'Failed to delete item',
      });

      if (result?.success) {
        if (onDeleted) {
          onDeleted();
          router.refresh();
        } else {
          router.push(returnTo ?? '/items');
        }
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleArchiveClick = async () => {
    try {
      const result = await toast.promise(archiveItem(id, true), {
        loading: 'Archiving',
        success: 'Archived',
        error: 'Failed to archive',
      });
      if (result?.success) {
        if (onDeleted) {
          onDeleted();
          router.refresh();
        } else {
          router.push(returnTo ?? '/items');
        }
      }
    } catch (error) {
      console.error('Error archiving item:', error);
    }
  };

  // Anchor word: "history." Archive preserves it, Delete erases it. The
  // metaphor absorbs claims, list memberships, and time on lists without
  // forcing the dialog to enumerate them or branch on claim count.
  const title = archived
    ? 'Delete this item permanently?'
    : 'Delete this item?';
  const message = archived
    ? "This erases its history. Can't be undone."
    : "Archive instead to keep its history. Deleting can't be undone.";

  return (
    <>
      <Button variant="danger" onClick={() => setShowConfirm(true)}>
        Delete
      </Button>
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => handleDeleteItemClick(id)}
        title={title}
        message={message}
        confirmText="Delete"
        cancelText="Cancel"
        tertiary={
          archived
            ? undefined
            : { label: 'Archive instead', onClick: handleArchiveClick }
        }
      />
    </>
  );
}
