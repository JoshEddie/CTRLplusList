'use server';

import { db } from '@/db';
import { item_stores, items, list_items, purchases, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { getItemById, getListsByUser, getUserIdByEmail } from '@/lib/dal';
import { isItemViewable } from '@/lib/listAccess';
import { ItemDetails } from '@/lib/types';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { updateTag } from 'next/cache';
import { z } from 'zod';

// Postgres unique-violation error code.
const PG_UNIQUE_VIOLATION = '23505';

export async function getItemEditData(itemId: string) {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await getUserIdByEmail(session.user.email);
  if (!user) return null;
  const [item, lists] = await Promise.all([
    getItemById(itemId, user.id),
    getListsByUser(user.id),
  ]);
  if (!item) return null;
  return { item, lists };
}

// Define Zod schema for item validation. The actor's user_id is resolved
// server-side from the session, never accepted from the client payload — see
// openspec/specs/server-endpoint-authorization.
const ItemSchema = z.object({
  name: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),

  description: z.string().optional(),

  image_url: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      // If the value is empty or undefined, it's valid
      if (!val) return true;

      // Otherwise, validate it as a URL
      try {
        new URL(val);
        return true;
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please provide a valid URL',
        });
        return false;
      }
    }),

  // Optional fields
  quantity_limit: z
    .number()
    .int('Quantity limit must be a whole number')
    .min(1, 'Quantity limit must be at least 1')
    .nullable(),
  lists: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .optional(),
  stores: z
    .array(
      z.object({
        name: z.string().optional(),
        link: z.string().optional(),
        price: z.string().optional(),
      })
    )
    .optional()
    .refine(
      (stores) => {
        if (!stores) return true;
        return stores.every((store) => {
          const hasAnyField = store.name || store.link || store.price;
          const hasAllFields = store.name && store.link && store.price;

          // If no fields are filled, it's valid
          if (!hasAnyField) return true;

          // If any field is filled, all must be filled
          if (!hasAllFields) return false;

          // Validate URL format if link is provided
          if (store.link) {
            try {
              new URL(store.link);
              return true;
            } catch {
              return false;
            }
          }
          return true;
        });
      },
      {
        message: 'Please provide a valid URL',
        path: ['stores'],
      }
    ),
});

export type ItemData = z.infer<typeof ItemSchema>;

export type ActionResponse = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  error?: string;
};

export async function createPurchase(data: {
  item_id: string;
  guest_name: string | null;
}): Promise<ActionResponse> {
  try {
    const session = await auth();

    let actorUserId: string | null = null;
    let guestName: string | null = null;
    if (session?.user?.email) {
      const sessionUser = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { id: true },
      });
      if (!sessionUser) {
        return {
          success: false,
          message: 'User not found',
          error: 'Unauthorized',
        };
      }
      actorUserId = sessionUser.id;
    } else {
      const trimmed = data.guest_name?.trim() ?? '';
      if (!trimmed) {
        return {
          success: false,
          message: 'Cannot identify which claim to add',
          error: 'Missing identity',
        };
      }
      guestName = trimmed;
    }

    // Gate by viewability: items on lists the caller can't see are unclaimable.
    // Indistinguishable from a missing item on purpose.
    const viewable = await isItemViewable(data.item_id, actorUserId);
    if (!viewable) {
      return {
        success: false,
        message: 'Item not found',
        error: 'Item not found',
      };
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, data.item_id),
      columns: { quantity_limit: true },
    });
    if (!item) {
      return {
        success: false,
        message: 'Item not found',
        error: 'Item not found',
      };
    }

    const existing = await db
      .select({
        id: purchases.id,
        user_id: purchases.user_id,
        guest_name: purchases.guest_name,
      })
      .from(purchases)
      .where(eq(purchases.item_id, data.item_id));

    const isDuplicate = existing.some((p) =>
      actorUserId
        ? p.user_id === actorUserId
        : !!guestName && p.guest_name === guestName
    );
    if (isDuplicate) {
      return {
        success: false,
        message: 'You have already claimed this item',
        error: 'Duplicate claim',
      };
    }

    if (
      item.quantity_limit !== null &&
      existing.length >= item.quantity_limit
    ) {
      return {
        success: false,
        message: 'This item is fully claimed',
        error: 'Fully claimed',
      };
    }

    try {
      await db.insert(purchases).values({
        id: nanoid(),
        item_id: data.item_id,
        user_id: actorUserId,
        guest_name: guestName,
        purchased_at: new Date(),
      });
    } catch (insertError) {
      // Partial unique index trip (purchases_item_user_unique_idx): a
      // duplicate claim by the same authenticated user slipped past the
      // in-app check because two requests raced against distinct DB
      // sessions. The capacity-race for guest claims / different users on a
      // limited item is not closed at the DB layer (neon-http driver does
      // not support interactive transactions, so SELECT … FOR UPDATE is not
      // available). Accepted as a known limitation.
      const code = (insertError as { code?: string } | null)?.code;
      if (code === PG_UNIQUE_VIOLATION) {
        return {
          success: false,
          message: 'You have already claimed this item',
          error: 'Duplicate claim',
        };
      }
      throw insertError;
    }

    updateTag('items');

    return { success: true, message: 'Item marked as purchased successfully' };
  } catch (error) {
    console.error('Error creating purchase:', error);
    return {
      success: false,
      message: 'An error occurred while marking the item as purchased',
      error: 'Failed to create purchase',
    };
  }
}

type RemovePurchaseInput =
  | { purchase_id: string; guest_name?: string | null }
  | { item_id: string; guest_name?: string | null };

export async function removePurchase(
  data: RemovePurchaseInput
): Promise<ActionResponse> {
  try {
    const session = await auth();
    let actorUserId: string | null = null;
    if (session?.user?.email) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { id: true },
      });
      actorUserId = user?.id ?? null;
    }

    if ('purchase_id' in data && data.purchase_id) {
      const row = await db.query.purchases.findFirst({
        where: eq(purchases.id, data.purchase_id),
        columns: { id: true, user_id: true, guest_name: true },
      });
      if (!row) {
        return {
          success: false,
          message: 'Claim not found',
          error: 'Not found',
        };
      }

      if (actorUserId) {
        if (row.user_id !== actorUserId) {
          return {
            success: false,
            message: 'Not your claim',
            error: 'Not your claim',
          };
        }
      } else {
        // Guest path: row must be a guest row AND the supplied guest_name must
        // match. Without this, any guest who knew a purchase id could revoke it.
        if (row.user_id !== null) {
          return {
            success: false,
            message: 'Not your claim',
            error: 'Not your claim',
          };
        }
        const supplied = data.guest_name?.trim() ?? '';
        if (!supplied || row.guest_name !== supplied) {
          return {
            success: false,
            message: 'Not your claim',
            error: 'Not your claim',
          };
        }
      }

      await db.delete(purchases).where(eq(purchases.id, row.id));
      updateTag('items');
      return {
        success: true,
        message: 'Item marked as not purchased successfully',
      };
    }

    // Legacy item-scoped path: only authenticated callers are permitted.
    // Guests must use the purchase_id shape (see spec).
    if (!('item_id' in data) || !data.item_id) {
      return {
        success: false,
        message: 'Cannot identify which claim to remove',
        error: 'Missing identity',
      };
    }
    if (!actorUserId) {
      return {
        success: false,
        message: 'Cannot identify which claim to remove',
        error: 'Missing identity',
      };
    }

    await db
      .delete(purchases)
      .where(
        and(
          eq(purchases.item_id, data.item_id),
          eq(purchases.user_id, actorUserId)
        )
      );

    updateTag('items');

    return {
      success: true,
      message: 'Item marked as not purchased successfully',
    };
  } catch (error) {
    console.error('Error removing purchase:', error);
    return {
      success: false,
      message: 'An error occurred while removing the purchase',
      error: 'Failed to remove purchase',
    };
  }
}

export async function createItem(data: ItemDetails): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return {
        success: false,
        message: 'Unauthorized access',
        error: 'Unauthorized',
      };
    }

    const sessionUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (!sessionUser) {
      return {
        success: false,
        message: 'User not found',
        error: 'Unauthorized',
      };
    }

    const validationResult = ItemSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      console.error('Validation errors:', errors);
      return {
        success: false,
        message: 'Validation failed',
        errors: errors.fieldErrors,
      };
    }

    const id = nanoid();
    const validatedData = validationResult.data;
    await db.insert(items).values({
      id,
      name: validatedData.name,
      description: validatedData.description || '',
      image_url: validatedData.image_url,
      created_at: new Date(),
      updated_at: new Date(),
      user_id: sessionUser.id,
      quantity_limit: validatedData.quantity_limit,
    });

    // Get the lists from the form data and ensure they exist
    const lists = validatedData.lists || [];
    if (lists.length > 0) {
      // Extract just the IDs from the NameId objects
      const listIds: string[] = lists.map((list) => list.value);
      // Only proceed if we have valid list IDs
      if (listIds.length > 0) {
        await updateItemLists(listIds, id);
      }
    }
    await updateItemStores(
      (validatedData.stores || []).map((store) => ({
        name: store.name || '',
        link: store.link || '',
        price: store.price || '',
      })),
      id
    );

    updateTag('items');

    return { success: true, message: 'Item created successfully' };
  } catch (error) {
    console.error('Error creating item:', error);
    return {
      success: false,
      message: 'An error occurred while creating the item',
      error: 'Failed to create item',
    };
  }
}

function emptyStore(store: { name: string; link: string; price: string }) {
  return store.name === '' && store.link === '' && store.price === '';
}

async function updateItemStores(
  stores: { name: string; link: string; price: string }[],
  itemId: string
): Promise<void> {
  try {
    // First, get all current store associations for this item
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
    // First, get all current list associations for this item
    const currentAssociations = await db
      .select({ list_id: list_items.list_id })
      .from(list_items)
      .where(eq(list_items.item_id, itemId));

    // Convert to set for efficient lookups
    const currentListIds = new Set(currentAssociations.map((a) => a.list_id));
    const selectedListIds = new Set(listIds);

    // Insert new associations
    if (listIds && listIds.length > 0) {
      await Promise.all(
        listIds.map(async (listId) => {
          // Skip if already exists
          if (currentListIds.has(listId)) return;

          // Get the maximum position for the list and add 65536 for the new item
          const result = await db
            .select({
              coalesce: sql<number>`COALESCE(MAX(${list_items.position}) + 65536, 65536)`,
            })
            .from(list_items)
            .where(eq(list_items.list_id, listId))
            .limit(1)
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
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to update item lists.');
  }
}

export async function updateItem(data: ItemDetails): Promise<ActionResponse> {
  try {
    // Security check - ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        message: 'Unauthorized access',
        error: 'Unauthorized',
      };
    }

    // Allow partial validation for updates
    const UpdateItemSchema = ItemSchema.partial();
    const validationResult = UpdateItemSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    // Type safe update object with validated data
    const validatedData = validationResult.data;
    const updateData: Record<string, unknown> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.image_url !== undefined)
      updateData.image_url = validatedData.image_url;
    if (validatedData.quantity_limit !== undefined)
      updateData.quantity_limit = validatedData.quantity_limit;

    // Update item
    await db.update(items).set(updateData).where(eq(items.id, data.id));

    // Call updateItemLists even with empty array to properly remove all associations
    const lists = validatedData.lists || [];
    const listIds = lists.map((list) => list.value);
    await updateItemLists(listIds, data.id);

    await updateItemStores(
      (validatedData.stores || []).map((store) => ({
        name: store.name || '',
        link: store.link || '',
        price: store.price || '',
      })),
      data.id
    );

    updateTag('items');

    return { success: true, message: 'Item updated successfully' };
  } catch (error) {
    console.error('Error updating item:', error);
    return {
      success: false,
      message: 'An error occurred while updating the item',
      error: 'Failed to update item',
    };
  }
}

export async function archiveItem(
  item_id: string,
  archived: boolean
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

    const sessionUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (!sessionUser) {
      return {
        success: false,
        message: 'User not found',
        error: 'Unauthorized',
      };
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, item_id),
      columns: { user_id: true },
    });
    if (!item || item.user_id !== sessionUser.id) {
      return {
        success: false,
        message: 'Unauthorized - item does not belong to you',
        error: 'Forbidden',
      };
    }

    await db
      .update(items)
      .set({ archived_at: archived ? new Date() : null })
      .where(eq(items.id, item_id));

    updateTag('items');

    return {
      success: true,
      message: archived ? 'Item archived' : 'Item unarchived',
    };
  } catch (error) {
    console.error('Error archiving item:', error);
    return {
      success: false,
      message: 'An error occurred while archiving the item',
      error: 'Failed to archive item',
    };
  }
}

export async function deleteItem(id: string, userId: string) {
  try {
    // Security check - ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    // Verify item ownership
    const item = await db.query.items.findFirst({
      where: eq(items.id, id),
      columns: { user_id: true },
    });

    if (!item || item.user_id !== userId) {
      throw new Error('Unauthorized - Item does not belong to you');
    }

    // Delete item
    await db.delete(items).where(eq(items.id, id));

    updateTag('items');

    return { success: true, message: 'Item deleted successfully' };
  } catch (error) {
    console.error('Error deleting item:', error);
    return {
      success: false,
      message: 'An error occurred while deleting the item',
      error: 'Failed to delete item',
    };
  }
}
