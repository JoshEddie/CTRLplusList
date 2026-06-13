import { db } from '@/db';
import {
  item_images,
  item_stores,
  items,
  list_items,
  lists,
  users,
} from '@/db/schema';
import { auth } from '@/lib/auth';
import { touchLists } from '@/lib/data/list.touch';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { updateTag } from 'next/cache';

// Internal write helpers for item ↔ store / item ↔ list associations, invoked
// only by the item actions. Deliberately NOT in a 'use server' module:
// exporting them from one would expose them as client-callable endpoints.

export type StoreInput = {
  name: string;
  link: string;
  price: string;
  price_fetched_at?: string | null;
  canonical_url?: string | null;
  currency?: string | null;
};

function emptyStore(store: StoreInput) {
  return store.name === '' && store.link === '' && store.price === '';
}

function provenanceOf(store: StoreInput) {
  return {
    price_fetched_at: store.price_fetched_at
      ? new Date(store.price_fetched_at)
      : null,
    canonical_url: store.canonical_url ?? null,
    currency: store.currency ?? null,
  };
}

export async function updateItemStores(
  stores: StoreInput[],
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
      const provenance = provenanceOf(stores[count]);
      if (
        stores[count].name !== currentAssociations[count].name ||
        stores[count].link !== currentAssociations[count].link ||
        stores[count].price !== currentAssociations[count].price ||
        provenance.price_fetched_at?.getTime() !==
          currentAssociations[count].price_fetched_at?.getTime() ||
        provenance.canonical_url !== currentAssociations[count].canonical_url ||
        provenance.currency !== currentAssociations[count].currency
      ) {
        await db
          .update(item_stores)
          .set({
            name: stores[count].name,
            link: stores[count].link,
            price: stores[count].price,
            ...provenance,
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
            ...provenanceOf(store),
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

// Replaces the item's image pool wholesale and marks the active image — the
// active pointer lives here, not on items.image_url. `activeUrl` (the form's
// image_url) is always folded into the set so "every image the user picked" is
// persisted, including a hand-entered URL outside the fetched candidate set;
// the row whose url matches it is the only one flagged active (none if
// activeUrl is empty). The neon-http driver has no transactions, so a crash
// between delete and insert can leave an empty pool — accepted residual; the
// next save repopulates.
export async function replaceItemImages(
  candidates: string[],
  activeUrl: string | null,
  itemId: string
): Promise<void> {
  try {
    const urls = [...candidates];
    if (activeUrl && !urls.includes(activeUrl)) urls.push(activeUrl);

    await db.delete(item_images).where(eq(item_images.item_id, itemId));
    if (urls.length > 0) {
      // Insertion order = serial id order = display order (main image first).
      await db.insert(item_images).values(
        urls.map((url) => ({
          item_id: itemId,
          url,
          active: url === activeUrl,
        }))
      );
    }
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to update item images.');
  }
}

// Existing pool URLs in id order — used by updateItem to preserve the
// pool when a save carries no candidate list (a manual edit that didn't
// refetch), while still re-pointing the active image.
export async function getItemImageUrls(itemId: string): Promise<string[]> {
  const rows = await db
    .select({ url: item_images.url })
    .from(item_images)
    .where(eq(item_images.item_id, itemId))
    .orderBy(asc(item_images.id));
  return rows.map((r) => r.url);
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
