import { getCurrentUser, getItemById, getListsByUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ItemForm from '../ui/components/ItemForm';

const EditItem = async ({ params }: { params: Promise<{ id: string }> }) => {
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

  return <ItemForm user_id={user.id} item={item} lists={lists} />;
};

export default EditItem;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItemById(id);
  return {
    title: item?.name ? `Edit ${item.name}` : 'Edit Item',
  };
}
