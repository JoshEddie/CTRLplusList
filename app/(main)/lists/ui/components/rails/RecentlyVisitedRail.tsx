import MoreCard from '@/app/ui/components/MoreCard';
import { getVisitHistoryByUser } from '@/lib/dal';
import HistoryCard from '../../../history/HistoryCard';
import { capRail } from './utils';

export default async function RecentlyVisitedRail({
  userId,
}: {
  userId: string;
}) {
  // Fetch one more than we render so we can tell whether to show the "+N more" tile.
  // The DAL's limit is a cap; a tighter total-count query would be a Stage 2 perf follow-up.
  const all = await getVisitHistoryByUser(userId, { limit: 50 });
  const { shown: rows, moreCount } = capRail(all);

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
      {moreCount > 0 && (
        <div className="list-card-row-item" role="listitem">
          <MoreCard moreCount={moreCount} href="/lists/history" />
        </div>
      )}
    </div>
  );
}
