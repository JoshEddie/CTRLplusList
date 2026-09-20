import ItemsBrowser from '@/app/(main)/items/ui/components/ItemsBrowser';
import { readItemsPageSize } from '@/app/(main)/items/utils';
import { db } from '@/db';
import { list_items } from '@/db/schema';
import { getItemsByProfile } from '@/lib/data/item';
import { ItemDisplay, ProfileMembershipView } from '@/lib/types';
import { eq } from 'drizzle-orm';
import LibraryEmpty from './LibraryEmpty';

// The item library as the items page browses it, read through this list: every
// card's stepper states the quantity wanted here, or 0 for an item the list
// does not hold.
export default async function ListLibraryPanel({
  listId,
  actor,
}: {
  listId: string;
  actor: ProfileMembershipView;
}) {
  const [libraryItems, entries, initialPageSize] = await Promise.all([
    getItemsByProfile(actor.id, { filter: 'all' }),
    db
      .select({ item_id: list_items.item_id, quantity: list_items.quantity })
      .from(list_items)
      .where(eq(list_items.list_id, listId)),
    readItemsPageSize(),
  ]);

  const wanted = new Map(entries.map((row) => [row.item_id, row.quantity]));

  // The summed ask and the list count go: they span every list, and either
  // would read as this list's beside the stepper that sets that. Claim state
  // goes with them — a claim belongs to one list entry, not to an item, so a
  // library row surfaces none this list could judge.
  const items = libraryItems
    .filter((item) => !item.archived_at || wanted.has(item.id))
    .map((item) => {
      const card: ItemDisplay = {
        ...item,
        list_id: listId,
        quantity: wanted.get(item.id) ?? 0,
      };
      delete card.purchases;
      delete card.claimed_units;
      delete card.num_lists;
      return card;
    });

  return (
    <ItemsBrowser
      items={items}
      mode="items"
      initialPageSize={initialPageSize}
      actor={actor}
      claimless
      emptyState={<LibraryEmpty />}
    />
  );
}
