import { db } from '@/db';
import { list_items } from '@/db/schema';
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';

export async function checkListBalance(listId: string): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(list_items)
      .where(eq(list_items.list_id, listId))
      .orderBy(desc(list_items.position))
      .limit(2);

    if (result.length < 2) return false;

    const [first, second] = result;
    const minGap = 0.001;
    return first.position - second.position < minGap;
  } catch (error) {
    console.error('Error checking list balance:', error);
    throw error;
  }
}

export async function rebalanceList(listId: string): Promise<void> {
  try {
    const items = await db
      .select()
      .from(list_items)
      .where(eq(list_items.list_id, listId))
      .orderBy(asc(list_items.position));

    const updates = items.map((item: { item_id: string }, index: number) => {
      const newPosition = (index + 1) * 65536;
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
  } catch (error) {
    console.error('Error rebalancing list:', error);
    throw error;
  }
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
    : targetPosition + 65536;
}
