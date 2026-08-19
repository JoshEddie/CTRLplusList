import { db } from '@/db';
import { items, list_items } from '@/db/schema';
import { sanitizePurchases } from '@/lib/data/purchase';
import { primaryStore } from '@/lib/storeValidity';
import { withSelfAvatar } from '@/lib/data/profile.identity';
import { ListTable } from '@/lib/types';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { cacheTag } from 'next/cache';

export async function getItemsByProfile(
  profileId: string,
  opts: {
    filter?: 'active' | 'archived' | 'all';
    showSpoilers?: boolean;
  } = {}
) {
  'use cache';
  cacheTag('items');
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
  cacheTag('items');
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
    viewerProfileId?: string;
    isOwner?: boolean;
    showSpoilers?: boolean;
  } = {}
) {
  'use cache';
  cacheTag('items');
  try {
    const result = await db.query.list_items.findMany({
      where: eq(list_items.list_id, listId),
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

    return result.map(({ item: { images, stores, ...item } }) => ({
      ...item,
      image_url: images[0]?.url ?? null,
      store: primaryStore(stores),
      purchases: sanitizePurchases(
        item.purchases,
        opts.viewerProfileId,
        opts.isOwner ?? false,
        opts.showSpoilers ?? false
      ),
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    throw new Error('Failed to fetch items');
  }
}
