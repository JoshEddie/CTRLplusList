import Link from 'next/link';
import { FaBookmark } from 'react-icons/fa';
import { RemoveVisitButton } from './HistoryActions';

export type HistoryRowData = {
  user_id: string;
  list_id: string;
  last_visited_at: Date;
  favorited_at: Date | null;
  list: { name: string; user: { name: string | null } | null };
};

export default function HistoryRow({ row }: { row: HistoryRowData }) {
  const bookmarked = !!row.favorited_at;
  return (
    <li className="history-row">
      <Link href={`/lists/${row.list_id}`} className="history-link">
        <div className="history-name">
          {bookmarked && (
            <FaBookmark
              className="history-bookmark-indicator"
              aria-label="Bookmarked"
            />
          )}
          {row.list.name}
        </div>
        <div className="history-sub">
          by {row.list.user?.name ?? 'Unknown'} ·{' '}
          {new Date(row.last_visited_at).toLocaleDateString()}
        </div>
      </Link>
      <RemoveVisitButton
        listId={row.list_id}
        disabled={bookmarked}
        disabledReason="Unbookmark first to remove from history"
      />
    </li>
  );
}
