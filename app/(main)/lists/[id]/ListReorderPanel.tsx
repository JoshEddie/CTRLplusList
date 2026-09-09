import { getItemsByListId } from '@/lib/data/item';
import { ItemDisplay } from '@/lib/types';
import ReorderList from './ReorderList';

// The list's entries in the order they hold, read whole: the surface is
// unpaged by design, so there is no page for the read to narrow to.
export default async function ListReorderPanel({ listId }: { listId: string }) {
  const entries = await getItemsByListId(listId);

  // Claim state is dropped outright rather than projected through a tier: a
  // row here states a position, a name and an ask, and none of the three vary
  // with what somebody has bought (ADR-0015).
  const items = entries.map((entry) => {
    const row: ItemDisplay = { ...entry };
    delete row.purchases;
    delete row.claimed_units;
    return row;
  });

  return <ReorderList listId={listId} items={items} />;
}
