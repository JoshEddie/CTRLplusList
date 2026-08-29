import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { LinkButton } from '@/app/ui/components/button';
import FollowContainer from './FollowContainer';
import { isViewersOwnProfile } from '@/lib/activeProfile';
import { accentVars } from '@/lib/accent';
import type { ProfileAvatarView, UserIdentity } from '@/lib/types';

// Same accent band and inset disc the viewer's own profile space wears, so a
// profile reads as the same object whether it is being edited or visited.
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
    <>
      <div className="profile-space-band" style={accentVars(profile.accent)}>
        <span className="profile-space-avatar">
          <ProfileAvatar profile={profile} />
        </span>
      </div>
      <div className="profile-space-identity profile-header">
        <div className="profile-meta">
          <h1 className="profile-space-name">{profile.name}</h1>
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
    </>
  );
}
