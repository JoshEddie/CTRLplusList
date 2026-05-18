import HistoryRow, { HistoryRowData } from './HistoryRow';

export default function HistoryList({ rows }: { rows: HistoryRowData[] }) {
  if (rows.length === 0) {
    return <p className="history-empty">No visits yet.</p>;
  }
  return (
    <ul className="history-list">
      {rows.map((row) => (
        <HistoryRow key={`${row.user_id}-${row.list_id}`} row={row} />
      ))}
    </ul>
  );
}
