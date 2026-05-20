import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getItemById, getListsByUser, getUserIdByEmail } from '@/lib/dal';
import { redirect } from 'next/navigation';
import ItemForm from '../../../items/ui/components/itemform/ItemForm';
import { sanitizeReturnTo } from '../../../items/ui/components/returnTo';

async function InterceptedEditItemBody({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const sp = await searchParams;
  const returnTo = sanitizeReturnTo(sp.returnTo);

  if (!session?.user?.email) redirect('/');

  const user = await getUserIdByEmail(session.user.email);
  if (!user) redirect('/');

  const item = await getItemById(id, user.id);
  if (!item) redirect(returnTo ?? '/items');

  const lists = await getListsByUser(user.id);

  return (
    <ItemForm
      user_id={user.id}
      item={item}
      lists={lists}
      returnTo={returnTo}
    />
  );
}

export default function InterceptedEditItem(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <InterceptedEditItemBody {...props} />
    </Suspense>
  );
}
