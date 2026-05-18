import BookmarkRow, { BookmarkRowData } from './BookmarkRow';

export default function BookmarksList({ rows }: { rows: BookmarkRowData[] }) {
  if (rows.length === 0) {
    return (
      <p className="bookmarks-empty">
        No bookmarks yet. Open any shared list and tap Bookmark to save it here.
      </p>
    );
  }
  return (
    <ul className="bookmarks-list">
      {rows.map((row) => (
        <BookmarkRow key={`${row.user_id}-${row.list_id}`} row={row} />
      ))}
    </ul>
  );
}
