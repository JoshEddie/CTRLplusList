'use server';

import { db } from '@/db';
import { list_items, lists, saved_lists, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { and, asc, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { updateTag } from 'next/cache';
import { z } from 'zod';
// Define Zod schema for list validation
const ListSchema = z.object({
  name: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),

  occasion: z.string().optional().nullable(),

  date: z.date(),

  user_id: z.string().min(1, 'User ID is required'),
});

export type ListData = z.infer<typeof ListSchema>;

export type ActionResponse = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  error?: string;
  id?: string;
};

export async function createList(data: ListData): Promise<ActionResponse> {
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

    // Validate with Zod
    const validationResult = ListSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const id = nanoid();

    // Create list with validated data
    const validatedData = validationResult.data;
    await db.insert(lists).values({
      id,
      name: sql`${validatedData.name}`,
      occasion: sql`${validatedData.occasion}`,
      date: sql`${validatedData.date}`,
      user_id: sql`${validatedData.user_id}`,
    });

    updateTag('lists');

    return {
      success: true,
      message: 'List created successfully',
      id: id,
    };
  } catch (error) {
    console.error('Error creating list:', error);
    return {
      success: false,
      message: 'An error occurred while creating the list',
      error: 'Failed to create list',
    };
  }
}

export async function updateList(
  id: string,
  data: Partial<ListData>
): Promise<ActionResponse> {
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
    const UpdateListSchema = ListSchema.partial();
    const validationResult = UpdateListSchema.safeParse(data);

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
    if (validatedData.occasion !== undefined)
      updateData.occasion = validatedData.occasion;
    if (validatedData.date !== undefined) updateData.date = validatedData.date;

    // Update list
    const result = await db
      .update(lists)
      .set(updateData)
      .where(eq(lists.id, id))
      .returning();

    updateTag('lists');

    return {
      success: true,
      message: 'List updated successfully',
      id: result[0].id,
    };
  } catch (error) {
    console.error('Error updating list:', error);
    return {
      success: false,
      message: 'An error occurred while updating the list',
      error: 'Failed to update list',
    };
  }
}

export async function deleteList(id: string): Promise<ActionResponse> {
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

    // Delete list
    await db.delete(lists).where(eq(lists.id, id));

    updateTag('lists');

    return { success: true, message: 'List deleted successfully' };
  } catch (error) {
    console.error('Error deleting list:', error);
    return {
      success: false,
      message: 'An error occurred while deleting the list',
      error: 'Failed to delete list',
    };
  }
}

export async function toggleShareList(
  id: string,
  shared: boolean
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

    const list = await db.query.lists.findFirst({
      where: eq(lists.id, id),
      columns: { user_id: true },
    });
    if (!list) {
      return {
        success: false,
        message: 'List not found',
        error: 'Not found',
      };
    }
    if (list.user_id !== sessionUser.id) {
      return {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Forbidden',
      };
    }

    await db.update(lists).set({ shared: shared }).where(eq(lists.id, id));

    updateTag('lists');

    return { success: true, message: 'List shared successfully' };
  } catch (error) {
    console.error('Error sharing list:', error);
    return {
      success: false,
      message: 'An error occurred while sharing the list',
      error: 'Failed to share list',
    };
  }
}

export async function saveList(
  list_id: string,
  user_id: string
): Promise<ActionResponse> {
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

    // Save list
    await db.insert(saved_lists).values({ id: nanoid(), list_id, user_id });

    updateTag('saved_lists');

    return { success: true, message: 'List saved successfully' };
  } catch (error) {
    console.error('Error saving list:', error);
    return {
      success: false,
      message: 'An error occurred while saving the list',
      error: 'Failed to save list',
    };
  }
}

export async function unsaveList(
  list_id: string,
  user_id: string
): Promise<ActionResponse> {
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

    // Unsave list
    await db
      .delete(saved_lists)
      .where(
        and(eq(saved_lists.list_id, list_id), eq(saved_lists.user_id, user_id))
      );

    updateTag('saved_lists');

    return { success: true, message: 'List unsaved successfully' };
  } catch (error) {
    console.error('Error unsaving list:', error);
    return {
      success: false,
      message: 'An error occurred while unsaving the list',
      error: 'Failed to unsave list',
    };
  }
}

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

export async function updatePriority(
  item_id: string,
  target_id: string,
  listId: string
): Promise<ActionResponse> {
  try {
    // Get the positions before and after target position

    const itemPositionResult = await db
      .select({ position: list_items.position })
      .from(list_items)
      .where(
        and(
          eq(list_items.list_id, listId),
          eq(list_items.item_id, item_id)
        )
      )
      .limit(1);

    const targetPositionResult = await db
      .select({ position: list_items.position })
      .from(list_items)
      .where(
        and(
          eq(list_items.list_id, listId),
          eq(list_items.item_id, target_id)
        )
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

    let new_position;

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

      if (result.length > 0) {
        const otherBoundary = result[0].position;
        new_position = Math.floor((otherBoundary + targetPosition) / 2);
      } else {
        new_position = Math.floor(targetPosition / 2);
      }
    } else {
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

      if (result.length > 0) {
        const otherBoundary = result[0].position;
        new_position = Math.floor((otherBoundary + targetPosition) / 2);
      } else {
        new_position = targetPosition + 65536;
      }
    }

    if (new_position !== undefined && new_position !== itemPosition) {
      await db
        .update(list_items)
        .set({ position: new_position })
        .where(
          and(
            eq(list_items.list_id, listId),
            eq(list_items.item_id, item_id)
          )
        );
    }

    updateTag('items');

    // Check and rebalance if needed
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
