import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ListForm from '../ui/components/ListForm';

const NewList = async () => {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await getUserIdByEmail(session.user.email);

  if (!user) {
    redirect('/');
  }

  return <ListForm user_id={user.id} />;
};

export default NewList;
