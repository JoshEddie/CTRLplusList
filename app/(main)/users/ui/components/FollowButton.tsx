'use client';

import { followUser, unfollowUser } from '@/app/actions/follows';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { FaCheck, FaPlus } from 'react-icons/fa';

export default function FollowButton({
  userId,
  userName,
  initialFollowing,
  variant = 'primary',
}: {
  userId: string;
  userName: string | null;
  initialFollowing: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    if (isPending) return;
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const result = next
        ? await followUser(userId)
        : await unfollowUser(userId);
      if (!result.success) {
        setFollowing(!next);
        toast.error(result.message);
        return;
      }
      toast.success(next ? `Following ${userName ?? 'user'}` : 'Unfollowed');
      router.refresh();
    });
  };

  const label = following
    ? 'Following'
    : userName
      ? `Follow ${userName}`
      : 'Follow';

  return (
    <div className="follow-button-wrap">
      <button
        type="button"
        className={`btn ${variant} follow-button${following ? ' is-following' : ''}`}
        aria-pressed={following}
        aria-disabled={isPending}
        onClick={toggle}
      >
        {following ? <FaCheck /> : <FaPlus />}
        <span className="label">{label}</span>
      </button>
      {!following && (
        <div className="follow-disclosure">
          Shares your name and profile picture with the owner.
        </div>
      )}
    </div>
  );
}
