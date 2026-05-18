import { getBookmarkedListsByUser } from '@/lib/dal';
import HomeListGrid from '../HomeListGrid';

export default async function BookmarksRail({ userId }: { userId: string }) {
  const rows = (await getBookmarkedListsByUser(userId)).slice(0, 5);
  const lists = rows.map((r) => ({
    id: r.list_id,
    name: r.list.name,
    occasion: r.list.occasion,
    date: r.list.date,
    user: r.list.user,
  }));
  return (
    <HomeListGrid
      lists={lists}
      showOwner
      emptyMessage="No bookmarks yet."
    />
  );
}
