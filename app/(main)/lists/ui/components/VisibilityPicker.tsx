'use client';

import { setListVisibility } from '@/app/actions/lists';
import { CheckboxField } from '@/app/ui/components/field';
import {
  SegmentedControl,
  SegmentedOption,
} from '@/app/ui/components/segmented-control';
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
      <SegmentedControl
        value={isShared ? 'shared' : 'private'}
        onChange={(v) => setShared(v === 'shared')}
        tone="on-dark"
        aria-label="List visibility"
      >
        <SegmentedOption value="private">
          <FaLock />
          <span>Private</span>
        </SegmentedOption>
        <SegmentedOption value="shared">
          <FaShareAlt />
          <span>Shared</span>
        </SegmentedOption>
      </SegmentedControl>

      {isShared && (
        <CheckboxField
          label="Show in followers' feed"
          checked={inFeed}
          disabled={isPending}
          onChange={(e) => setInFeed(e.target.checked)}
        />
      )}
    </div>
  );
}
