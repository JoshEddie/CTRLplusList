import { db } from '@/db';
import { lists } from '@/db/schema';
import { inArray } from 'drizzle-orm';

// Internal write helper — advances list update recency for follower-notifiable
// changes only (see openspec/specs/list-update-recency). Deliberately NOT in a
// 'use server' module: exporting it from one would expose it as a
// client-callable endpoint.

export async function touchLists(listIds: string[]): Promise<void> {
  if (listIds.length === 0) return;
  await db
    .update(lists)
    .set({ updated_at: new Date() })
    .where(inArray(lists.id, listIds));
}
