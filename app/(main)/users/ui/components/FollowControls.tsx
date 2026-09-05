'use client';

import type { ButtonVariant } from '@/app/ui/components/button';
import { followUser, unfollowUser } from '@/lib/data/profile.actions';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import FollowButton from './FollowButton';
import FollowDisclosureDialog from './FollowDisclosureDialog';

export default function FollowControls({
  profileId,
  userName,
  initialFollowing,
  requireDisclosure,
  variant = 'primary',
}: {
  profileId: string;
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
      const result = await followUser(profileId);
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
      const result = await unfollowUser(profileId);
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
