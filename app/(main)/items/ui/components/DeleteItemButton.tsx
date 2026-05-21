'use client';

import { deleteItem } from '@/app/actions/items';
import { Button } from '@/app/ui/components/button';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function DeleteItemButton({
  id,
  userId,
  returnTo,
  onDeleted,
}: {
  id: string;
  userId: string;
  returnTo?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteItemClick = async (id: string) => {
    try {
      const result = await toast.promise(deleteItem(id, userId), {
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

  return (
    <>
      <Button variant="danger" onClick={() => setShowConfirm(true)}>
        Delete
      </Button>
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => handleDeleteItemClick(id)}
        title="Confirm Delete"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
