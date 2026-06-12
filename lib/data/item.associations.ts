import { db } from '@/db';
import { item_stores, items, list_items, lists, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { touchLists } from '@/lib/data/list.touch';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { updateTag } from 'next/cache';

// Internal write helpers for item ↔ store / item ↔ list associations, invoked
// only by the item actions. Deliberately NOT in a 'use server' module:
// exporting them from one would expose them as client-callable endpoints.

function emptyStore(store: { name: string; link: string; price: string }) {
  return store.name === '' && store.link === '' && store.price === '';
}

export async function updateItemStores(
  stores: { name: string; link: string; price: string }[],
  itemId: string
): Promise<void> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error('Unauthorized');
    }
    const sessionUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (!sessionUser) {
      throw new Error('Unauthorized');
    }
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      columns: { user_id: true },
    });
    if (!item || item.user_id !== sessionUser.id) {
      throw new Error('Unauthorized');
    }

    const currentAssociations = await db
      .select()
      .from(item_stores)
      .where(eq(item_stores.item_id, itemId))
      .orderBy(asc(item_stores.id));

    let count = 0;

    while (count < stores.length && count < currentAssociations.length) {
      if (
        stores[count].name !== currentAssociations[count].name ||
        stores[count].link !== currentAssociations[count].link ||
        stores[count].price !== currentAssociations[count].price
      ) {
        await db
          .update(item_stores)
          .set({
            name: stores[count].name,
            link: stores[count].link,
            price: stores[count].price,
          })
          .where(eq(item_stores.id, currentAssociations[count].id));
      }
      count++;
    }

    if (count < stores.length) {
      await Promise.all(
        stores.slice(count).map(async (store, index) => {
          if (emptyStore(store)) return;
          const currentOrder = count + index + 1;
          await db.insert(item_stores).values({
            id: nanoid(),
            item_id: itemId,
            name: store.name,
            link: store.link,
            price: store.price,
            order: currentOrder,
          });
        })
      );
    }

    if (count < currentAssociations.length) {
      await Promise.all(
        currentAssociations.slice(count).map(async (association) => {
          await db
            .delete(item_stores)
            .where(eq(item_stores.id, association.id));
        })
      );
    }
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to update item stores.');
  }
}

export async function updateItemLists(
  listIds: string[],
  itemId: string
): Promise<void> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error('Unauthorized');
    }
    const sessionUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (!sessionUser) {
      throw new Error('Unauthorized');
    }
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      columns: { user_id: true },
    });
    if (!item || item.user_id !== sessionUser.id) {
      throw new Error('Unauthorized');
    }
    if (listIds.length > 0) {
      const targetLists = await db
        .select({ id: lists.id, user_id: lists.user_id })
        .from(lists)
        .where(inArray(lists.id, listIds));
      if (
        targetLists.length !== listIds.length ||
        targetLists.some((l) => l.user_id !== sessionUser.id)
      ) {
        throw new Error('Unauthorized');
      }
    }

    const currentAssociations = await db
      .select({ list_id: list_items.list_id })
      .from(list_items)
      .where(eq(list_items.item_id, itemId));

    const currentListIds = new Set(currentAssociations.map((a) => a.list_id));
    const selectedListIds = new Set(listIds);

    const addedListIds = listIds.filter((id) => !currentListIds.has(id));

    if (listIds && listIds.length > 0) {
      await Promise.all(
        listIds.map(async (listId) => {
          if (currentListIds.has(listId)) return;

          // Get the maximum position for the list and add 65536 for the new item
          const result = await db
            .select({
              coalesce: sql<number>`COALESCE(MAX(${list_items.position}) + 65536, 65536)`,
            })
            .from(list_items)
            .where(eq(list_items.list_id, listId))
            .limit(1)
            /* v8 ignore next -- the COALESCE in the query guarantees a row with a numeric value, so the ?. and ?? 65536 fallbacks are unreachable */
            .then((result) => result[0]?.coalesce ?? 65536);

          const maxPosition = Math.floor(result) as number;

          await db.insert(list_items).values({
            item_id: itemId,
            list_id: listId,
            position: maxPosition,
          });
        })
      );
    }

    // Delete associations that are no longer selected
    const listIdsToDelete = Array.from(currentListIds).filter(
      (id) => !selectedListIds.has(id)
    );
    if (listIdsToDelete.length > 0) {
      await db
        .delete(list_items)
        .where(
          and(
            eq(list_items.item_id, itemId),
            inArray(list_items.list_id, listIdsToDelete)
          )
        );
    }

    // Membership changed on exactly these lists — advance their update
    // recency and refresh cached list reads (list-update-recency).
    const changedListIds = [...addedListIds, ...listIdsToDelete];
    if (changedListIds.length > 0) {
      await touchLists(changedListIds);
      updateTag('lists');
    }
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to update item lists.');
  }
}
