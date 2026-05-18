import { getListsByUser } from '@/lib/dal';
import HomeListGrid from '../HomeListGrid';

export default async function MyListsRail({ userId }: { userId: string }) {
  const lists = (await getListsByUser(userId)).slice(0, 5);
  return (
    <HomeListGrid
      lists={lists}
      emptyMessage="No lists yet. Create your first one."
    />
  );
}
