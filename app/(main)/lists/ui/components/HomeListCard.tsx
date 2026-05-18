import Link from 'next/link';
import { FaBookmark, FaCalendar, FaGift, FaUser } from 'react-icons/fa';

export type HomeListCardData = {
  id: string;
  name: string;
  occasion: string;
  date: Date;
  user?: { name: string | null } | null;
};

export default function HomeListCard({
  list,
  showOwner = false,
  bookmarked = false,
}: {
  list: HomeListCardData;
  showOwner?: boolean;
  bookmarked?: boolean;
}) {
  return (
    <div className="list-row">
      <Link className="list" href={`/lists/${list.id}`}>
        <div className="list-cell list-name">
          {bookmarked && (
            <FaBookmark
              className="list-bookmark-indicator"
              aria-label="Bookmarked"
            />
          )}
          {list.name}
        </div>
        <div className="list-cell-details">
          {showOwner && list.user?.name && (
            <div className="list-cell list-owner">
              <FaUser /> {list.user.name}
            </div>
          )}
          <div className="list-cell list-occasion">
            <FaGift />
            {list.occasion}
          </div>
          <div className="list-cell list-date">
            <FaCalendar />
            {list.date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              timeZone: 'UTC',
            })}
          </div>
        </div>
      </Link>
    </div>
  );
}
