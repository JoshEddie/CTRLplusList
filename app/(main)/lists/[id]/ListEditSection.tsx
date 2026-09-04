import { db } from '@/db';
import { list_items } from '@/db/schema';
import { getItemsByProfile } from '@/lib/data/item';
import { getList, getListsByProfile } from '@/lib/data/list';
import { actingAsName } from '@/lib/data/profile.active';
import { authedIdentity } from '@/lib/data/user.session';
import { ItemDisplay } from '@/lib/types';
import { eq } from 'drizzle-orm';
import EditModeForm from './EditModeForm';
import type { ListSectionProps } from './types';

export default async function ListEditSection({
  params,
  searchParams,
}: ListSectionProps) {
  const { id } = await params;
  const sp = await searchParams;

  if (sp.edit !== '1') return null;

  const [identity, list] = await Promise.all([authedIdentity(), getList(id)]);

  // A non-owner reaching `?edit=1` gets the ordinary page: the hero and items
  // sections drop out only for the owner, so returning null here leaves them
  // rendering rather than redirecting a legible URL away.
  if (!identity || !list || list.profile_id !== identity.activeProfile.id) {
    return null;
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

  // Claim state is dropped outright rather than projected through a tier: a
  // claim belongs to one list entry, not to an item, so a library row surfaced
  // here carries none this list could judge.
  const displayItems = allItems
    .filter((item) => !item.archived_at || currentListItemIds.has(item.id))
    .map((item) => {
      const stripped: ItemDisplay = { ...item };
      delete stripped.purchases;
      delete stripped.hasPurchases;
      return stripped;
    });

  return (
    <EditModeForm
      list={list}
      items={displayItems}
      initialSelectedIds={Array.from(currentListItemIds)}
      isNew={sp.new === '1'}
      actor={identity.activeProfile}
      lists={userLists}
      actingAs={await actingAsName(identity)}
    />
  );
}
