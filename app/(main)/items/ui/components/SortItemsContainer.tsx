import { auth } from '@/lib/auth';
import { getItemsByListId } from '@/lib/data/item';
import { getUserIdByEmail } from '@/lib/data/user';
import { ItemDisplay } from '@/lib/types';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
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
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <SortItems
        items={items}
        user_id={user?.id}
        listId={listId}
        showSpoilers={showSpoilers}
      />
    </Suspense>
  );
}
