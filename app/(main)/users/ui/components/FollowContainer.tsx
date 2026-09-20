import type { ButtonVariant } from '@/app/ui/components/button';
import { getFollowState } from '@/lib/data/follow';
import FollowControls from './FollowControls';

export default async function FollowContainer({
  ownerProfileId,
  ownerName,
  viewerUserId,
  viewerSelfProfileId,
  variant = 'primary',
}: {
  ownerProfileId: string;
  ownerName: string | null;
  viewerUserId: string;
  viewerSelfProfileId: string;
  variant?: ButtonVariant;
}) {
  const state = await getFollowState({
    viewerUserId,
    viewerSelfProfileId,
    ownerProfileId,
  });
  if (!state) return null;

  return (
    <FollowControls
      profileId={ownerProfileId}
      userName={ownerName}
      initialFollowing={state.following}
      requireDisclosure={state.requireDisclosure}
      variant={variant}
    />
  );
}
