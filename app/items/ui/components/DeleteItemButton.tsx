'use client';

import { deleteItem } from '@/app/actions/items';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { MdDeleteForever } from 'react-icons/md';

export default function DeleteItemButton({ id }: { id: string }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteItemClick = async (id: string) => {
      const result = await deleteItem(id);
      if (result.success) {
        toast.success('Item deleted successfully');
        router.push('/items');
    } else {
      toast.error(result.error || 'Failed to delete item');
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
