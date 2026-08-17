import { hasBlocked } from '@/lib/data/profile';
import { isFollowing, viewerHasAnyFollows } from '@/lib/data/user';
import type { ButtonVariant } from '@/app/ui/components/button';
import FollowControls from './FollowControls';

export default async function FollowContainer({
  ownerProfileId,
  ownerName,
  viewerUserId,
  viewerProfileId,
  variant = 'primary',
}: {
  ownerProfileId: string;
  ownerName: string | null;
  viewerUserId: string;
  viewerProfileId: string;
  variant?: ButtonVariant;
}) {
  const [following, blockedByOwner, blockedByViewer, hasAnyFollows] =
    await Promise.all([
      isFollowing({ userId: viewerUserId, followeeProfileId: ownerProfileId }),
      hasBlocked({
        blockerProfileId: ownerProfileId,
        blockedProfileId: viewerProfileId,
      }),
      hasBlocked({
        blockerProfileId: viewerProfileId,
        blockedProfileId: ownerProfileId,
      }),
      viewerHasAnyFollows(viewerUserId),
    ]);
  if (blockedByOwner || blockedByViewer) return null;

  return (
    <FollowControls
      profileId={ownerProfileId}
      userName={ownerName}
      initialFollowing={following}
      requireDisclosure={!hasAnyFollows}
      variant={variant}
    />
  );
}
