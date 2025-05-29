'use server';

import { db } from '@/db';
import { list_items, lists, saved_lists } from '@/db/schema';
import { auth } from '@/lib/auth';
import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidateTag } from 'next/cache';
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

    revalidateTag('lists');

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

    revalidateTag('lists');

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

    revalidateTag('lists');

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
    // Security check - ensure user is authenticated
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        message: 'Unauthorized access',
        error: 'Unauthorized',
      };
    }

    // Share list
    await db.update(lists).set({ shared: shared }).where(eq(lists.id, id));

    revalidateTag('lists');

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

    revalidateTag('saved_lists');

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
    await db.delete(saved_lists).where(and(eq(saved_lists.list_id, list_id), eq(saved_lists.user_id, user_id)));

    revalidateTag('saved_lists');

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
      .where(eq(list_items.item_id, item_id))
      .orderBy(desc(list_items.position))
      .limit(1);

    const targetPositionResult = await db
      .select({ position: list_items.position })
      .from(list_items)
      .where(eq(list_items.item_id, target_id))
      .orderBy(desc(list_items.position))
      .limit(1);

    const itemPosition = itemPositionResult[0].position;
    const targetPosition = targetPositionResult[0].position;
    console.log("itemPosition: ", itemPosition);
    console.log("targetPosition: ", targetPosition);

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
            lt(list_items.position, targetPosition),
            eq(
              list_items.position,
              sql<number>`(
                SELECT MAX(position) 
                FROM ${list_items} 
                WHERE list_id = ${listId} 
                AND position < ${targetPosition}
              )`
            )
          )
        )
        .orderBy(desc(list_items.position))
        .limit(1);

      if (result.length > 0) {
        const otherBoundary = result[0].position;
        console.log("otherBoundary: ", otherBoundary);
        new_position = (otherBoundary + targetPosition) / 2;
      } else {
        new_position = targetPosition / 2;
      }
    } else {
      const result = await db
        .select({ position: list_items.position })
        .from(list_items)
        .where(
          and(
            gt(list_items.position, targetPosition),
            eq(
              list_items.position,
              sql<number>`(
                SELECT MIN(position) 
                FROM ${list_items} 
                WHERE list_id = ${listId} 
                AND position > ${targetPosition}
              )`
            )
          )
        )
        .orderBy(desc(list_items.position))
        .limit(1);

      if (result.length > 0) {
        const otherBoundary = result[0].position;
        console.log("otherBoundary: ", otherBoundary);
        new_position = (otherBoundary + targetPosition) / 2;
      } else {
        new_position = targetPosition + 65536;
      }
    }

    console.log("new_position: ", new_position);

    if (new_position) {
      await db
        .update(list_items)
        .set({ position: new_position })
        .where(eq(list_items.item_id, item_id));

    }

    revalidateTag('items');

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
