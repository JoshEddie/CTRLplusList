import { hasBlocked, isFollowing, viewerHasAnyFollows } from '@/lib/data/user';
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
      isFollowing({ userId: viewerId, followeeId: ownerId }),
      hasBlocked({ userId: ownerId, blockedId: viewerId }),
      hasBlocked({ userId: viewerId, blockedId: ownerId }),
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
