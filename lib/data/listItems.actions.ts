'use server';

import { db } from '@/db';
import { items, list_items, lists } from '@/db/schema';
import { touchLists } from '@/lib/data/list.touch';
import {
  checkListBalance,
  nextPosition,
  rebalanceList,
  reorderPosition,
} from '@/lib/data/listItems.positions';
import {
  ENTRY_QUANTITY_ERROR,
  EntryQuantitySchema,
} from '@/lib/data/listItems.schema';
import { getMessage } from '@/lib/i18n/utils';
import { ADMIN_OPTIONAL, authedWriter } from '@/lib/data/profile.gate';
import { type ActionResponse } from '@/lib/types';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { and, eq, inArray } from 'drizzle-orm';

// The entry-write owner gate: the acted-as profile must own the list the entry
// belongs to. A refusal here is 'Forbidden' — the entry writes answer a caller
// without write access on the owning profile the same way.
async function guardOwnedList(
  list_id: string
): Promise<{ profile_id: string } | { error: ActionResponse }> {
  const actor = await authedWriter(ADMIN_OPTIONAL);
  if ('error' in actor) {
    return { error: actor.error };
  }
  const list = await db.query.lists.findFirst({
    where: eq(lists.id, list_id),
    columns: { profile_id: true },
  });
  if (!list) {
    return {
      error: { success: false, message: 'List not found', error: 'Not found' },
    };
  }
  if (list.profile_id !== actor.identity.activeProfile.id) {
    return {
      error: {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Forbidden',
      },
    };
  }
  return list;
}

// The owner's item pool rides along with the list tags on both writes that
// change what an entry contributes to it: a library card sums quantity and
// counts lists across every entry of the item, so a removal and a
// re-quantification each leave that read answering differently.
export async function removeListItem(
  list_id: string,
  item_id: string
): Promise<ActionResponse> {
  try {
    const list = await guardOwnedList(list_id);
    if ('error' in list) {
      return list.error;
    }

    const deleted = await db
      .delete(list_items)
      .where(
        and(eq(list_items.list_id, list_id), eq(list_items.item_id, item_id))
      )
      .returning({ item_id: list_items.item_id });
    if (deleted.length === 0) {
      return {
        success: false,
        message: 'Item is not on this list',
        error: 'Not found',
      };
    }

    await touchLists([list_id]);

    updateTags(
      cacheTags.list(list_id),
      cacheTags.itemsOfList(list_id),
      cacheTags.listsOfProfile(list.profile_id),
      cacheTags.itemsOfProfile(list.profile_id),
      cacheTags.item(item_id)
    );

    return { success: true, message: 'Removed from list' };
  } catch (error) {
    console.error('Error removing list item:', error);
    return {
      success: false,
      message: 'An error occurred while removing the item',
      error: 'Failed to remove item',
    };
  }
}

export async function updatePriority(
  item_id: string,
  target_id: string,
  listId: string
): Promise<ActionResponse> {
  try {
    const list = await guardOwnedList(listId);
    if ('error' in list) {
      return list.error;
    }

    const positionRows = await db
      .select({ item_id: list_items.item_id, position: list_items.position })
      .from(list_items)
      .where(
        and(
          eq(list_items.list_id, listId),
          inArray(list_items.item_id, [item_id, target_id])
        )
      );

    const itemRow = positionRows.find((row) => row.item_id === item_id);
    const targetRow = positionRows.find((row) => row.item_id === target_id);

    if (!itemRow || !targetRow) {
      return {
        success: false,
        message: 'Item or target not found on this list',
        error: 'Item or target not found on this list',
      };
    }

    const itemPosition = itemRow.position;
    const targetPosition = targetRow.position;

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

    updateTags(cacheTags.itemsOfList(listId));

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

export async function setListItemQuantity(
  list_id: string,
  item_id: string,
  quantity: number
): Promise<ActionResponse> {
  try {
    const list = await guardOwnedList(list_id);
    if ('error' in list) {
      return list.error;
    }

    if (!EntryQuantitySchema.safeParse(quantity).success) {
      return {
        success: false,
        message: ENTRY_QUANTITY_ERROR,
        error: 'Invalid input',
      };
    }

    // Unconditional on what is already claimed: refusing here would turn an
    // ordinary edit into a disclosure that somebody has bought something,
    // which an owner held below the claims tier must never be told (ADR-0015).
    // An over-claimed entry is legal and transient.
    const updated = await db
      .update(list_items)
      .set({ quantity })
      .where(
        and(eq(list_items.list_id, list_id), eq(list_items.item_id, item_id))
      )
      .returning({ item_id: list_items.item_id });

    // A quantity is set on the entry whether or not one exists yet: 0 is what
    // "not on this list" means, so a card stepped back up from 0 asks for the
    // row it deleted rather than failing on its absence.
    const added = updated.length === 0;
    if (added) {
      const item = await db.query.items.findFirst({
        where: eq(items.id, item_id),
        columns: { profile_id: true },
      });
      if (!item || item.profile_id !== list.profile_id) {
        return {
          success: false,
          message: getMessage('entry_foreign_item_error'),
          error: 'Forbidden',
        };
      }
      await db.insert(list_items).values({
        list_id,
        item_id,
        quantity,
        position: await nextPosition(list_id),
      });
    }

    await touchLists([list_id]);

    updateTags(
      cacheTags.list(list_id),
      cacheTags.itemsOfList(list_id),
      cacheTags.listsOfProfile(list.profile_id),
      cacheTags.itemsOfProfile(list.profile_id),
      // Only a membership change reaches the item's own read.
      ...(added ? [cacheTags.item(item_id)] : [])
    );

    return { success: true, message: 'Quantity updated' };
  } catch (error) {
    console.error('Error setting list item quantity:', error);
    return {
      success: false,
      message: 'An error occurred while setting the quantity',
      error: 'Failed to set quantity',
    };
  }
}
