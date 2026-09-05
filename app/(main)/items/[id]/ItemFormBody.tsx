import { getItemById } from '@/lib/data/item';
import { getListsByProfile } from '@/lib/data/list';
import { authedIdentity } from '@/lib/data/user.session';
import { sameOriginPath } from '@/lib/sameOriginPath';
import { redirect } from 'next/navigation';
import ItemFormContainer from '../ui/components/itemform/ItemFormContainer';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function ItemFormBody({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const returnTo = sameOriginPath(sp.returnTo);

  const identity = await authedIdentity();
  if (!identity) {
    redirect('/');
  }

  const activeProfile = identity.activeProfile;

  const item = await getItemById(id, activeProfile.id);

  if (!item) {
    redirect(returnTo ?? '/items');
  }

  const lists = await getListsByProfile(activeProfile.id);

  const deleteDisabled = !activeProfile.role.admin;

  return (
    <ItemFormContainer
      item={item}
      lists={lists}
      returnTo={returnTo}
      deleteDisabled={deleteDisabled}
    />
  );
}
