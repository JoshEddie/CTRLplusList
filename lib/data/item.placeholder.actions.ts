'use server';

import { db } from '@/db';
import { item_images, items } from '@/db/schema';
import {
  authedIdentity,
  authedUserId,
  UNAUTHORIZED_RESPONSE,
} from '@/lib/data/user.session';
import { isItemViewable } from '@/lib/listAccess';
import { generatePlaceholderArt } from '@/lib/placeholderArt';
import { type ActionResponse } from '@/lib/types';
import { cacheTags, updateTags } from '@/lib/cacheTags';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Guest-callable by design (enumerated in server-endpoint-authorization): the
// payload is the item id alone and the stored row is fully server-derived, so
// no session is required — only view authorization, the same gate the guest
// purchase path uses. Concurrent mints race check-then-insert (no transactions
// on neon-http); the item_images_one_active_idx partial-unique index collapses
// them to one winner via onConflictDoNothing, and the loser re-reads that row.
export async function mintItemPlaceholder(
  itemId: string
): Promise<ActionResponse & { url?: string }> {
  try {
    const viewer = await authedIdentity();
    const viewable = await isItemViewable(itemId, viewer?.profile.id ?? null);
    if (!viewable) return UNAUTHORIZED_RESPONSE;

    const activeImage = () =>
      db.query.item_images.findFirst({
        where: and(
          eq(item_images.item_id, itemId),
          eq(item_images.active, true)
        ),
        orderBy: (images, { asc }) => asc(images.id),
        columns: { url: true },
      });

    const existing = await activeImage();
    if (existing) {
      return { success: true, message: 'Image already exists', url: existing.url };
    }

    const url = generatePlaceholderArt(itemId);
    const inserted = await db
      .insert(item_images)
      .values({ item_id: itemId, url, active: true })
      .onConflictDoNothing()
      .returning({ url: item_images.url });
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      columns: { profile_id: true },
    });
    updateTags(
      cacheTags.item(itemId),
      /* v8 ignore next 2 -- the missing-item arm: isItemViewable above already proved the row exists; the conditional only satisfies findFirst's `| undefined` return type. */
      ...(item ? [cacheTags.itemsOfProfile(item.profile_id)] : [])
    );

    const winner = inserted[0] ?? (await activeImage());
    return {
      success: true,
      message: 'Placeholder minted',
      url: winner?.url ?? url,
    };
  } catch (error) {
    console.error('Error minting placeholder:', error);
    return {
      success: false,
      message: 'An error occurred while generating placeholder art',
      error: 'Failed to mint placeholder',
    };
  }
}

// Transient previews for the deck's placeholder thumbs and reroll — random
// seeds, nothing persisted; a selected preview is saved later through the
// normal item save path.
export async function previewPlaceholders(
  count: number
): Promise<ActionResponse & { urls?: string[] }> {
  try {
    const viewerId = await authedUserId();
    if (!viewerId) return UNAUTHORIZED_RESPONSE;

    const n = Math.min(Math.max(Math.trunc(count), 1), 4);
    const urls = Array.from({ length: n }, () =>
      generatePlaceholderArt(nanoid())
    );
    return { success: true, message: 'Previews generated', urls };
  } catch (error) {
    console.error('Error generating placeholder previews:', error);
    return {
      success: false,
      message: 'An error occurred while generating placeholder art',
      error: 'Failed to generate previews',
    };
  }
}
