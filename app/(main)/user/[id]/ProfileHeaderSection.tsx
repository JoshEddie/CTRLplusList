import { isViewersOwnProfile } from '@/lib/activeProfile';
import { getProfileForViewer } from '@/lib/data/profile';
import { authedIdentity } from '@/lib/data/user.session';
import { notFound } from 'next/navigation';
import FollowPrompt from '../../users/ui/components/FollowPrompt';
import ProfileHeader from '../../users/ui/components/ProfileHeader';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProfileHeaderSection({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const identity = await authedIdentity();

  const profile = await getProfileForViewer(id, identity);
  if (!profile) notFound();

  // Cover story when the profile owner has blocked the viewer: act as
  // not-found so the existence of the account isn't disclosed.
  if (profile.viewerIsBlocked) notFound();

  const isOtherUser = !!identity && !isViewersOwnProfile(identity, id);
  const isReachable =
    isOtherUser && !profile.viewerIsBlocked && !profile.blockedByViewer;
  const showFollowPrompt =
    isReachable && !profile.viewerIsFollowing && sp.follow === '1';

  return (
    <>
      <ProfileHeader
        profile={profile}
        publicListCount={profile.publicListCount}
        viewer={identity}
        showFollowButton={isReachable}
      />
      {showFollowPrompt && <FollowPrompt name={profile.name} />}
    </>
  );
}
