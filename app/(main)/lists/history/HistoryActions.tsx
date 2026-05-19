'use client';

import { clearVisitHistory, removeVisit } from '@/app/actions/lists';
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
      <button
        type="button"
        className="btn secondary"
        onClick={() => setOpen(true)}
        aria-disabled={isPending}
      >
        Clear history
      </button>
      {open && (
        <div className="history-clear-modal" role="dialog">
          <div className="history-clear-modal-inner">
            <p>Clear visit history?</p>
            <p className="history-clear-modal-hint">
              Bookmarked lists can be preserved or cleared along with the rest.
            </p>
            <div className="history-clear-modal-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => clear(false)}
              >
                Clear non-bookmarked
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => clear(true)}
              >
                Clear all
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
