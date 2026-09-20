import { db } from '@/db';
import { list_items } from '@/db/schema';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';

const POSITION_STRIDE = 65536;

// Positions are integers, so a midpoint only lands strictly between its
// neighbours while they are at least two apart: at a gap of 1 the floor equals
// the lower neighbour, and at 0 they are already tied. The whole list is
// scanned rather than its top pair — move-to-bottom opens the gap it lands in,
// but move-to-top halves toward 0 and compresses the other end, which a check
// reading only the two highest positions never sees.
const MIN_PLACEABLE_GAP = 2;

export async function checkListBalance(listId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(list_items)
    .where(eq(list_items.list_id, listId))
    .orderBy(asc(list_items.position));

  return rows.some(
    (row, index) =>
      index > 0 && row.position - rows[index - 1].position < MIN_PLACEABLE_GAP
  );
}

export async function rebalanceList(listId: string): Promise<void> {
  const items = await db
    .select()
    .from(list_items)
    .where(eq(list_items.list_id, listId))
    .orderBy(asc(list_items.position));

  const updates = items.map((item: { item_id: string }, index: number) => {
    const newPosition = (index + 1) * POSITION_STRIDE;
    return db
      .update(list_items)
      .set({ position: newPosition })
      .where(
        and(
          eq(list_items.list_id, listId),
          eq(list_items.item_id, item.item_id)
        )
      );
  });

  await Promise.all(updates);

  // Fired here rather than left to the mover: a rebalance rewrites every
  // position in the list, so the keys it invalidates are its own and not the
  // ones the write that tripped it already named.
  updateTags(cacheTags.itemsOfList(listId));
}

// Integer fractional-index position for a moved item: the midpoint between the
// target and its neighbour on the side the item is travelling from, or the
// edge cases when the target has no neighbour on that side.
export async function reorderPosition(
  listId: string,
  itemPosition: number,
  targetPosition: number
): Promise<number> {
  if (itemPosition > targetPosition) {
    const result = await db
      .select({ position: list_items.position })
      .from(list_items)
      .where(
        and(
          eq(list_items.list_id, listId),
          lt(list_items.position, targetPosition)
        )
      )
      .orderBy(desc(list_items.position))
      .limit(1);
    return result.length > 0
      ? Math.floor((result[0].position + targetPosition) / 2)
      : Math.floor(targetPosition / 2);
  }

  const result = await db
    .select({ position: list_items.position })
    .from(list_items)
    .where(
      and(
        eq(list_items.list_id, listId),
        gt(list_items.position, targetPosition)
      )
    )
    .orderBy(asc(list_items.position))
    .limit(1);
  return result.length > 0
    ? Math.floor((result[0].position + targetPosition) / 2)
    : targetPosition + POSITION_STRIDE;
}

// The position an entry appended to a list takes: one stride past the last one
// held, or the stride itself on an empty list.
export async function nextPosition(listId: string): Promise<number> {
  const rows = await db
    .select({
      coalesce: sql<number>`COALESCE(MAX(${list_items.position}) + ${POSITION_STRIDE}, ${POSITION_STRIDE})`,
    })
    .from(list_items)
    .where(eq(list_items.list_id, listId))
    .limit(1);
  /* v8 ignore next -- the COALESCE guarantees a single numeric row, so neither fallback is reachable. */
  return Math.floor(rows[0]?.coalesce ?? POSITION_STRIDE);
}
