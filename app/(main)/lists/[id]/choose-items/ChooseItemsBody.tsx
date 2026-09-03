import { auth } from '@/lib/auth';
import { db } from '@/db';
import { list_items } from '@/db/schema';
import { getItemsByProfile } from '@/lib/data/item';
import { getList, getListsByProfile } from '@/lib/data/list';
import { SHOWN_ENTRY } from '@/lib/data/listItems.presence';
import { actingAsName } from '@/lib/data/profile.active';
import { authedIdentity } from '@/lib/data/user.session';
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import ChooseItemsForm from './ChooseItemsForm';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ChooseItemsBody({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/');
  }

  const { id } = await params;
  const sp = await searchParams;
  const isNew = sp.new === '1';
  const [identity, list] = await Promise.all([authedIdentity(), getList(id)]);

  if (!identity || !list) {
    redirect('/lists');
  }

  if (list.profile_id !== identity.activeProfile.id) {
    redirect(`/lists/${id}`);
  }

  const [allItems, currentListItems, userLists] = await Promise.all([
    getItemsByProfile(identity.activeProfile.id, { filter: 'all' }),
    // Shown entries only: a soft-removed one is off the list, so its item
    // arrives unticked — which is what makes re-ticking it a restore, and what
    // keeps the form from telling a protected owner the removal did not take
    // (ADR-0015).
    db
      .select({ item_id: list_items.item_id })
      .from(list_items)
      .where(and(eq(list_items.list_id, id), SHOWN_ENTRY)),
    getListsByProfile(identity.activeProfile.id),
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
      actor={identity.activeProfile}
      lists={userLists}
      actingAs={await actingAsName(identity)}
    />
  );
}
