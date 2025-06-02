import { auth } from '@/lib/auth';
import { getListsByUser, getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ItemForm from './ItemForm';

const ItemFormContainer = async () => {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await getUserIdByEmail(session.user.email);

  if (!user) {
    redirect('/');
  }

  const lists = await getListsByUser(user.id);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  return <ItemForm user_id={user.id} lists={lists} />;
};

export default ItemFormContainer;
