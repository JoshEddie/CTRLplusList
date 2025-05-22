'use client';

import { deleteList } from '@/app/actions/lists';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { MdDeleteForever } from 'react-icons/md';
import ConfirmDialog from './ConfirmDialog';

export default function DeleteButton({ id }: { id: string | number }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteListClick = async (id: number) => {
    const result = await deleteList(id);
    if (result.success) {
      toast.success('List deleted successfully');
      router.push('/lists');
    }
  };

  return (
    <>
      <button className="btn danger" onClick={() => setShowConfirm(true)}>
        <MdDeleteForever />
        Delete List
      </button>
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => handleDeleteListClick(Number(id))}
        title="Confirm Delete"
        message="Are you sure you want to delete this list? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
