import Link from 'next/link';
import { FaBookmark } from 'react-icons/fa';

export type ListCardData = {
  id: string;
  name: string;
  subtitle?: string | null;
  occasion: string;
  date: Date;
  user?: { name: string | null } | null;
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
  const subtitle = list.subtitle ?? (showOwner ? list.user?.name : null) ?? null;
  return (
    <Link className="list-card" href={`/lists/${list.id}`}>
      <div className="list-card-head">
        <div className="list-card-name">
          {bookmarked && (
            <FaBookmark
              className="list-card-bookmark-indicator"
              aria-label="Bookmarked"
            />
          )}
          {list.name}
        </div>
        {subtitle && (
          <div className="list-card-subtitle">{subtitle}</div>
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
