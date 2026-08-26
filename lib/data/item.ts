import { db } from '@/db';
import { items, list_items, lists } from '@/db/schema';
import { sanitizePurchases } from '@/lib/data/purchase';
import { primaryStore } from '@/lib/storeValidity';
import { withSelfAvatar } from '@/lib/data/profile.identity';
import { ListTable } from '@/lib/types';
import { cacheTags, itemRowTags } from '@/lib/cacheTags';
import { and, eq, exists, isNotNull, isNull, sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

export async function getItemsByProfile(
  profileId: string,
  opts: {
    filter?: 'active' | 'archived' | 'all';
    showSpoilers?: boolean;
  } = {}
) {
  'use cache';
  cacheTag(
    cacheTags.items,
    cacheTags.profiles,
    cacheTags.itemsOfProfile(profileId)
  );
  try {
    const filter = opts.filter ?? 'active';
    const showSpoilers = opts.showSpoilers ?? false;
    const where =
      filter === 'active'
        ? and(eq(items.profile_id, profileId), isNull(items.archived_at))
        : filter === 'archived'
          ? and(eq(items.profile_id, profileId), isNotNull(items.archived_at))
          : eq(items.profile_id, profileId);

    const result = await db.query.items.findMany({
      where,
      with: {
        stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
        purchases: {
          with: {
            purchaserProfile: {
              columns: { name: true },
              with: withSelfAvatar,
            },
            claimerProfile: {
              columns: { name: true },
            },
          },
        },
        // Active image only — `image_url` is now sourced from item_images, not
        // the (inert) items.image_url column. ORDER BY id LIMIT 1 makes a stray
        // double-active resolve deterministically.
        images: {
          where: (images, { eq }) => eq(images.active, true),
          orderBy: (images, { asc }) => [asc(images.id)],
          limit: 1,
        },
      },
      orderBy: (items, { desc }) => [desc(items.created_at)],
    });

    cacheTag(...itemRowTags(result));

    return result.map(({ images, stores, ...item }) => ({
      ...item,
      image_url: images[0]?.url ?? null,
      store: primaryStore(stores),
      hasPurchases: item.purchases.length > 0,
      purchases: sanitizePurchases(
        item.purchases,
        profileId,
        true,
        showSpoilers
      ),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

export async function getItemById(id: string, profileId: string) {
  'use cache';
  cacheTag(
    cacheTags.items,
    cacheTags.lists,
    cacheTags.item(id),
    cacheTags.itemsOfProfile(profileId)
  );
  try {
    const result = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.profile_id, profileId)),
      with: {
        stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
        images: { orderBy: (images, { asc }) => [asc(images.id)] },
        list_items: {
          with: {
            list: true,
          },
        },
      },
      orderBy: (items, { desc }) => [desc(items.created_at)],
    });

    if (!result) {
      return result;
    }

    const lists: (ListTable & { position: number })[] = result.list_items.map(
      (li) => ({
        ...li.list,
        position: li.position,
      })
    );
    // itemsOfList alongside list: the returned rows carry membership
    // positions, which reorder writes bump via the membership tag only.
    cacheTag(
      ...lists.flatMap((list) => [
        cacheTags.list(list.id),
        cacheTags.itemsOfList(list.id),
      ])
    );

    const newResult = {
      id: result.id,
      name: result.name,
      description: result.description,
      // Active image sourced from item_images (id-ordered, so a stray
      // double-active resolves deterministically), not items.image_url.
      image_url: result.images.find((image) => image.active)?.url ?? null,
      quantity_limit: result.quantity_limit,
      profile_id: result.profile_id,
      created_at: result.created_at,
      updated_at: result.updated_at,
      archived_at: result.archived_at,
      store: primaryStore(result.stores),
      image_candidates: result.images.map((image) => image.url),
      lists: lists,
    };

    return newResult;
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

export async function getItemsByListId(
  listId: string,
  opts: {
    viewerSelfProfileId?: string;
    isOwner?: boolean;
    showSpoilers?: boolean;
  } = {}
) {
  'use cache';
  cacheTag(
    cacheTags.items,
    cacheTags.profiles,
    cacheTags.itemsOfList(listId),
    // The owning profile below is part of this read's answer, so a list that
    // changes hands has to invalidate it.
    cacheTags.list(listId)
  );
  try {
    const result = await db.query.list_items.findMany({
      where: and(
        eq(list_items.list_id, listId),
        // The item and the list must agree on whose they are — see getList,
        // which narrows its item count by the same rule.
        exists(
          db
            .select({ one: sql`1` })
            .from(items)
            .innerJoin(lists, eq(lists.id, list_items.list_id))
            .where(
              and(
                eq(items.id, list_items.item_id),
                eq(items.profile_id, lists.profile_id)
              )
            )
        )
      ),
      with: {
        item: {
          with: {
            stores: { orderBy: (stores, { asc }) => [asc(stores.order)] },
            purchases: {
              with: {
                purchaserProfile: {
                  columns: { name: true },
                  with: withSelfAvatar,
                },
                claimerProfile: {
                  columns: { name: true },
                },
              },
            },
            // Active image only — source for `image_url` (see getItemsByProfile).
            images: {
              where: (images, { eq }) => eq(images.active, true),
              orderBy: (images, { asc }) => [asc(images.id)],
              limit: 1,
            },
          },
        },
      },
      orderBy: (list_items, { asc }) => [asc(list_items.position)],
    });

    cacheTag(...itemRowTags(result.map((row) => row.item)));

    return result.map(({ item: { images, stores, ...item } }) => ({
      ...item,
      image_url: images[0]?.url ?? null,
      store: primaryStore(stores),
      purchases: sanitizePurchases(
        item.purchases,
        opts.viewerSelfProfileId,
        opts.isOwner ?? false,
        opts.showSpoilers ?? false
      ),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw new Error('Failed to fetch items');
  }
}
