'use client';

import { setListVisibility } from '@/app/actions/lists';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { FaLock, FaShareAlt } from 'react-icons/fa';

type Visibility = 'private' | 'unlisted' | 'public';

function describe(v: Visibility): string {
  switch (v) {
    case 'private':
      return 'List is now private';
    case 'unlisted':
      return 'Anyone with the link can view';
    case 'public':
      return 'Visible to your followers';
  }
}

export default function VisibilityPicker({
  listId,
  initialVisibility,
}: {
  listId: string;
  initialVisibility: Visibility;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<Visibility>(initialVisibility);
  const [isPending, startTransition] = useTransition();

  const isShared = current !== 'private';
  const inFeed = current === 'public';

  const apply = (next: Visibility) => {
    if (next === current || isPending) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await setListVisibility(listId, next);
      if (!result.success) {
        setCurrent(prev);
        toast.error(result.message);
        return;
      }
      toast.success(describe(next));
      router.refresh();
    });
  };

  const setShared = (shared: boolean) => {
    // Going Private → Shared defaults to link-only (unlisted).
    // Going Shared → Private clears the feed bit by design.
    apply(shared ? 'unlisted' : 'private');
  };

  const setInFeed = (on: boolean) => {
    if (!isShared) return;
    apply(on ? 'public' : 'unlisted');
  };

  return (
    <div className="visibility-picker">
      <div className="visibility-toggle" role="radiogroup" aria-label="List visibility">
        <button
          type="button"
          role="radio"
          aria-checked={!isShared}
          aria-disabled={isPending}
          className={`visibility-option${!isShared ? ' active' : ''}`}
          onClick={() => setShared(false)}
        >
          <FaLock />
          <span className="visibility-option-label">Private</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={isShared}
          aria-disabled={isPending}
          className={`visibility-option${isShared ? ' active' : ''}`}
          onClick={() => setShared(true)}
        >
          <FaShareAlt />
          <span className="visibility-option-label">Shared</span>
        </button>
      </div>

      {isShared && (
        <label className="visibility-feed-toggle">
          <input
            type="checkbox"
            checked={inFeed}
            disabled={isPending}
            onChange={(e) => setInFeed(e.target.checked)}
          />
          <span>Show in followers&apos; feed</span>
        </label>
      )}
    </div>
  );
}
