'use client';

import { Button } from '@/app/ui/components/button';
import type { ButtonVariant } from '@/app/ui/components/button';
import { FaCheck, FaPlus } from 'react-icons/fa';

export default function FollowButton({
  following,
  userName,
  pending,
  variant = 'primary',
  onClick,
}: {
  following: boolean;
  userName: string | null;
  pending: boolean;
  variant?: ButtonVariant;
  onClick: () => void;
}) {
  const label = following
    ? 'Following'
    : userName
      ? `Follow ${userName}`
      : 'Follow';

  return (
    <Button
      variant={variant}
      pressed={following}
      aria-disabled={pending}
      aria-label={label}
      onClick={onClick}
    >
      {following ? <FaCheck /> : <FaPlus />}
      <span className="label">{label}</span>
    </Button>
  );
}
