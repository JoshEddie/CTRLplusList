import { hasBlocked } from '@/lib/data/profile';
import { isFollowing, viewerHasAnyFollows } from '@/lib/data/user';

/** `null` where either party blocks — there is no Follow to offer. */
export type FollowState = { following: boolean; requireDisclosure: boolean };

// The single read behind every Follow control: what the viewer's account holds
// on this profile, and whether a block on either side withdraws the offer
// altogether. Both block checks name the human, so they take the self-profile
// whatever profile is active.
export async function getFollowState({
  viewerUserId,
  viewerSelfProfileId,
  ownerProfileId,
}: {
  viewerUserId: string;
  viewerSelfProfileId: string;
  ownerProfileId: string;
}): Promise<FollowState | null> {
  const [following, blockedByOwner, blockedByViewer, hasAnyFollows] =
    await Promise.all([
      isFollowing({ userId: viewerUserId, followeeProfileId: ownerProfileId }),
      hasBlocked({
        blockerProfileId: ownerProfileId,
        blockedProfileId: viewerSelfProfileId,
      }),
      hasBlocked({
        blockerProfileId: viewerSelfProfileId,
        blockedProfileId: ownerProfileId,
      }),
      viewerHasAnyFollows(viewerUserId),
    ]);
  if (blockedByOwner || blockedByViewer) return null;
  return { following, requireDisclosure: !hasAnyFollows };
}
