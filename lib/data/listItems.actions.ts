'use server';

import { db } from '@/db';
import { list_items, lists, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { type ActionResponse } from '@/lib/data/list.actions';
import { authedUserId } from '@/lib/data/user.session';
import { and, asc, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { z } from 'zod';

export async function setListItems(
  list_id: string,
  item_ids: string[]
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return {
        success: false,
        message: 'Unauthorized access',
        error: 'Unauthorized',
      };
    }

    const list = await db.query.lists.findFirst({
      where: eq(lists.id, list_id),
      columns: { user_id: true },
    });
    if (!list) {
      return { success: false, message: 'List not found', error: 'Not found' };
    }

    const sessionUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (!sessionUser || sessionUser.id !== list.user_id) {
      return {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Forbidden',
      };
    }

    const parsed = z.array(z.string().min(1)).safeParse(item_ids);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid item selection',
        error: 'Invalid input',
      };
    }

    const incomingIds = new Set(parsed.data);
    const existing = await db
      .select({ item_id: list_items.item_id })
      .from(list_items)
      .where(eq(list_items.list_id, list_id));
    const existingIds = new Set(existing.map((r) => r.item_id));

    const toRemove = [...existingIds].filter((id) => !incomingIds.has(id));
    const toInsert = [...incomingIds].filter((id) => !existingIds.has(id));

    if (toRemove.length === 0 && toInsert.length === 0) {
      return { success: true, message: 'No changes' };
    }

    if (toRemove.length > 0) {
      await db
        .delete(list_items)
        .where(
          and(
            eq(list_items.list_id, list_id),
            inArray(list_items.item_id, toRemove)
          )
        );
    }

    if (toInsert.length > 0) {
      const baseResult = await db
        .select({
          base: sql<number>`COALESCE(MAX(${list_items.position}) + 65536, 65536)`,
        })
        .from(list_items)
        .where(eq(list_items.list_id, list_id))
        .limit(1);
      /* v8 ignore next -- the COALESCE in the query guarantees a row with a numeric base, so the ?. and ?? 65536 fallbacks are unreachable */
      const basePosition = Math.floor(baseResult[0]?.base ?? 65536);

      await db.insert(list_items).values(
        toInsert.map((item_id, index) => ({
          list_id,
          item_id,
          position: basePosition + index * 65536,
        }))
      );
    }

    updateTag('items');
    updateTag('lists');

    const parts: string[] = [];
    if (toInsert.length > 0) parts.push(`Added ${toInsert.length}`);
    if (toRemove.length > 0) parts.push(`removed ${toRemove.length}`);

    return {
      success: true,
      message: parts.join(', '),
    };
  } catch (error) {
    console.error('Error setting list items:', error);
    return {
      success: false,
      message: 'An error occurred while saving items',
      error: 'Failed to save items',
    };
  }
}

async function checkListBalance(listId: string): Promise<boolean> {
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

async function rebalanceList(listId: string): Promise<void> {
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
async function reorderPosition(
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

export async function updatePriority(
  item_id: string,
  target_id: string,
  listId: string
): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return {
        success: false,
        message: 'Unauthorized',
        error: 'Unauthorized',
      };
    }
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
      columns: { user_id: true },
    });
    if (!list || list.user_id !== userId) {
      return {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Unauthorized',
      };
    }

    const itemPositionResult = await db
      .select({ position: list_items.position })
      .from(list_items)
      .where(
        and(eq(list_items.list_id, listId), eq(list_items.item_id, item_id))
      )
      .limit(1);

    const targetPositionResult = await db
      .select({ position: list_items.position })
      .from(list_items)
      .where(
        and(eq(list_items.list_id, listId), eq(list_items.item_id, target_id))
      )
      .limit(1);

    if (!itemPositionResult[0] || !targetPositionResult[0]) {
      return {
        success: false,
        message: 'Item or target not found on this list',
        error: 'Item or target not found on this list',
      };
    }

    const itemPosition = itemPositionResult[0].position;
    const targetPosition = targetPositionResult[0].position;

    if (itemPosition === targetPosition) {
      return {
        success: false,
        message: 'Item is already at the target position',
        error: 'Item is already at the target position',
      };
    }

    const new_position = await reorderPosition(
      listId,
      itemPosition,
      targetPosition
    );

    await db
      .update(list_items)
      .set({ position: new_position })
      .where(
        and(eq(list_items.list_id, listId), eq(list_items.item_id, item_id))
      );

    updateTag('items');

    if (await checkListBalance(listId)) {
      await rebalanceList(listId);
    }

    return { success: true, message: 'Item priority updated successfully' };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      success: false,
      message: 'Failed to update item priority',
      error: 'Failed to update item priority',
    };
  }
}
