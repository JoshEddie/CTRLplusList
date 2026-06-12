'use server';

import { db } from '@/db';
import { lists } from '@/db/schema';
import {
  UNAUTHORIZED_RESPONSE,
  authedUserId,
} from '@/lib/data/user.session';
import { type ActionResponse } from '@/lib/types';
import {
  VISIBILITY,
  VISIBILITY_VALUES,
  fromDb,
  type ListVisibility,
} from '@/lib/visibility';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { updateTag } from 'next/cache';
import { z } from 'zod';

// Define Zod schema for list validation. The actor's user_id is resolved
// server-side from the session, never accepted from the client payload — see
// openspec/specs/server-endpoint-authorization.
const ListSchema = z.object({
  name: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),

  subtitle: z
    .string()
    .max(120, 'Subtitle must be less than 120 characters')
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v)),

  occasion: z.string().optional().nullable(),

  date: z.date(),
});

export type ListData = z.infer<typeof ListSchema>;

export async function createList(data: ListData): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }

    const validationResult = ListSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const id = nanoid();
    const validatedData = validationResult.data;
    await db.insert(lists).values({
      id,
      name: sql`${validatedData.name}`,
      subtitle: validatedData.subtitle ?? null,
      occasion: sql`${validatedData.occasion}`,
      date: validatedData.date,
      user_id: userId,
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
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }

    const list = await db.query.lists.findFirst({
      where: eq(lists.id, id),
      columns: {
        user_id: true,
        name: true,
        subtitle: true,
        occasion: true,
        date: true,
      },
    });
    if (!list) {
      return { success: false, message: 'List not found', error: 'Not found' };
    }
    if (list.user_id !== userId) {
      return {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Unauthorized',
      };
    }

    const UpdateListSchema = ListSchema.partial();
    const validationResult = UpdateListSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const validatedData = validationResult.data;
    const updateData: Record<string, unknown> = {};

    if (validatedData.name !== undefined && validatedData.name !== list.name)
      updateData.name = validatedData.name;
    if (
      validatedData.subtitle !== undefined &&
      validatedData.subtitle !== list.subtitle
    )
      updateData.subtitle = validatedData.subtitle;
    if (
      validatedData.occasion !== undefined &&
      validatedData.occasion !== list.occasion
    )
      updateData.occasion = validatedData.occasion;
    if (
      validatedData.date !== undefined &&
      validatedData.date.getTime() !== list.date.getTime()
    )
      updateData.date = validatedData.date;

    // updated_at advances only on a real change (list-update-recency): a
    // payload matching the stored row issues no UPDATE at all.
    if (Object.keys(updateData).length === 0) {
      return {
        success: true,
        message: 'List updated successfully',
        id,
      };
    }
    updateData.updated_at = new Date();

    const result = await db
      .update(lists)
      .set(updateData)
      .where(eq(lists.id, id))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        message: 'List not found',
        error: 'Not found',
      };
    }

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
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }

    const list = await db.query.lists.findFirst({
      where: eq(lists.id, id),
      columns: { user_id: true },
    });
    if (!list) {
      return { success: false, message: 'List not found', error: 'Not found' };
    }
    if (list.user_id !== userId) {
      return {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Unauthorized',
      };
    }

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

const VisibilitySchema = z.enum(VISIBILITY_VALUES);

export async function setListVisibility(
  id: string,
  visibility: ListVisibility
): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return UNAUTHORIZED_RESPONSE;
    }

    const parsed = VisibilitySchema.safeParse(visibility);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid visibility value',
        error: 'Validation',
      };
    }

    const list = await db.query.lists.findFirst({
      where: eq(lists.id, id),
      columns: { user_id: true, visibility: true },
    });
    if (!list) {
      return { success: false, message: 'List not found', error: 'Not found' };
    }
    if (list.user_id !== userId) {
      return {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Forbidden',
      };
    }

    const next = parsed.data;
    const wasPrivate = fromDb(list.visibility) === VISIBILITY.OWNER;
    const goingPrivate = next === VISIBILITY.OWNER;
    // shared_at: set on first private → non-private transition; clear on transition
    // back to private; preserve on unlisted ↔ public. See design Decision 3.
    const sharedAtUpdate: { shared_at?: Date | null } = goingPrivate
      ? { shared_at: null }
      : wasPrivate
        ? { shared_at: new Date() }
        : {};

    // Dual-write the legacy `shared` boolean for main-branch compatibility during
    // the soak window (see design Decision 4b).
    await db
      .update(lists)
      .set({
        visibility: next,
        shared: next !== VISIBILITY.OWNER,
        ...sharedAtUpdate,
      })
      .where(eq(lists.id, id));

    updateTag('lists');

    return { success: true, message: 'Visibility updated' };
  } catch (error) {
    console.error('Error updating list visibility:', error);
    return {
      success: false,
      message: 'An error occurred while updating visibility',
      error: 'Failed to update visibility',
    };
  }
}
