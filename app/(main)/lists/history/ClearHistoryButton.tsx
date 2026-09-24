'use client';

import { clearVisitHistory } from '@/lib/data/visit.actions';
import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';

export default function ClearHistoryButton() {
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
              {getMessage('saved_history_hint')}
            </p>
            <div className="history-clear-modal-actions">
              <Button variant="primary" onClick={() => clear(false)}>
                {getMessage('saved_history_clear_unsaved')}
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
