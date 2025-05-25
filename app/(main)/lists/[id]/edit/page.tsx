import { auth } from '@/lib/auth';
import { getList, getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ListForm from '../../ui/components/ListForm';

const EditList = async ({ params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await getUserIdByEmail(session.user.email);

  if (!user) {
    redirect('/');
  }

  const list = await getList(id);

  return <ListForm user_id={user.id} list={list} isEditing={true} />;
};

export default EditList;
