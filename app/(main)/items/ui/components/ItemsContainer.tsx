import { auth } from '@/lib/auth';
import { getItemsByListId, getItemsByUser, getUserIdByEmail } from '@/lib/dal';
import { ItemDisplay } from '@/lib/types';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ItemsBrowser from './ItemsBrowser';
import Items from './Items';
import { readItemsPageSize, viewerDisplayName } from '../../utils';

interface ItemsContainerProps {
  listId?: string;
  isListOwner?: boolean;
  viewerId?: string;
  showSpoilers?: boolean;
}

export default async function ItemsContainer({
  listId,
  isListOwner,
  viewerId,
  showSpoilers,
}: ItemsContainerProps) {
  const session = await auth();

  let items: ItemDisplay[];

  const user = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  if (!listId && !user) {
    redirect('/');
  }

  if (listId) {
    items = await getItemsByListId(listId, {
      viewerId: viewerId ?? user?.id,
      isOwner: isListOwner ?? false,
      showSpoilers: showSpoilers ?? false,
    });
  } else {
    /* v8 ignore next 3 -- unreachable: the `!listId && !user` guard above already redirects when there is no viewer in this (no-listId) branch; retained to narrow `user` to non-null for `user.id`. */
    if (!user) {
      redirect('/');
    }
    items = await getItemsByUser(user.id);
  }

  const firstLastInitial = viewerDisplayName(user?.name);

  if (listId) {
    const initialPageSize = await readItemsPageSize();
    return (
      <Suspense fallback={<LoadingIndicator size="page" />}>
        <ItemsBrowser
          items={items}
          mode="list"
          initialPageSize={initialPageSize}
          user_id={user?.id}
          user_name={firstLastInitial}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <Items items={items} user_id={user?.id} user_name={firstLastInitial} />
    </Suspense>
  );
}
