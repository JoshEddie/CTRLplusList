'use client';

import { clearVisitHistory, removeVisit } from '@/lib/data/visit.actions';
import { Button } from '@/app/ui/components/button';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';

export function RemoveVisitButton({ listId }: { listId: string }) {
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

export function ClearHistoryButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const clear = (includeBookmarked: boolean) => {
    if (isPending) return;
    startTransition(async () => {
      const result = await clearVisitHistory({ includeBookmarked });
      setOpen(false);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(
        includeBookmarked ? 'All history cleared' : 'History cleared'
      );
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-disabled={isPending}
      >
        Clear history
      </Button>
      {open && (
        <div className="history-clear-modal" role="dialog">
          <div className="history-clear-modal-inner">
            <p>Clear visit history?</p>
            <p className="history-clear-modal-hint">
              Bookmarked lists can be preserved or cleared along with the rest.
            </p>
            <div className="history-clear-modal-actions">
              <Button variant="primary" onClick={() => clear(false)}>
                Clear non-bookmarked
              </Button>
              <Button variant="danger" onClick={() => clear(true)}>
                Clear all
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
