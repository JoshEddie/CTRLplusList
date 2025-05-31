'use client';

import { deleteItem } from '@/app/actions/items';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { MdDeleteForever } from 'react-icons/md';

export default function DeleteItemButton({ id, userId }: { id: string; userId: string }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteItemClick = async (id: string) => {
    try {
      const result = await toast.promise(
        deleteItem(id, userId),
        {
          loading: 'Deleting',
          success: 'Item deleted successfully',
          error: 'Failed to delete item',
        }
      );
      
      if (result?.success) {
        router.push('/items');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <>
      <button className="btn danger" onClick={() => setShowConfirm(true)}>
        <MdDeleteForever />
        <span className="label mobile-hide">Delete Item</span>
      </button>
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
