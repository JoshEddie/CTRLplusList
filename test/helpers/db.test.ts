import { getTableName } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { items, lists, list_items, purchases, users } from '../../db/schema';
import { sqlstateOf } from '../../lib/sqlstate';
import { bootPglite, resetDb, SCHEMA_TABLES } from './db';

let db: Awaited<ReturnType<typeof bootPglite>>['db'];

beforeAll(async () => {
  ({ db } = await bootPglite());
});

beforeEach(async () => {
  await resetDb(db);
});

describe('bootPglite', () => {
  it('AfterMigration_SelectUsersReturnsEmpty', async () => {
    const rows = await db.select().from(users);
    expect(rows).toEqual([]);
  });

  it('InsertedUser_RoundTripsOnSelect', async () => {
    await db.insert(users).values({ id: 'u1', name: 'Alice' });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Alice');
  });

  it('DuplicatePurchase_ViolatesPartialUniqueWith23505', async () => {
    await db.insert(users).values({ id: 'u1', name: 'Owner' });
    await db.insert(users).values({ id: 'u2', name: 'Buyer' });
    await db.insert(lists).values({
      id: 'l1',
      name: 'L',
      occasion: 'Birthday',
      user_id: 'u1',
    });
    await db
      .insert(items)
      .values({ id: 'i1', name: 'Thing', user_id: 'u1' });
    await db
      .insert(list_items)
      .values({ list_id: 'l1', item_id: 'i1', position: 0 });
    await db
      .insert(purchases)
      .values({ id: 'p1', item_id: 'i1', user_id: 'u2' });

    let caught: unknown;
    try {
      await db
        .insert(purchases)
        .values({ id: 'p2', item_id: 'i1', user_id: 'u2' });
    } catch (err) {
      caught = err;
    }
    expect(sqlstateOf(caught)).toBe('23505');
  });
});

describe('resetDb', () => {
  it('SeededAcrossTables_EveryTableEmptyAfterReset', async () => {
    await db.insert(users).values({ id: 'u1', name: 'Owner' });
    await db.insert(lists).values({
      id: 'l1',
      name: 'L',
      occasion: 'Birthday',
      user_id: 'u1',
    });
    await db.insert(items).values({ id: 'i1', name: 'Thing', user_id: 'u1' });

    await resetDb(db);

    expect(SCHEMA_TABLES.length).toBeGreaterThan(0);
    // Row count per table keyed by name, so a non-empty table names itself in
    // the failure diff (vitest/valid-expect forbids a second message arg).
    const counts: Record<string, number> = {};
    for (const table of SCHEMA_TABLES) {
      counts[getTableName(table)] = (await db.select().from(table)).length;
    }
    const expectedAllZero = Object.fromEntries(
      Object.keys(counts).map((name) => [name, 0])
    );
    expect(counts).toEqual(expectedAllZero);
  });
});
