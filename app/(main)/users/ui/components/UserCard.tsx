import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { accentVars } from '@/lib/accent';
import type { ProfileAvatarView } from '@/lib/types';
import Link from 'next/link';

function subLine(newCount: number, latestSharedAt: Date | null): string {
  if (!latestSharedAt) return 'No shared lists';
  return newCount > 0 ? `${newCount} new` : 'Active';
}

export default function UserCard({
  profile,
  newCount = 0,
  latestSharedAt = null,
}: {
  profile: ProfileAvatarView & { id: string };
  newCount?: number;
  latestSharedAt?: Date | null;
}) {
  return (
    <Link
      href={`/altvatar/${profile.id}`}
      className="user-card"
      style={accentVars(profile.accent)}
    >
      <div className="user-card-band">
        <div className="user-card-avatar">
          <ProfileAvatar profile={profile} />
          {newCount > 0 && (
            <span className="user-card-badge" aria-label={`${newCount} new`}>
              {newCount}
            </span>
          )}
        </div>
      </div>
      <div className="user-card-meta">
        <div className="user-card-name">{profile.name}</div>
        <div
          className={`user-card-sub${latestSharedAt ? '' : ' user-card-sub-muted'}`}
        >
          {subLine(newCount, latestSharedAt)}
        </div>
      </div>
    </Link>
  );
}
