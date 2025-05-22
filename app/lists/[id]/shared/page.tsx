import Items from '@/app/items/ui/components/Items';
import Header from '@/app/ui/components/Header';
import { getCurrentUser, getItemsByListId, getList } from '@/lib/dal';
import { redirect } from 'next/navigation';

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/');
  }

  const list = await getList(parseInt(id));
  const items = await getItemsByListId(parseInt(id));

  return (
    <div className="list-container">
      <Header title={list?.name || ''} />
      {items.length > 0 && <Items listId={parseInt(id)} />}
    </div>
  );
}
