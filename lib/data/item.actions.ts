'use server';

import { db } from '@/db';
import { items, list_items, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { updateItemLists, updateItemStores } from '@/lib/data/item.associations';
import { touchLists } from '@/lib/data/list.touch';
import { ItemSchema } from '@/lib/data/item.schema';
import { type ActionResponse, ItemDetails } from '@/lib/types';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { updateTag } from 'next/cache';

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

    const lists = validatedData.lists || [];
    if (lists.length > 0) {
      const listIds: string[] = lists.map((list) => list.value);
      await updateItemLists(listIds, id);
    }
    await updateItemStores(
      (validatedData.stores || []).map((store) => ({
        name: store.name || '',
        link: store.link || '',
        price: store.price || '',
        price_fetched_at: store.price_fetched_at ?? null,
        canonical_url: store.canonical_url ?? null,
        currency: store.currency ?? null,
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

export async function updateItem(data: ItemDetails): Promise<ActionResponse> {
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

    const existing = await db.query.items.findFirst({
      where: eq(items.id, data.id),
      columns: { user_id: true },
    });
    if (!existing || existing.user_id !== sessionUser.id) {
      return {
        success: false,
        message: 'Unauthorized - item does not belong to you',
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

    const validatedData = validationResult.data;
    const updateData: Record<string, unknown> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.image_url !== undefined)
      updateData.image_url = validatedData.image_url;
    if (validatedData.quantity_limit !== undefined)
      updateData.quantity_limit = validatedData.quantity_limit;

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
        price_fetched_at: store.price_fetched_at ?? null,
        canonical_url: store.canonical_url ?? null,
        currency: store.currency ?? null,
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

export async function deleteItem(id: string) {
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

    // Verify item ownership
    const item = await db.query.items.findFirst({
      where: eq(items.id, id),
      columns: { user_id: true },
    });

    if (!item || item.user_id !== sessionUser.id) {
      throw new Error('Unauthorized - Item does not belong to you');
    }

    // The delete cascades through list_items, removing the item from its
    // lists — capture the memberships first so those lists' update recency
    // can be advanced afterwards (list-update-recency).
    const memberships = await db
      .select({ list_id: list_items.list_id })
      .from(list_items)
      .where(eq(list_items.item_id, id));

    await db.delete(items).where(eq(items.id, id));

    const affectedListIds = memberships.map((m) => m.list_id);
    if (affectedListIds.length > 0) {
      await touchLists(affectedListIds);
      updateTag('lists');
    }

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
