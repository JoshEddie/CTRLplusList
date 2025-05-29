import { auth } from '@/lib/auth';
import { getItemsByListId, getItemsByUser, getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ItemsLoading from './ItemLoading';
import Items from './Items';

interface ItemsContainerProps {
  listId?: string;
}

export default async function ItemsContainer({
  listId,
}: ItemsContainerProps) {

  const session = await auth();

  let items;
  
  const user = session?.user?.email ? await getUserIdByEmail(session.user.email) : null;

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

  return (
    <Suspense fallback={<ItemsLoading />}>
      <Items items={items} user_id={user?.id}/>
    </Suspense>
  );
}
