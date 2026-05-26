import { auth } from '@/lib/auth';
import { getProfileForUser, getUserIdByEmail } from '@/lib/dal';
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

  const session = await auth();
  const viewer = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;
  const viewerId = viewer?.id ?? null;

  const profile = await getProfileForUser(id, viewerId);
  if (!profile) notFound();

  // Cover story when the profile owner has blocked the viewer: act as
  // not-found so the existence of the account isn't disclosed.
  if (profile.viewerIsBlocked) notFound();

  const isOtherUser = !!viewerId && viewerId !== id;
  const isReachable =
    isOtherUser && !profile.viewerIsBlocked && !profile.blockedByViewer;
  const showFollowPrompt =
    isReachable && !profile.viewerIsFollowing && sp.follow === '1';

  return (
    <>
      <ProfileHeader
        user={{ id: profile.id, name: profile.name, image: profile.image }}
        publicListCount={profile.publicListCount}
        viewerId={viewerId}
        showFollowButton={isReachable}
      />
      {showFollowPrompt && <FollowPrompt name={profile.name} />}
    </>
  );
}
