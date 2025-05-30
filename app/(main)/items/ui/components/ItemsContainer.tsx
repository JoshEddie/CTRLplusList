import { auth } from '@/lib/auth';
import { getItemsByListId, getItemsByUser, getUserIdByEmail } from '@/lib/dal';
import { ItemDisplay } from '@/lib/types';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ItemsLoading from './ItemLoading';
import Items from './Items';

interface ItemsContainerProps {
  listId?: string;
}

export default async function ItemsContainer({ listId }: ItemsContainerProps) {
  const session = await auth();

  let items: ItemDisplay[];

  const user = session?.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  if (!listId && !user) {
    redirect('/');
  }

  if (listId) {
    items = await getItemsByListId(listId);
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

  return (
    <Suspense fallback={<ItemsLoading />}>
      <Items items={items} user_id={user?.id} user_name={firstLastInitial} />
    </Suspense>
  );
}
