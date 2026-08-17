import { getItemById } from '@/lib/data/item';
import { getListsByProfile } from '@/lib/data/list';
import { authedIdentity } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import ItemFormContainer from '../ui/components/itemform/ItemFormContainer';
import { sanitizeReturnTo } from '../ui/components/returnTo';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function ItemFormBody({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const returnTo = sanitizeReturnTo(sp.returnTo);

  const identity = await authedIdentity();
  if (!identity) {
    redirect('/');
  }

  const item = await getItemById(id, identity.profile.id);

  if (!item) {
    redirect(returnTo ?? '/items');
  }

  const lists = await getListsByProfile(identity.profile.id);

  return <ItemFormContainer item={item} lists={lists} returnTo={returnTo} />;
}
