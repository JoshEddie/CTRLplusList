import { getCurrentUser, getListsByUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ItemForm from './ItemForm';

const ItemFormContainer = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const lists = await getListsByUser(user.id);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  return <ItemForm user_id={user.id} lists={lists} />;
};

export default ItemFormContainer;
