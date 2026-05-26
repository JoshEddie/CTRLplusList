import ListCardRow from '@/app/ui/components/ListCardRow';
import { getBookmarkedListsByUser } from '@/lib/dal';

export default async function BookmarksRail({ userId }: { userId: string }) {
  const all = await getBookmarkedListsByUser(userId);
  const rows = all.slice(0, 5);
  const moreCount = Math.max(0, all.length - rows.length);
  const lists = rows.map((r) => ({
    id: r.list_id,
    name: r.list.name,
    subtitle: (r.list as { subtitle?: string | null }).subtitle ?? null,
    occasion: r.list.occasion,
    date: r.list.date,
    user: r.list.user,
  }));
  return (
    <ListCardRow
      lists={lists}
      showOwner
      emptyMessage="No bookmarks yet."
      moreCount={moreCount}
      seeAllHref="/lists/bookmarks"
    />
  );
}
