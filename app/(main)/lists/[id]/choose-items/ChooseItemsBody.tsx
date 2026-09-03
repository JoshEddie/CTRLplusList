import { auth } from '@/lib/auth';
import { db } from '@/db';
import { list_items } from '@/db/schema';
import { getItemsByProfile } from '@/lib/data/item';
import { getList, getListsByProfile } from '@/lib/data/list';
import { actingAsName } from '@/lib/data/profile.active';
import { authedIdentity } from '@/lib/data/user.session';
import { ItemDisplay } from '@/lib/types';
import { eq } from 'drizzle-orm';
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
    db
      .select({ item_id: list_items.item_id })
      .from(list_items)
      .where(eq(list_items.list_id, id)),
    getListsByProfile(identity.activeProfile.id),
  ]);

  const currentListItemIds = new Set(currentListItems.map((r) => r.item_id));

  // Claim data is dropped outright rather than projected through a tier: this
  // surface asks one question — on the list or not — and claim chrome competes
  // with the checkbox that answers it. A tier would still carry the owner's own
  // claims, and ADR-0015 has nothing that would catch the claim-state branch
  // they keep alive.
  const displayItems = allItems
    .filter((item) => !item.archived_at || currentListItemIds.has(item.id))
    .map((item) => {
      const stripped: ItemDisplay = { ...item };
      delete stripped.purchases;
      delete stripped.hasPurchases;
      return stripped;
    });

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
