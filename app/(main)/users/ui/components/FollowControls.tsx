'use client';

import { followUser, unfollowUser } from '@/app/actions/follows';
import type { ButtonVariant } from '@/app/ui/components/button';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import FollowButton from './FollowButton';
import FollowDisclosureDialog from './FollowDisclosureDialog';

export default function FollowControls({
  userId,
  userName,
  initialFollowing,
  requireDisclosure,
  variant = 'primary',
}: {
  userId: string;
  userName: string | null;
  initialFollowing: boolean;
  requireDisclosure: boolean;
  variant?: ButtonVariant;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const performFollow = () => {
    setFollowing(true);
    startTransition(async () => {
      const result = await followUser(userId);
      if (!result.success) {
        setFollowing(false);
        toast.error(result.message);
        return;
      }
      toast.success(`Following ${userName ?? 'user'}`);
      router.refresh();
    });
  };

  const performUnfollow = () => {
    setFollowing(false);
    startTransition(async () => {
      const result = await unfollowUser(userId);
      if (!result.success) {
        setFollowing(true);
        toast.error(result.message);
        return;
      }
      toast.success('Unfollowed');
      router.refresh();
    });
  };

  const handleClick = () => {
    if (isPending) return;
    if (following) {
      performUnfollow();
      return;
    }
    if (requireDisclosure) {
      setDialogOpen(true);
      return;
    }
    performFollow();
  };

  return (
    <>
      <FollowButton
        following={following}
        userName={userName}
        pending={isPending}
        variant={variant}
        onClick={handleClick}
      />
      <FollowDisclosureDialog
        open={dialogOpen}
        ownerName={userName ?? 'this user'}
        onConfirm={() => {
          setDialogOpen(false);
          performFollow();
        }}
        onCancel={() => setDialogOpen(false)}
      />
    </>
  );
}
