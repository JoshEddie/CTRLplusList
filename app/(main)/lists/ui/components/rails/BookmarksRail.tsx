import { getBookmarkedListsByUser } from '@/lib/dal';
import ListCardRow from '@/app/ui/components/ListCardRow';

export default async function BookmarksRail({ userId }: { userId: string }) {
  const rows = (await getBookmarkedListsByUser(userId)).slice(0, 5);
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
    />
  );
}
