import Image from 'next/image';
import { LinkButton } from '@/app/ui/components/button';
import FollowContainer from './FollowContainer';
import { initialsOf } from '../utils';
import type { UserIdentity } from '@/lib/types';

export default function ProfileHeader({
  profile,
  publicListCount,
  viewer,
  showFollowButton,
}: {
  profile: { id: string; name: string | null; image: string | null };
  publicListCount: number;
  viewer: UserIdentity | null;
  showFollowButton: boolean;
}) {
  const isOwnProfile = viewer?.profile.id === profile.id;
  const hasImage = !!profile.image && profile.image.length > 0;

  return (
    <div className="profile-header">
      <div className="profile-avatar">
        {hasImage ? (
          <Image
            src={profile.image!}
            alt=""
            width={96}
            height={96}
            className="profile-avatar-img"
            priority
          />
        ) : (
          <span className="profile-avatar-initials">
            {initialsOf(profile.name) || '?'}
          </span>
        )}
      </div>
      <div className="profile-meta">
        <h1 className="profile-name">{profile.name ?? 'Unnamed'}</h1>
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
            viewerProfileId={viewer.profile.id}
          />
        ) : null}
      </div>
    </div>
  );
}
