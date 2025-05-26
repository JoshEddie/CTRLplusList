'use client';

import { deleteList } from '@/app/actions/lists';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { MdDeleteForever } from 'react-icons/md';

export default function DeleteListButton({ id }: { id: string }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteListClick = async (id: string) => {
    const result = await deleteList(id);
    if (result.success) {
      toast.success('List deleted successfully');
      router.push('/lists');
    } else {
      toast.error(result.error || 'Failed to delete list');
    }
  };

  return (
    <>
      <button className="btn danger" onClick={() => setShowConfirm(true)}>
        <MdDeleteForever />
        <span className="label mobile-hide">Delete List</span>
      </button>
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => handleDeleteListClick(id)}
        title="Confirm Delete"
        message="Are you sure you want to delete this list? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
