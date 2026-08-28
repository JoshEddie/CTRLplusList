import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { LinkButton } from '@/app/ui/components/button';
import FollowContainer from './FollowContainer';
import { isViewersOwnProfile } from '@/lib/activeProfile';
import type { ProfileAvatarView, UserIdentity } from '@/lib/types';

export default function ProfileHeader({
  profile,
  publicListCount,
  viewer,
  showFollowButton,
}: {
  profile: ProfileAvatarView & { id: string };
  publicListCount: number;
  viewer: UserIdentity | null;
  showFollowButton: boolean;
}) {
  const isOwnProfile = isViewersOwnProfile(viewer, profile.id);

  return (
    <div className="profile-header">
      <ProfileAvatar profile={profile} />
      <div className="profile-meta">
        <h1 className="profile-name">{profile.name}</h1>
        <div className="profile-stats">
          {publicListCount} shared list{publicListCount === 1 ? '' : 's'}
        </div>
      </div>
      <div className="profile-actions">
        {isOwnProfile ? (
          <LinkButton href="/settings/connections" variant="secondary">
            Manage connections
          </LinkButton>
        ) : showFollowButton && viewer ? (
          <FollowContainer
            ownerProfileId={profile.id}
            ownerName={profile.name}
            viewerUserId={viewer.userId}
            viewerSelfProfileId={viewer.selfProfile.id}
          />
        ) : null}
      </div>
    </div>
  );
}
