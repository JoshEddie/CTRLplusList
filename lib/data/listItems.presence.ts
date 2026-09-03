import { db } from '@/db';
import { list_items, purchases } from '@/db/schema';
import { and, eq, inArray, notExists, sql } from 'drizzle-orm';

// The spacing sparse fractional indexing hands out (ADR-0010).
const POSITION_STEP = 65536;

// "This entry is on this list" as every read must ask it. One home, because a
// read that forgets the flag does not fail — it leaks a ghost to somebody the
// owner meant not to see it.
export const SHOWN_ENTRY = eq(list_items.shown, true);

// The diff a membership surface implies. What the surface SHOWS is the before,
// so a soft-removed entry counts as absent: re-selecting its item is an
// addition, which `attachEntries` answers by restoring the entry.
export function presenceDiff(
  shownIds: string[],
  selectedIds: string[]
): { attach: string[]; detach: string[] } {
  const shown = new Set(shownIds);
  const selected = new Set(selectedIds);
  return {
    attach: [...selected].filter((id) => !shown.has(id)),
    detach: [...shown].filter((id) => !selected.has(id)),
  };
}

// One past the last position on the list, or the first slot on an empty one.
async function nextPositionBase(listId: string): Promise<number> {
  const [row] = await db
    .select({
      base: sql<number>`COALESCE(MAX(${list_items.position}) + ${POSITION_STEP}, ${POSITION_STEP})`,
    })
    .from(list_items)
    .where(eq(list_items.list_id, listId))
    .limit(1);
  /* v8 ignore next -- the COALESCE in the query guarantees a row with a numeric base, so the ?. and ?? fallbacks are unreachable */
  return Math.floor(row?.base ?? POSITION_STEP);
}

// Puts items on a list at its end, restoring any that were soft-removed. One
// upsert covers both: a fresh entry is inserted, a ghost has its `shown` flag
// and its position rewritten. Restoring lands at the END rather than where the
// entry used to sit — no position survives a removal, so there is none to
// reconcile — and `quantity` is left out of the update, so the number the
// owner chose comes back with the entry.
//
// Callers pass only items with no VISIBLE entry; passing one would move it.
export async function attachEntries(
  listId: string,
  itemIds: string[]
): Promise<void> {
  if (itemIds.length === 0) return;
  const base = await nextPositionBase(listId);
  await db
    .insert(list_items)
    .values(
      itemIds.map((item_id, index) => ({
        list_id: listId,
        item_id,
        position: base + index * POSITION_STEP,
      }))
    )
    .onConflictDoUpdate({
      target: [list_items.list_id, list_items.item_id],
      set: { shown: true, position: sql`excluded.position` },
    });
}

// Takes items off a list, and answers with the ids it acted on so a caller can
// tell a missing entry from a removed one. Removal always succeeds; what it
// leaves behind depends on whether anyone has claimed against the entry.
//
// An unclaimed entry is deleted outright, so nothing invisible accumulates. A
// claimed one is soft-removed: the owner stops seeing it, the people holding
// claims keep it, and it admits no new ones. Cascade-deleting those claims was
// rejected — the owner acts from behind an information wall, so a routine act
// of theirs may not destroy somebody else's record.
//
// The claim test rides inside the DELETE rather than preceding it, so the
// branch is decided at statement time rather than against a count that has
// already moved (`docs/database.md`). The residual window is a claim removed
// between the two statements, which soft-removes an entry nobody holds — a
// ghost only the owner can reach, and one that re-adding the item clears.
export async function detachEntries(
  listId: string,
  itemIds: string[]
): Promise<string[]> {
  if (itemIds.length === 0) return [];

  const deleted = await db
    .delete(list_items)
    .where(
      and(
        eq(list_items.list_id, listId),
        inArray(list_items.item_id, itemIds),
        notExists(
          db
            .select({ one: sql`1` })
            .from(purchases)
            .where(
              and(
                eq(purchases.list_id, list_items.list_id),
                eq(purchases.item_id, list_items.item_id)
              )
            )
        )
      )
    )
    .returning({ item_id: list_items.item_id });

  const hardRemoved = deleted.map((row) => row.item_id);
  const claimed = itemIds.filter((id) => !hardRemoved.includes(id));
  if (claimed.length === 0) return hardRemoved;

  // Unconditional on `shown`: removing an already-removed entry is the same
  // request answered the same way, not a refusal that would say why.
  const softRemoved = await db
    .update(list_items)
    .set({ shown: false })
    .where(
      and(eq(list_items.list_id, listId), inArray(list_items.item_id, claimed))
    )
    .returning({ item_id: list_items.item_id });

  return [...hardRemoved, ...softRemoved.map((row) => row.item_id)];
}
