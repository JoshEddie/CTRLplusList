import { auth } from '@/lib/auth';
import { getItemById } from '@/lib/data/item';
import { getListsByUser } from '@/lib/data/list';
import { getUserIdByEmail } from '@/lib/data/user';
import { redirect } from 'next/navigation';
import ItemFormContainer from '../ui/components/itemform/ItemFormContainer';
import { sanitizeReturnTo } from '../ui/components/returnTo';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function ItemFormBody({ params, searchParams }: Props) {
  const session = await auth();
  const { id } = await params;
  const sp = await searchParams;
  const returnTo = sanitizeReturnTo(sp.returnTo);

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await getUserIdByEmail(session.user.email);

  if (!user) {
    redirect('/');
  }

  const item = await getItemById(id, user.id);

  if (!item) {
    redirect(returnTo ?? '/items');
  }

  const lists = await getListsByUser(user.id);

  return <ItemFormContainer item={item} lists={lists} returnTo={returnTo} />;
}
