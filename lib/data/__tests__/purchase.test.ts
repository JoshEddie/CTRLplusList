import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

import { seedItem, seedPurchase, type TestDb } from './test-helpers';

mockNextCache();

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let dal: typeof import('@/lib/data/purchase');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/data/purchase');
});

beforeEach(async () => {
  // db is shared per-file, so restore spies first or they leak between tests.
  vi.restoreAllMocks();
  await resetDb(db);
});

describe('getItemsByPurchased', () => {
  it('NoUserId_ReturnsEmptyArray', async () => {
    expect(await dal.getItemsByPurchased()).toEqual([]);
  });

  it('PurchasedItems_OrderedByPurchasedAtDesc', async () => {
    await seedUsers(db, [{ id: 'buyer' }, { id: 'owner' }]);
    await seedItem(db, { id: 'early', user_id: 'owner' });
    await seedItem(db, { id: 'late', user_id: 'owner' });
    await seedPurchase(db, {
      id: 'pe',
      item_id: 'early',
      user_id: 'buyer',
      purchased_at: new Date('2021-01-01'),
    });
    await seedPurchase(db, {
      id: 'pl',
      item_id: 'late',
      user_id: 'buyer',
      purchased_at: new Date('2022-01-01'),
    });

    const rows = await dal.getItemsByPurchased('buyer');
    expect(rows.map((r) => r.id)).toEqual(['late', 'early']);
  });

  it('NonOwnerView_TagsViewersOwnPurchaseSelf-OthersOther', async () => {
    await seedUsers(db, [
      { id: 'buyer', name: 'Bea' },
      { id: 'owner' },
      { id: 'other', name: 'Otto' },
    ]);
    await seedItem(db, { id: 'shared', user_id: 'owner', quantity_limit: 2 });
    await seedPurchase(db, { id: 'mine', item_id: 'shared', user_id: 'buyer' });
    await seedPurchase(db, {
      id: 'theirs',
      item_id: 'shared',
      user_id: 'other',
    });

    const rows = await dal.getItemsByPurchased('buyer');
    const byId = Object.fromEntries(rows[0].purchases.map((p) => [p.id, p]));
    expect(byId.mine).toEqual({ id: 'mine', by: 'self', firstName: 'Bea' });
    expect(byId.theirs).toEqual({
      id: 'theirs',
      by: 'other',
      firstName: 'Otto',
    });
  });

  it('QueryThrows_RejectsWithRawError', async () => {
    vi.spyOn(db.query.purchases, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getItemsByPurchased('buyer')).rejects.toThrow('boom');
  });
});
