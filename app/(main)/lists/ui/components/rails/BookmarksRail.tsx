import ListCardRow from '@/app/ui/components/ListCardRow';
import { getBookmarkedListsByUser } from '@/lib/dal';
import { capRail } from './utils';

export default async function BookmarksRail({ userId }: { userId: string }) {
  const all = await getBookmarkedListsByUser(userId);
  const { shown: rows, moreCount } = capRail(all);
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
