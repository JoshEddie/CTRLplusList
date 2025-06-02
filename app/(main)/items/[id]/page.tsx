import Header from '@/app/ui/components/Header';
import { auth } from '@/lib/auth';
import { getItemById, getListsByUser, getUserIdByEmail } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BsArrowLeftShort } from 'react-icons/bs';
import DeleteItemButton from '../ui/components/DeleteItemButton';
import ItemForm from '../ui/components/itemform/ItemForm';

export default async function EditItem({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await getUserIdByEmail(session.user.email);

  if (!user) {
    redirect('/');
  }

  const item = await getItemById(id, user.id);

  if (!item) {
    redirect('/items');
  }

  const lists = await getListsByUser(user.id);

  return (
    <>
      <Header title={`Edit ${item.name}`}>
        <Link className="btn primary" href="/items">
          <BsArrowLeftShort />
          Back to Items
        </Link>
        <DeleteItemButton id={item.id} userId={user.id} />
      </Header>
      <ItemForm user_id={user.id} item={item} lists={lists} />
    </>
  )
};
