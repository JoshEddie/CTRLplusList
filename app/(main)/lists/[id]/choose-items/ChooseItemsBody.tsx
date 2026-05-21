import { auth } from '@/lib/auth';
import { db } from '@/db';
import { list_items } from '@/db/schema';
import {
  getItemsByUser,
  getList,
  getListsByUser,
  getUserIdByEmail,
} from '@/lib/dal';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import ChooseItemsForm from './ChooseItemsForm';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ChooseItemsBody({
  params,
  searchParams,
}: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/');
  }

  const { id } = await params;
  const sp = await searchParams;
  const isNew = sp.new === '1';
  const [user, list] = await Promise.all([
    getUserIdByEmail(session.user.email),
    getList(id),
  ]);

  if (!user || !list) {
    redirect('/lists');
  }

  if (list.user_id !== user.id) {
    redirect(`/lists/${id}`);
  }

  const [allItems, currentListItems, userLists] = await Promise.all([
    getItemsByUser(user.id, { filter: 'all' }),
    db
      .select({ item_id: list_items.item_id })
      .from(list_items)
      .where(eq(list_items.list_id, id)),
    getListsByUser(user.id),
  ]);

  const currentListItemIds = new Set(currentListItems.map((r) => r.item_id));

  const displayItems = allItems.filter(
    (item) => !item.archived_at || currentListItemIds.has(item.id)
  );

  return (
    <ChooseItemsForm
      list_id={id}
      list_name={list.name}
      items={displayItems}
      initialSelectedIds={Array.from(currentListItemIds)}
      isNew={isNew}
      user_id={user.id}
      lists={userLists}
    />
  );
}
