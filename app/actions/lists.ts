'use server';

import { db } from '@/db';
import { list_items, list_visits, lists, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { updateTag } from 'next/cache';
import { z } from 'zod';
import {
  VISIBILITY,
  VISIBILITY_VALUES,
  fromDb,
  type ListVisibility,
} from '@/lib/visibility';
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

export type ActionResponse = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  error?: string;
  id?: string;
};

export async function createList(data: ListData): Promise<ActionResponse> {
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
      date: sql`${validatedData.date}`,
      user_id: sessionUser.id,
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
      return { success: false, message: 'List not found', error: 'Not found' };
    }
    if (list.user_id !== sessionUser.id) {
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

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.subtitle !== undefined)
      updateData.subtitle = validatedData.subtitle;
    if (validatedData.occasion !== undefined)
      updateData.occasion = validatedData.occasion;
    if (validatedData.date !== undefined) updateData.date = validatedData.date;

    const result = await db
      .update(lists)
      .set(updateData)
      .where(eq(lists.id, id))
      .returning();

    /* v8 ignore next 7 -- unreachable: the row was confirmed to exist by the ownership check above, so .returning() always yields it */
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
      return { success: false, message: 'List not found', error: 'Not found' };
    }
    if (list.user_id !== sessionUser.id) {
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
    const session = await auth();
    if (!session?.user?.email) {
      return {
        success: false,
        message: 'Unauthorized access',
        error: 'Unauthorized',
      };
    }

    const parsed = VisibilitySchema.safeParse(visibility);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Invalid visibility value',
        error: 'Validation',
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
      columns: { user_id: true, visibility: true },
    });
    if (!list) {
      return { success: false, message: 'List not found', error: 'Not found' };
    }
    if (list.user_id !== sessionUser.id) {
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

// --- Visit history + bookmarks ---

async function authedUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const u = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: { id: true },
  });
  return u?.id ?? null;
}

export async function bookmarkList(list_id: string): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }

    const list = await db.query.lists.findFirst({
      where: eq(lists.id, list_id),
      columns: { user_id: true, visibility: true },
    });
    if (
      !list ||
      (list.user_id !== userId && fromDb(list.visibility) === VISIBILITY.OWNER)
    ) {
      return {
        success: false,
        message: 'List not viewable',
        error: 'List not viewable',
      };
    }

    const now = new Date();
    await db
      .insert(list_visits)
      .values({
        user_id: userId,
        list_id,
        last_visited_at: now,
        visit_count: 1,
        favorited_at: now,
      })
      .onConflictDoUpdate({
        target: [list_visits.user_id, list_visits.list_id],
        set: { favorited_at: now },
      });

    updateTag('list_visits');
    return { success: true, message: 'Bookmarked' };
  } catch (error) {
    console.error('Error bookmarking list:', error);
    return { success: false, message: 'Failed to bookmark', error: 'Failed' };
  }
}

export async function unbookmarkList(list_id: string): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }

    await db
      .update(list_visits)
      .set({ favorited_at: null })
      .where(
        and(eq(list_visits.user_id, userId), eq(list_visits.list_id, list_id))
      );

    updateTag('list_visits');
    return { success: true, message: 'Bookmark removed' };
  } catch (error) {
    console.error('Error unbookmarking list:', error);
    return { success: false, message: 'Failed to unbookmark', error: 'Failed' };
  }
}

export async function clearVisitHistory(opts: {
  includeBookmarked: boolean;
}): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }

    if (opts.includeBookmarked) {
      await db.delete(list_visits).where(eq(list_visits.user_id, userId));
    } else {
      // Drop non-bookmarked rows outright; for bookmarked rows, null
      // last_visited_at so the bookmark survives but the row leaves history.
      await db
        .delete(list_visits)
        .where(
          and(eq(list_visits.user_id, userId), isNull(list_visits.favorited_at))
        );
      await db
        .update(list_visits)
        .set({ last_visited_at: null })
        .where(
          and(
            eq(list_visits.user_id, userId),
            isNotNull(list_visits.favorited_at)
          )
        );
    }

    updateTag('list_visits');
    return { success: true, message: 'History cleared' };
  } catch (error) {
    console.error('Error clearing history:', error);
    return {
      success: false,
      message: 'Failed to clear history',
      error: 'Failed',
    };
  }
}

export async function removeVisit(list_id: string): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return { success: false, message: 'Unauthorized', error: 'Unauthorized' };
    }

    // If the row is bookmarked, clear last_visited_at so it leaves the history
    // view but the bookmark survives. Otherwise delete the row outright.
    const row = await db.query.list_visits.findFirst({
      where: and(
        eq(list_visits.user_id, userId),
        eq(list_visits.list_id, list_id)
      ),
      columns: { favorited_at: true },
    });
    if (!row) return { success: true, message: 'No history row' };

    if (row.favorited_at) {
      await db
        .update(list_visits)
        .set({ last_visited_at: null })
        .where(
          and(eq(list_visits.user_id, userId), eq(list_visits.list_id, list_id))
        );
    } else {
      await db
        .delete(list_visits)
        .where(
          and(eq(list_visits.user_id, userId), eq(list_visits.list_id, list_id))
        );
    }

    updateTag('list_visits');
    return { success: true, message: 'Removed from history' };
  } catch (error) {
    console.error('Error removing visit:', error);
    return { success: false, message: 'Failed to remove', error: 'Failed' };
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
      /* v8 ignore next -- the COALESCE in the query guarantees a row with a numeric base, so the ?. and ?? 65536 fallbacks are unreachable */
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

    /* v8 ignore next -- updatePriority requires a distinct item and target, so the list always has ≥2 rows when this runs */
    if (result.length < 2) return false;

    const [first, second] = result;
    const minGap = 0.001;
    return first.position - second.position < minGap;
    /* v8 ignore start -- infra db-error rethrow; not triggerable from userspace without a DB failure */
  } catch (error) {
    console.error('Error checking list balance:', error);
    throw error;
  }
  /* v8 ignore stop */
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
    /* v8 ignore start -- infra db-error rethrow; not triggerable from userspace without a DB failure */
  } catch (error) {
    console.error('Error rebalancing list:', error);
    throw error;
  }
  /* v8 ignore stop */
}

// Integer fractional-index position for a moved item: the midpoint between the
// target and its neighbour on the side the item is travelling from, or the
// edge cases when the target has no neighbour on that side.
async function reorderPosition(
  listId: string,
  itemPosition: number,
  targetPosition: number
): Promise<number> {
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
    return result.length > 0
      ? Math.floor((result[0].position + targetPosition) / 2)
      : Math.floor(targetPosition / 2);
  }

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
  return result.length > 0
    ? Math.floor((result[0].position + targetPosition) / 2)
    : targetPosition + 65536;
}

export async function updatePriority(
  item_id: string,
  target_id: string,
  listId: string
): Promise<ActionResponse> {
  try {
    const userId = await authedUserId();
    if (!userId) {
      return {
        success: false,
        message: 'Unauthorized',
        error: 'Unauthorized',
      };
    }
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
      columns: { user_id: true },
    });
    if (!list || list.user_id !== userId) {
      return {
        success: false,
        message: 'Unauthorized - list does not belong to you',
        error: 'Unauthorized',
      };
    }

    // Get the positions before and after target position

    const itemPositionResult = await db
      .select({ position: list_items.position })
      .from(list_items)
      .where(
        and(eq(list_items.list_id, listId), eq(list_items.item_id, item_id))
      )
      .limit(1);

    const targetPositionResult = await db
      .select({ position: list_items.position })
      .from(list_items)
      .where(
        and(eq(list_items.list_id, listId), eq(list_items.item_id, target_id))
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

    const new_position = await reorderPosition(
      listId,
      itemPosition,
      targetPosition
    );

    /* v8 ignore next -- new_position is always strictly between the target and a neighbour, so it never equals itemPosition once itemPosition !== targetPosition (guarded above) */
    if (new_position !== itemPosition) {
      await db
        .update(list_items)
        .set({ position: new_position })
        .where(
          and(eq(list_items.list_id, listId), eq(list_items.item_id, item_id))
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
