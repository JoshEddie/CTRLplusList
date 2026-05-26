import ListCardRow from '@/app/ui/components/ListCardRow';
import { getListsByUser } from '@/lib/dal';

export default async function MyListsRail({ userId }: { userId: string }) {
  const all = await getListsByUser(userId);
  const lists = all.slice(0, 5);
  const moreCount = Math.max(0, all.length - lists.length);
  return (
    <ListCardRow
      lists={lists}
      emptyMessage="No lists yet. Create your first one."
      moreCount={moreCount}
      seeAllHref="/lists"
    />
  );
}
