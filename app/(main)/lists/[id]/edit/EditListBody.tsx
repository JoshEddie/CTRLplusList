import { getList } from '@/lib/data/list';
import { authedUserId } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import ListForm from '../../ui/components/ListForm';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditListBody({ params }: Props) {
  const viewerId = await authedUserId();
  const { id } = await params;

  if (!viewerId) {
    redirect('/');
  }

  const list = await getList(id);

  return <ListForm list={list} isEditing={true} />;
}
