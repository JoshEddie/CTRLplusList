import HistoryCard, { HistoryRowData } from './HistoryCard';

export type { HistoryRowData };

export default function HistoryList({ rows }: { rows: HistoryRowData[] }) {
  if (rows.length === 0) {
    return <p className="history-empty">No visits yet.</p>;
  }
  return (
    <ul className="list-card-grid" role="list">
      {rows.map((row) => (
        <li key={`${row.user_id}-${row.list_id}`}>
          <HistoryCard row={row} />
        </li>
      ))}
    </ul>
  );
}
