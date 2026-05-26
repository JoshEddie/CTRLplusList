import { auth } from '@/lib/auth';
import { getItemsByListId, getItemsByUser, getUserIdByEmail } from '@/lib/dal';
import { ItemDisplay } from '@/lib/types';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ItemsBrowser from './ItemsBrowser';
import Items from './Items';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './paginationConstants';

interface ItemsContainerProps {
  listId?: string;
  isListOwner?: boolean;
  viewerId?: string;
  showSpoilers?: boolean;
}

async function readPageSizeCookie(): Promise<number> {
  const store = await cookies();
  const raw = store.get('items_page_size')?.value;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return PAGE_SIZE_OPTIONS.includes(parsed as 12 | 24 | 48 | 96)
    ? parsed
    : DEFAULT_PAGE_SIZE;
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
    if (!user) {
      redirect('/');
    }
    items = await getItemsByUser(user.id);
  }

  const firstLastName: string[] = user?.name ? user.name.split(' ') : [];
  const firstLastInitial =
    firstLastName.length > 1
      ? `${firstLastName[0]} ${firstLastName[1]?.[0]}`
      : firstLastName[0];

  if (listId) {
    const initialPageSize = await readPageSizeCookie();
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
