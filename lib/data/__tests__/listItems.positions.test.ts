import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { list_items } from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

import { seedItem, seedList, seedListItem, type TestDb } from './test-helpers';

mockNextCache();

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

const OWNER = { id: 'owner', email: 'owner@test.local' };

let db: TestDb;
let positions: typeof import('@/lib/data/listItems.positions');

async function seedListWith(rows: Record<string, number>) {
  await seedList(db, { id: 'L', user_id: OWNER.id });
  for (const [itemId, position] of Object.entries(rows)) {
    await seedItem(db, { id: itemId, user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: itemId, position });
  }
}

const positionsOf = async () =>
  Object.fromEntries(
    (await db.select().from(list_items).where(eq(list_items.list_id, 'L'))).map(
      (row) => [row.item_id, row.position]
    )
  );

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  positions = await import('@/lib/data/listItems.positions');
});

beforeEach(async () => {
  await resetDb(db);
  await seedUsers(db, [OWNER]);
});

describe('reorderPosition', () => {
  beforeEach(() => seedListWith({ A: 65536, B: 131072, C: 196608 }));

  it('MoveDown_ReturnsFloorMidpointBetweenTargetAndItsLowerNeighbour', async () => {
    expect(await positions.reorderPosition('L', 196608, 131072)).toBe(
      Math.floor((65536 + 131072) / 2)
    );
  });

  it('MoveUp_ReturnsFloorMidpointBetweenTargetAndItsHigherNeighbour', async () => {
    expect(await positions.reorderPosition('L', 65536, 131072)).toBe(
      Math.floor((196608 + 131072) / 2)
    );
  });

  it('MoveToFront_ReturnsHalfTheTargetPosition', async () => {
    expect(await positions.reorderPosition('L', 196608, 65536)).toBe(
      Math.floor(65536 / 2)
    );
  });

  it('MoveToBack_ReturnsTargetPlusOneStride', async () => {
    expect(await positions.reorderPosition('L', 65536, 196608)).toBe(
      196608 + 65536
    );
  });
});

describe('checkListBalance', () => {
  it('TopTwoRowsTied_ReportsExhausted', async () => {
    await seedListWith({ A: 131072, B: 131072, C: 65536 });
    expect(await positions.checkListBalance('L')).toBe(true);
  });

  it('TopTwoRowsApart_ReportsBalanced', async () => {
    await seedListWith({ A: 65536, B: 131072 });
    expect(await positions.checkListBalance('L')).toBe(false);
  });

  it('FewerThanTwoRows_ReportsBalanced', async () => {
    await seedListWith({ A: 65536 });
    expect(await positions.checkListBalance('L')).toBe(false);
  });
});

describe('rebalanceList', () => {
  it('CrowdedPositions_RewrittenAsStrideMultiplesInTheSameOrder', async () => {
    await seedListWith({ C: 3, A: 1, B: 2 });
    await positions.rebalanceList('L');
    expect(await positionsOf()).toEqual({ A: 65536, B: 131072, C: 196608 });
  });
});
