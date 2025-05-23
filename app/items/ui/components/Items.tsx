import Empty from '@/app/ui/components/Empty';
import { getCurrentUser, getItemsByListId, getItemsByUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import Item from './Item';

interface ItemsProps {
  listId?: string;
  showEditButton?: boolean;
}

export default async function Items({
  listId,
  showEditButton = false,
}: ItemsProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  let items;

  if (listId) {
    items = await getItemsByListId(listId);
  } else {
    items = await getItemsByUser(user.id);
  }

  return (
    items.length === 0 ? (
      <Empty type="item" />
    ) : (
    <div className="item-grid">
      {items.map((item) => (
        <Item key={item.id} item={item} showEditButton={showEditButton} />
      ))}
    </div>
    )
  );
}
