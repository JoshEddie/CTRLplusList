import Link from 'next/link';

export type BookmarkRowData = {
  user_id: string;
  list_id: string;
  list: { name: string; user: { name: string | null } | null };
};

export default function BookmarkRow({ row }: { row: BookmarkRowData }) {
  return (
    <li className="bookmark-row">
      <Link href={`/lists/${row.list_id}`} className="bookmark-link">
        <div className="bookmark-name">{row.list.name}</div>
        <div className="bookmark-sub">
          by {row.list.user?.name ?? 'Unknown'}
        </div>
      </Link>
    </li>
  );
}
