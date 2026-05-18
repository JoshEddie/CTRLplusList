import { isBlocked, isFollowing } from '@/lib/dal';
import FollowButton from './FollowButton';

export default async function FollowContainer({
  ownerId,
  ownerName,
  viewerId,
  variant = 'primary',
}: {
  ownerId: string;
  ownerName: string | null;
  viewerId: string;
  variant?: 'primary' | 'secondary';
}) {
  // Hide entirely if either side has blocked the other.
  const [following, blockedByOwner, blockedByViewer] = await Promise.all([
    isFollowing(viewerId, ownerId),
    isBlocked(ownerId, viewerId),
    isBlocked(viewerId, ownerId),
  ]);
  if (blockedByOwner || blockedByViewer) return null;

  return (
    <FollowButton
      userId={ownerId}
      userName={ownerName}
      initialFollowing={following}
      variant={variant}
    />
  );
}
