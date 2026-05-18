'use client';

import {
  blockUser,
  removeFollower,
  unblockUser,
  unfollowUser,
} from '@/app/actions/follows';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import toast from 'react-hot-toast';

type Action = 'unfollow' | 'remove' | 'block' | 'unblock';

const labels: Record<Action, string> = {
  unfollow: 'Unfollow',
  remove: 'Remove',
  block: 'Block',
  unblock: 'Unblock',
};

const fns: Record<Action, (id: string) => Promise<{ success: boolean; message: string }>> = {
  unfollow: unfollowUser,
  remove: removeFollower,
  block: blockUser,
  unblock: unblockUser,
};

export default function ConnectionsAction({
  action,
  targetId,
}: {
  action: Action;
  targetId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn secondary"
      aria-disabled={isPending}
      onClick={() => {
        if (isPending) return;
        startTransition(async () => {
          const result = await fns[action](targetId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {labels[action]}
    </button>
  );
}
