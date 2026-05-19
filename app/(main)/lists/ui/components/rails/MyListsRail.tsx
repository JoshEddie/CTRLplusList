import { getListsByUser } from '@/lib/dal';
import ListCardRow from '@/app/ui/components/ListCardRow';

export default async function MyListsRail({ userId }: { userId: string }) {
  const lists = (await getListsByUser(userId)).slice(0, 5);
  return (
    <ListCardRow
      lists={lists}
      emptyMessage="No lists yet. Create your first one."
    />
  );
}
