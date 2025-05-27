import ItemsContainer from '@/app/(main)/items/ui/components/ItemsContainer';
import { auth } from '@/lib/auth';
import { getList, getUserById, getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ListDetails from '../ui/components/ListDetails';
import ListPrivate from '../ui/components/ListPrivate';

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session?.user?.email
    ? await getUserIdByEmail(session?.user?.email)
    : null;

  const { id } = await params;

  const list = await getList(id);

  if (!user && !list) {
    redirect('/');
  }

  if (!list) {
    redirect('/lists');
  }

  const listOwner = await getUserById(list?.user_id);

  const isOwner = user?.id === list.user_id;

  if (!list.shared && !isOwner) {
    return <ListPrivate loggedIn={!!user} />;
  }

  return (
    <div className={`list-details-container ${user ? '' : 'no-user'}`}>
      <ListDetails isOwner={isOwner} list={list} user_name={listOwner?.name || undefined} user_id={user?.id || undefined} />
      <ItemsContainer listId={id} />
    </div>
  );
}
