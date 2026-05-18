import { getVisitHistoryByUser } from '@/lib/dal';
import HomeListGrid from '../HomeListGrid';

export default async function RecentlyVisitedRail({
  userId,
}: {
  userId: string;
}) {
  const rows = (await getVisitHistoryByUser(userId, { limit: 5 })).slice(0, 5);
  const lists = rows.map((r) => ({
    id: r.list_id,
    name: r.list.name,
    occasion: r.list.occasion,
    date: r.list.date,
    user: r.list.user,
  }));
  const bookmarkedIds = new Set(
    rows.filter((r) => r.favorited_at !== null).map((r) => r.list_id)
  );
  return (
    <HomeListGrid
      lists={lists}
      showOwner
      bookmarkedIds={bookmarkedIds}
      emptyMessage="No visits yet."
    />
  );
}
