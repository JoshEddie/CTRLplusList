import Header from '@/app/ui/components/Header';
import { getCurrentUser, getItemById, getListsByUser } from '@/lib/dal';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BsArrowLeftShort } from 'react-icons/bs';
import DeleteItemButton from '../ui/components/DeleteItemButton';
import ItemForm from '../ui/components/ItemForm';

export default async function EditItem({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/');
  }

  const item = await getItemById(id);

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
        <DeleteItemButton id={item.id} />
      </Header>
      <ItemForm user_id={user.id} item={item} lists={lists} />
    </>
  )
};
