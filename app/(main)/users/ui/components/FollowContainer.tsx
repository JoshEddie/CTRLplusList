import { isBlocked, isFollowing, viewerHasAnyFollows } from '@/lib/dal';
import type { ButtonVariant } from '@/app/ui/components/button';
import FollowControls from './FollowControls';

export default async function FollowContainer({
  ownerId,
  ownerName,
  viewerId,
  variant = 'primary',
}: {
  ownerId: string;
  ownerName: string | null;
  viewerId: string;
  variant?: ButtonVariant;
}) {
  const [following, blockedByOwner, blockedByViewer, hasAnyFollows] =
    await Promise.all([
      isFollowing(viewerId, ownerId),
      isBlocked(ownerId, viewerId),
      isBlocked(viewerId, ownerId),
      viewerHasAnyFollows(viewerId),
    ]);
  if (blockedByOwner || blockedByViewer) return null;

  return (
    <FollowControls
      userId={ownerId}
      userName={ownerName}
      initialFollowing={following}
      requireDisclosure={!hasAnyFollows}
      variant={variant}
    />
  );
}
