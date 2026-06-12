import { auth } from '@/lib/auth';
import { getList } from '@/lib/data/list';
import { getUserIdByEmail } from '@/lib/data/user';
import { redirect } from 'next/navigation';
import ListForm from '../../ui/components/ListForm';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditListBody({ params }: Props) {
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

  return <ListForm list={list} isEditing={true} />;
}
