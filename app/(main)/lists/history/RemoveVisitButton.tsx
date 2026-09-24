'use client';

import { removeVisit } from '@/lib/data/visit.actions';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import toast from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';

export default function RemoveVisitButton({ listId }: { listId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="history-remove-button"
      aria-label="Remove from history"
      aria-disabled={isPending}
      title="Remove from history"
      onClick={() => {
        if (isPending) return;
        startTransition(async () => {
          const result = await removeVisit(listId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          router.refresh();
        });
      }}
    >
      <FaTimes />
    </button>
  );
}
