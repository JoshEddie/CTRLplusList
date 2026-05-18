import Image from 'next/image';
import Link from 'next/link';

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function UserCard({
  user,
  newCount = 0,
  latestSharedAt = null,
}: {
  user: { id: string; name: string | null; image: string | null };
  newCount?: number;
  latestSharedAt?: Date | null;
}) {
  const hasImage = !!user.image && user.image.length > 0;
  return (
    <Link href={`/u/${user.id}`} className="user-card">
      <div className="user-card-avatar">
        {hasImage ? (
          <Image
            src={user.image!}
            alt=""
            width={64}
            height={64}
            className="user-card-avatar-img"
          />
        ) : (
          <span className="user-card-avatar-initials">
            {initialsOf(user.name)}
          </span>
        )}
        {newCount > 0 && (
          <span className="user-card-badge" aria-label={`${newCount} new`}>
            {newCount}
          </span>
        )}
      </div>
      <div className="user-card-meta">
        <div className="user-card-name">{user.name ?? 'Unnamed'}</div>
        {latestSharedAt ? (
          <div className="user-card-sub">
            {newCount > 0 ? `${newCount} new` : 'Active'}
          </div>
        ) : (
          <div className="user-card-sub user-card-sub-muted">No shared lists</div>
        )}
      </div>
    </Link>
  );
}
