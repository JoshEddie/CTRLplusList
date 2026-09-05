import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { accentVars } from '@/lib/accent';
import type { ProfileAvatarView } from '@/lib/types';
import Link from 'next/link';
import { FaBookmark } from 'react-icons/fa';

export type ListCardData = {
  id: string;
  name: string;
  subtitle?: string | null;
  occasion: string;
  date: Date;
  profile?: ProfileAvatarView | null;
};

export default function ListCard({
  list,
  showOwner = false,
  bookmarked = false,
}: {
  list: ListCardData;
  showOwner?: boolean;
  bookmarked?: boolean;
}) {
  const owner = showOwner ? list.profile : null;
  return (
    <Link
      className="list-card"
      href={`/lists/${list.id}`}
      style={accentVars(list.profile?.accent)}
    >
      <div className="list-card-head">
        <div className="list-card-name">
          {bookmarked && (
            <FaBookmark
              className="list-card-bookmark-indicator"
              aria-label="Bookmarked"
            />
          )}
          <span className="list-card-name-text" title={list.name}>
            {list.name}
          </span>
        </div>
        {owner && (
          <div className="list-card-byline">
            <ProfileAvatar
              profile={owner}
              className="list-card-byline-avatar"
            />
            <span className="list-card-byline-name">{owner.name}</span>
          </div>
        )}
        {list.subtitle ? (
          <div className="list-card-subtitle">{list.subtitle}</div>
        ) : (
          <div className="list-card-subtitle-placeholder" aria-hidden />
        )}
      </div>
      <div className="list-card-meta">
        <span className="list-card-occasion">{list.occasion}</span>
        <span className="list-card-date">
          {list.date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            timeZone: 'UTC',
          })}
        </span>
      </div>
    </Link>
  );
}
