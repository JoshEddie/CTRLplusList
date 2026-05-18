import { auth } from '@/lib/auth';
import { getItemsByListId, getUserIdByEmail } from '@/lib/dal';
import { ItemDisplay } from '@/lib/types';
import { Suspense } from 'react';
import ItemsLoading from './ItemLoading';
import SortItems from './SortItems';

interface SortItemsContainerProps {
  listId: string;
  isOwner?: boolean;
  showSpoilers?: boolean;
}

export default async function SortItemsContainer({
  listId,
  isOwner,
  showSpoilers,
}: SortItemsContainerProps) {
  const session = await auth();

  const user = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  const items: ItemDisplay[] = await getItemsByListId(listId, {
    viewerId: user?.id,
    isOwner: isOwner ?? false,
    showSpoilers: showSpoilers ?? false,
  });

  return (
    <Suspense fallback={<ItemsLoading />}>
      <SortItems items={items} user_id={user?.id} listId={listId} />
    </Suspense>
  );
}
