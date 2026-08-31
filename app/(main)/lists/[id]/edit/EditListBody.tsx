import { getList } from '@/lib/data/list';
import { authedIdentity } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import ListForm from '../../ui/components/ListForm';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditListBody({ params }: Props) {
  const identity = await authedIdentity();
  const { id } = await params;

  if (!identity) {
    redirect('/');
  }

  const list = await getList(id);

  const deleteDisabled = !identity.activeProfile.role.admin;

  return (
    <ListForm list={list} isEditing={true} deleteDisabled={deleteDisabled} />
  );
}
