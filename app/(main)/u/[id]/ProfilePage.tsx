import Header from '@/app/ui/components/Header';
import { auth } from '@/lib/auth';
import {
  getProfileForUser,
  getPublicListsByUser,
  getUserIdByEmail,
} from '@/lib/dal';
import { notFound } from 'next/navigation';
import FollowPrompt from '../../users/ui/components/FollowPrompt';
import ProfileHeader from '../../users/ui/components/ProfileHeader';
import PublicListsGrid from '../../users/ui/components/PublicListsGrid';

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const session = await auth();
  const viewer = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;
  const viewerId = viewer?.id ?? null;

  const profile = await getProfileForUser(id, viewerId);
  if (!profile) notFound();

  // If the profile's owner has blocked the viewer, treat as not-found.
  // Cover story: account doesn't exist. Sign-out access remains intact.
  if (profile.viewerIsBlocked) notFound();

  const lists = await getPublicListsByUser(id, { limit: 50 });

  const isOtherUser = !!viewerId && viewerId !== id;
  const isReachable =
    isOtherUser && !profile.viewerIsBlocked && !profile.blockedByViewer;
  const showFollowPrompt =
    isReachable && !profile.viewerIsFollowing && sp.follow === '1';

  return (
    <div className="profile-page">
      <ProfileHeader
        user={{ id: profile.id, name: profile.name, image: profile.image }}
        publicListCount={profile.publicListCount}
        viewerId={viewerId}
        viewerIsFollowing={profile.viewerIsFollowing}
        showFollowButton={isReachable}
      />
      {showFollowPrompt && <FollowPrompt name={profile.name} />}
      <Header title="Lists" />
      <PublicListsGrid lists={lists} />
    </div>
  );
}
