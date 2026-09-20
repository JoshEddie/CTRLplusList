'use client';

import {
  blockUser,
  unblockUser,
  unfollowUser,
} from '@/lib/data/profile.actions';
import { removeFollower } from '@/lib/data/user.actions';
import { Button } from '@/app/ui/components/button';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import toast from 'react-hot-toast';

type Target =
  | { action: 'remove'; followerAccountId: string }
  | { action: 'unfollow' | 'block' | 'unblock'; targetProfileId: string };

type Action = Target['action'];

const labels: Record<Action, string> = {
  unfollow: 'Unfollow',
  remove: 'Remove',
  block: 'Block',
  unblock: 'Unblock',
};

const fns: Record<
  Action,
  (id: string) => Promise<{ success: boolean; message: string }>
> = {
  unfollow: unfollowUser,
  remove: removeFollower,
  block: blockUser,
  unblock: unblockUser,
};

export default function ConnectionsAction(props: Target) {
  const { action } = props;
  const targetId =
    props.action === 'remove' ? props.followerAccountId : props.targetProfileId;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
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
    </Button>
  );
}
