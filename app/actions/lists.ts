'use server';

import { db } from '@/db';
import { lists } from '@/db/schema';
import { auth } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
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
    await db
      .insert(lists)
      .values({
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
