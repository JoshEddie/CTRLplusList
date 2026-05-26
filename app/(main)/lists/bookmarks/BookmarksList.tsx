import ListCard, { ListCardData } from '@/app/ui/components/ListCard';

export type BookmarkRowData = {
  user_id: string;
  list_id: string;
  list: ListCardData;
};

export default function BookmarksList({ rows }: { rows: BookmarkRowData[] }) {
  if (rows.length === 0) {
    return (
      <p className="bookmarks-empty">
        No bookmarks yet. Open any shared list and tap Bookmark to save it here.
      </p>
    );
  }
  return (
    <ul className="list-card-grid" role="list">
      {rows.map((row) => (
        <li key={`${row.user_id}-${row.list_id}`}>
          <ListCard list={row.list} showOwner />
        </li>
      ))}
    </ul>
  );
}
