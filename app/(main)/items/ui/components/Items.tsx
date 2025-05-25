import Empty from '@/app/ui/components/Empty';
import { auth } from '@/lib/auth';
import { getItemsByListId, getItemsByUser, getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import Item from './Item';

interface ItemsProps {
  listId?: string;
}

export default async function Items({
  listId,
}: ItemsProps) {

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
    items.length === 0 ? (
      <Empty type="item" />
    ) : (
    <div className="item-grid">
      {items.map((item) => {
        return (
          <Item key={item.id} item={item} showEditButton={item.user_id === user?.id} />
        )
      })}
    </div>
    )
  );
}
