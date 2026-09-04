'use server';

// TODO(#343): extract the duplicated literal to a constant, then drop this disable
/* eslint-disable sonarjs/no-duplicate-string */

import { db } from '@/db';
import { items, list_items, lists } from '@/db/schema';
import { auth } from '@/lib/auth';
import { touchLists } from '@/lib/data/list.touch';
import {
  checkListBalance,
  rebalanceList,
  reorderPosition,
} from '@/lib/data/listItems.positions';
import {
  ENTRY_QUANTITY_ERROR,
  EntryQuantitySchema,
} from '@/lib/data/listItems.schema';
import { ADMIN_OPTIONAL, authedWriter } from '@/lib/data/profile.gate';
import { type ActionResponse } from '@/lib/types';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

const StagedEntriesSchema = z.array(
  z.object({ item_id: z.string().min(1), quantity: EntryQuantitySchema })
);

const POSITION_STRIDE = 65536;

// The desired state arrives whole and ordered. Rows keep their positions when
// the order they already hold is the order asked for (adds trailing it), so a
// quantity-only edit or a pure add touches nothing else; any other order is
// rewritten as clean multiples of the stride, which is why edit mode's Save
// never needs the midpoint-and-rebalance path (ADR-0010).
function desiredPositions(
  existing: { item_id: string; position: number }[],
  incoming: { item_id: string }[]
): Map<string, number> {
  const existingIds = new Set(existing.map((row) => row.item_id));
  const incomingIds = new Set(incoming.map((entry) => entry.item_id));
  const survivors = existing.filter((row) => incomingIds.has(row.item_id));
  const inserts = incoming.filter((entry) => !existingIds.has(entry.item_id));
  const kept = [...survivors, ...inserts].map((entry) => entry.item_id);
  const asked = incoming.map((entry) => entry.item_id);
  if (kept.join('\n') !== asked.join('\n')) {
    return new Map(
      asked.map((item_id, index) => [item_id, (index + 1) * POSITION_STRIDE])
    );
  }
  const max = survivors.reduce((acc, row) => Math.max(acc, row.position), 0);
  return new Map([
    ...survivors.map((row) => [row.item_id, row.position] as const),
    ...inserts.map(
      (entry, index) =>
        [entry.item_id, max + (index + 1) * POSITION_STRIDE] as const
    ),
  ]);
}

type EntryRow = { item_id: string; position: number; quantity: number };

// The three write sets the desired state resolves to against what is saved.
function stagedWrites(
  list_id: string,
  existing: EntryRow[],
  incoming: { item_id: string; quantity: number }[]
) {
  const existingById = new Map(existing.map((row) => [row.item_id, row]));
  const incomingIds = new Set(incoming.map((entry) => entry.item_id));
  const positions = desiredPositions(existing, incoming);
  const upserts = incoming
    .map((entry) => ({
      list_id,
      item_id: entry.item_id,
      quantity: entry.quantity,
      position: positions.get(entry.item_id)!,
    }))
    .filter((row) => {
      const current = existingById.get(row.item_id);
      return (
        !current ||
        current.position !== row.position ||
        current.quantity !== row.quantity
      );
    });
  return {
    toRemove: existing
      .filter((row) => !incomingIds.has(row.item_id))
      .map((row) => row.item_id),
    toInsert: upserts
      .filter((row) => !existingById.has(row.item_id))
      .map((row) => row.item_id),
    upserts,
  };
}

function describeWrites(added: number, removed: number, updated: number) {
  const parts: string[] = [];
  if (added > 0) parts.push(`Added ${added}`);
  if (removed > 0) parts.push(`removed ${removed}`);
  if (updated > 0) parts.push(`updated ${updated}`);
  return parts.join(', ');
}

export async function setListItems(
  list_id: string,
  entries: { item_id: string; quantity: number }[]
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
      columns: { profile_id: true },
    });
    if (!list) {
      return { success: false, message: 'List not found', error: 'Not found' };
    }

    // The gate's own rejection collapses into this one: the session-presence
    // check above already refused the no-session cause, so a stale session and
    // a revoked membership both fall to the ownership comparison a null actor
    // can never pass, and all three keep the endpoint's own 'Forbidden' code.
    const actor = await authedWriter(ADMIN_OPTIONAL);
    if (
      'error' in actor ||
      actor.identity.activeProfile.id !== list.profile_id
    ) {
      return {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Forbidden',
      };
    }

    const parsed = StagedEntriesSchema.safeParse(entries);
    const incoming = parsed.success ? parsed.data : [];
    if (
      !parsed.success ||
      new Set(incoming.map((entry) => entry.item_id)).size !== incoming.length
    ) {
      return {
        success: false,
        message: 'Invalid item selection',
        error: 'Invalid input',
      };
    }

    const existing = await db
      .select({
        item_id: list_items.item_id,
        position: list_items.position,
        quantity: list_items.quantity,
      })
      .from(list_items)
      .where(eq(list_items.list_id, list_id))
      .orderBy(asc(list_items.position));
    const { toRemove, toInsert, upserts } = stagedWrites(
      list_id,
      existing,
      incoming
    );

    if (toRemove.length === 0 && upserts.length === 0) {
      return { success: true, message: 'No changes' };
    }

    if (toInsert.length > 0) {
      const targetItems = await db
        .select({ profile_id: items.profile_id })
        .from(items)
        .where(inArray(items.id, toInsert));
      if (
        targetItems.length !== toInsert.length ||
        targetItems.some((i) => i.profile_id !== list.profile_id)
      ) {
        return {
          success: false,
          message: 'Unauthorized - items do not belong to you',
          error: 'Forbidden',
        };
      }
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

    if (upserts.length > 0) {
      await db
        .insert(list_items)
        .values(upserts)
        .onConflictDoUpdate({
          target: [list_items.list_id, list_items.item_id],
          set: {
            position: sql`excluded.position`,
            quantity: sql`excluded.quantity`,
          },
        });
    }

    await touchLists([list_id]);

    // Per-item tags alongside the list tags: getItemById is keyed by item and
    // carries membership tags only for the lists the item was already on, so an
    // added item's cached entry names no tag this write would otherwise fire.
    updateTags(
      cacheTags.list(list_id),
      cacheTags.itemsOfList(list_id),
      cacheTags.listsOfProfile(list.profile_id),
      ...[...toInsert, ...toRemove].map((itemId) => cacheTags.item(itemId))
    );

    return {
      success: true,
      message: describeWrites(
        toInsert.length,
        toRemove.length,
        upserts.length - toInsert.length
      ),
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

// The entry-write owner gate: the acted-as profile must own the list the entry
// belongs to. Not shared with every write in this module — the others answer a
// refused write with a different code.
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
    const actor = await authedWriter(ADMIN_OPTIONAL);
    if ('error' in actor) {
      return actor.error;
    }
    const { identity } = actor;
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
      columns: { profile_id: true },
    });
    if (!list || list.profile_id !== identity.activeProfile.id) {
      return {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Unauthorized',
      };
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
    if (updated.length === 0) {
      return {
        success: false,
        message: 'Item is not on this list',
        error: 'Not found',
      };
    }

    updateTags(cacheTags.itemsOfList(list_id));

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
