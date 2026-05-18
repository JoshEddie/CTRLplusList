import Image from 'next/image';
import Link from 'next/link';
import FollowButton from './FollowButton';

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function ProfileHeader({
  user,
  publicListCount,
  viewerId,
  viewerIsFollowing,
  showFollowButton,
}: {
  user: { id: string; name: string | null; image: string | null };
  publicListCount: number;
  viewerId: string | null;
  viewerIsFollowing: boolean;
  showFollowButton: boolean;
}) {
  const isOwnProfile = viewerId === user.id;
  const hasImage = !!user.image && user.image.length > 0;

  return (
    <div className="profile-header">
      <div className="profile-avatar">
        {hasImage ? (
          <Image
            src={user.image!}
            alt=""
            width={96}
            height={96}
            className="profile-avatar-img"
            priority
          />
        ) : (
          <span className="profile-avatar-initials">
            {initialsOf(user.name)}
          </span>
        )}
      </div>
      <div className="profile-meta">
        <h1 className="profile-name">{user.name ?? 'Unnamed'}</h1>
        <div className="profile-stats">
          {publicListCount} shared list{publicListCount === 1 ? '' : 's'}
        </div>
      </div>
      <div className="profile-actions">
        {isOwnProfile ? (
          <Link href="/settings/connections" className="btn secondary">
            Manage connections
          </Link>
        ) : showFollowButton ? (
          <FollowButton
            userId={user.id}
            userName={user.name}
            initialFollowing={viewerIsFollowing}
          />
        ) : null}
      </div>
    </div>
  );
}
