import Image from 'next/image';
import Link from 'next/link';
import { initialsOf } from '../utils';

export default function UserCard({
  profile,
  newCount = 0,
  latestSharedAt = null,
  compact = false,
}: {
  profile: { id: string; name: string | null; image: string | null };
  newCount?: number;
  latestSharedAt?: Date | null;
  compact?: boolean;
}) {
  const hasImage = !!profile.image && profile.image.length > 0;
  const className = compact ? 'user-card user-card--compact' : 'user-card';
  const avatarSize = compact ? 44 : 64;
  return (
    <Link href={`/user/${profile.id}`} className={className}>
      <div className="user-card-avatar">
        {hasImage ? (
          <Image
            src={profile.image!}
            alt=""
            width={avatarSize}
            height={avatarSize}
            className="user-card-avatar-img"
          />
        ) : (
          <span className="user-card-avatar-initials">
            {initialsOf(profile.name) || '?'}
          </span>
        )}
        {newCount > 0 && (
          <span className="user-card-badge" aria-label={`${newCount} new`}>
            {newCount}
          </span>
        )}
      </div>
      <div className="user-card-meta">
        <div className="user-card-name">{profile.name ?? 'Unnamed'}</div>
        {!compact &&
          (latestSharedAt ? (
            <div className="user-card-sub">
              {newCount > 0 ? `${newCount} new` : 'Active'}
            </div>
          ) : (
            <div className="user-card-sub user-card-sub-muted">
              No shared lists
            </div>
          ))}
      </div>
    </Link>
  );
}
