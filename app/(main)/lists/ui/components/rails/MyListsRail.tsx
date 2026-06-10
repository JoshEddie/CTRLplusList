import ListCardRow from '@/app/ui/components/ListCardRow';
import { getListsByUser } from '@/lib/data/list';
import { capRail } from './utils';

export default async function MyListsRail({ userId }: { userId: string }) {
  const all = await getListsByUser(userId);
  const { shown: lists, moreCount } = capRail(all);
  return (
    <ListCardRow
      lists={lists}
      emptyMessage="No lists yet. Create your first one."
      moreCount={moreCount}
      seeAllHref="/lists"
    />
  );
}
