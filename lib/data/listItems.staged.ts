import { EntryQuantitySchema } from '@/lib/data/listItems.schema';
import { z } from 'zod';

export const StagedEntriesSchema = z.array(
  z.object({ item_id: z.string().min(1), quantity: EntryQuantitySchema })
);

const POSITION_STRIDE = 65536;

// The desired state arrives whole and ordered. Rows keep their positions when
// the order they already hold is the order asked for (adds trailing it), so a
// quantity-only edit or a pure add touches nothing else; any other order is
// rewritten as clean multiples of the stride, which is why edit mode's Save
// never needs the midpoint-and-rebalance path (ADR-0010).
function desiredPositions(
  existing: { item_id: string; position: number }[],
  incoming: { item_id: string }[]
): Map<string, number> {
  const existingIds = new Set(existing.map((row) => row.item_id));
  const incomingIds = new Set(incoming.map((entry) => entry.item_id));
  const survivors = existing.filter((row) => incomingIds.has(row.item_id));
  const inserts = incoming.filter((entry) => !existingIds.has(entry.item_id));
  const kept = [...survivors, ...inserts].map((entry) => entry.item_id);
  const asked = incoming.map((entry) => entry.item_id);
  if (kept.join('\n') !== asked.join('\n')) {
    return new Map(
      asked.map((item_id, index) => [item_id, (index + 1) * POSITION_STRIDE])
    );
  }
  const max = survivors.reduce((acc, row) => Math.max(acc, row.position), 0);
  return new Map([
    ...survivors.map((row) => [row.item_id, row.position] as const),
    ...inserts.map(
      (entry, index) =>
        [entry.item_id, max + (index + 1) * POSITION_STRIDE] as const
    ),
  ]);
}

type EntryRow = { item_id: string; position: number; quantity: number };

// The three write sets the desired state resolves to against what is saved.
export function stagedWrites(
  list_id: string,
  existing: EntryRow[],
  incoming: { item_id: string; quantity: number }[]
) {
  const existingById = new Map(existing.map((row) => [row.item_id, row]));
  const incomingIds = new Set(incoming.map((entry) => entry.item_id));
  const positions = desiredPositions(existing, incoming);
  const upserts = incoming
    .map((entry) => ({
      list_id,
      item_id: entry.item_id,
      quantity: entry.quantity,
      position: positions.get(entry.item_id)!,
    }))
    .filter((row) => {
      const current = existingById.get(row.item_id);
      return (
        !current ||
        current.position !== row.position ||
        current.quantity !== row.quantity
      );
    });
  return {
    toRemove: existing
      .filter((row) => !incomingIds.has(row.item_id))
      .map((row) => row.item_id),
    toInsert: upserts
      .filter((row) => !existingById.has(row.item_id))
      .map((row) => row.item_id),
    upserts,
  };
}

export function describeWrites(added: number, removed: number, updated: number) {
  const parts: string[] = [];
  if (added > 0) parts.push(`Added ${added}`);
  if (removed > 0) parts.push(`removed ${removed}`);
  if (updated > 0) parts.push(`updated ${updated}`);
  return parts.join(', ');
}
