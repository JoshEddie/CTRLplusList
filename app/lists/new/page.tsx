import { getCurrentUser } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ListForm from '../ui/components/ListForm';

const NewList = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  return <ListForm user_id={user.id} />;
};

export default NewList;
