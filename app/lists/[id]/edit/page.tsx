import { getCurrentUser, getList } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ListForm from '../../ui/components/ListForm';

const EditList = async ({ params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/');
  }

  const list = await getList(parseInt(id));

  return <ListForm user_id={user.id} list={list} isEditing={true} />;
};

export default EditList;
