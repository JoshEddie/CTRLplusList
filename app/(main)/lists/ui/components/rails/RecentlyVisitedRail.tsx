import { getVisitHistoryByUser } from '@/lib/dal';
import HistoryCard from '../../../history/HistoryCard';

export default async function RecentlyVisitedRail({
  userId,
}: {
  userId: string;
}) {
  const rows = (await getVisitHistoryByUser(userId, { limit: 5 })).slice(0, 5);

  if (rows.length === 0) {
    return <div className="list-card-row-empty">No visits yet.</div>;
  }

  return (
    <div className="list-card-row" role="list">
      {rows.map((row) => (
        <div
          className="list-card-row-item"
          role="listitem"
          key={`${row.user_id}-${row.list_id}`}
        >
          <HistoryCard row={row} />
        </div>
      ))}
    </div>
  );
}
