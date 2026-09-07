import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTestCookies, mockNextHeaders } from '@/test/helpers/next-headers';

import { list_items, lists } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers, selfProfileOf } from '@/test/helpers/seedFollowGraph';

import {
  contentTagCalls,
  seedItem,
  seedList,
  seedListItem,
  type TestDb,
} from './test-helpers';

mockNextCache();
mockNextHeaders();

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

// Booting a fresh pglite (full migration set) per test is the dominant per-test
// cost; doing it for every case turns the full parallel-fork suite into a boot
// storm that starves hooks and flakes unrelated tests. Instead boot once per
// file (beforeAll) and TRUNCATE + reseed between tests (beforeEach) — the same
// per-test isolation the design requires, without the storm. The generous hook
// timeout still covers the single boot under contention.
vi.setConfig({ hookTimeout: 60000 });

const OWNER = { id: 'owner', email: 'owner@test.local' };
const OTHER = { id: 'other', email: 'other@test.local' };
const GHOST_EMAIL = 'ghost@test.local';

let db: TestDb;
let actions: typeof import('@/lib/data/listItems.actions');
let updateTag: ReturnType<typeof vi.fn>;

function asOwner() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OWNER.email } } as never);
}
function asOther() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OTHER.email } } as never);
}
function asGhost() {
  vi.mocked(auth).mockResolvedValue({ user: { email: GHOST_EMAIL } } as never);
}
function noSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

const listItemRows = (listId: string) =>
  db.select().from(list_items).where(eq(list_items.list_id, listId));

const sel = (...ids: string[]) =>
  ids.map((item_id) => ({ item_id, quantity: 1 }));

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/listItems.actions');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  // Restore any per-test db spies (db is shared across tests now) and reset the
  // auth mock, then start each case from a clean, freshly seeded database.
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [OWNER, OTHER]);
  clearTestCookies();
  updateTag.mockClear();
  asOwner();
});

describe('setListItems', () => {
  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.setListItems('L', sel('I'));
    expect(res.error).toBe('Unauthorized');
  });

  it('MissingList_ReturnsNotFound', async () => {
    const res = await actions.setListItems('nope', sel('I'));
    expect(res.error).toBe('Not found');
  });

  it('NonOwner_ReturnsForbidden', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    asOther();
    const res = await actions.setListItems('L', sel('I'));
    expect(res.error).toBe('Forbidden');
  });

  it('UnknownEmail_ReturnsForbidden-NoRow', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    asGhost();
    const res = await actions.setListItems('L', sel('I'));
    expect(res.error).toBe('Forbidden');
    expect(await listItemRows('L')).toHaveLength(0);
  });

  it('EmptyItemId_ReturnsInvalidInput', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    const res = await actions.setListItems('L', sel(''));
    expect(res.error).toBe('Invalid input');
  });

  it('ForeignItemInSelection_ReturnsForbidden-NoWrite', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'MINE', user_id: OWNER.id });
    await seedItem(db, { id: 'THEIRS', user_id: OTHER.id });
    const res = await actions.setListItems('L', sel('MINE', 'THEIRS'));
    expect(res.error).toBe('Forbidden');
    expect(await listItemRows('L')).toHaveLength(0);
    expect(contentTagCalls(updateTag)).toEqual([]);
  });

  it('NonexistentItemInSelection_ReturnsForbidden-NoWrite', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'MINE', user_id: OWNER.id });
    const res = await actions.setListItems('L', sel('MINE', 'ghost'));
    expect(res.error).toBe('Forbidden');
    expect(await listItemRows('L')).toHaveLength(0);
  });

  it('ForeignItemInSelection_LeavesRemovalsUnapplied', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'THEIRS', user_id: OTHER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    const res = await actions.setListItems('L', sel('THEIRS'));
    expect(res.error).toBe('Forbidden');
    expect((await listItemRows('L')).map((r) => r.item_id)).toEqual(['A']);
  });

  it('NoChanges_ReturnsNoChanges', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
    const res = await actions.setListItems('L', sel('I'));
    expect(res.message).toBe('No changes');
  });

  it('MixedAddRemove_WritesDiff-PlacesInsertsAtMaxPlus65536-ReportsCounts-BumpsChangedItemTags', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'B', user_id: OWNER.id });
    await seedItem(db, { id: 'C', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    await seedListItem(db, { list_id: 'L', item_id: 'B', position: 131072 });

    const res = await actions.setListItems('L', sel('A', 'C'));
    expect(res.success).toBe(true);
    expect(res.message).toBe('Added 1, removed 1');

    const rows = await listItemRows('L');
    const byItem = Object.fromEntries(rows.map((r) => [r.item_id, r.position]));
    expect(byItem).toEqual({ A: 65536, C: 131072 });
    expect(updateTag).toHaveBeenCalledWith('lists:id:L');
    expect(updateTag).toHaveBeenCalledWith('list_items:list:L');
    expect(updateTag).toHaveBeenCalledWith('items:id:C');
    expect(updateTag).toHaveBeenCalledWith('items:id:B');
  });

  it('PureAdd_PlacesAtMaxPlus65536-ReportsAddedOnly', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'B', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });

    const res = await actions.setListItems('L', sel('A', 'B'));
    expect(res.success).toBe(true);
    expect(res.message).toBe('Added 1');
    const byItem = Object.fromEntries(
      (await listItemRows('L')).map((r) => [r.item_id, r.position])
    );
    expect(byItem).toEqual({ A: 65536, B: 131072 });
  });

  it('DuplicateItemIds_ReturnsInvalidInput', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    const res = await actions.setListItems('L', sel('A', 'A'));
    expect(res.error).toBe('Invalid input');
  });

  it('QuantityZero_ReturnsInvalidInput-NoWrite', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    const res = await actions.setListItems('L', [
      { item_id: 'A', quantity: 0 },
    ]);
    expect(res.error).toBe('Invalid input');
    expect(await listItemRows('L')).toHaveLength(0);
  });

  it('AddedWithQuantity_InsertsTheQuantity', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await actions.setListItems('L', [{ item_id: 'A', quantity: 4 }]);
    expect((await listItemRows('L'))[0]).toMatchObject({
      item_id: 'A',
      quantity: 4,
      position: 65536,
    });
  });

  describe('SavedOrderKept', () => {
    beforeEach(async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id });
      await seedItem(db, { id: 'A', user_id: OWNER.id });
      await seedItem(db, { id: 'B', user_id: OWNER.id });
      await seedItem(db, { id: 'C', user_id: OWNER.id });
      // Midpoint positions from earlier live drags: an unchanged order must
      // leave them exactly as they are.
      await seedListItem(db, { list_id: 'L', item_id: 'A', position: 100 });
      await seedListItem(db, { list_id: 'L', item_id: 'B', position: 150 });
    });

    it('SameOrderSameQuantities_ReturnsNoChanges-LeavesPositions', async () => {
      const res = await actions.setListItems('L', sel('A', 'B'));
      expect(res.message).toBe('No changes');
      const byItem = Object.fromEntries(
        (await listItemRows('L')).map((r) => [r.item_id, r.position])
      );
      expect(byItem).toEqual({ A: 100, B: 150 });
      expect(updateTag).not.toHaveBeenCalledWith('list_items:list:L');
    });

    it('QuantityChanged_UpdatesThatRowOnly-ReportsUpdated', async () => {
      const res = await actions.setListItems('L', [
        { item_id: 'A', quantity: 1 },
        { item_id: 'B', quantity: 3 },
      ]);
      expect(res.message).toBe('updated 1');
      const rows = (await listItemRows('L')).map(
        ({ item_id, position, quantity }) => ({ item_id, position, quantity })
      );
      expect(rows).toEqual(
        expect.arrayContaining([
          { item_id: 'A', position: 100, quantity: 1 },
          { item_id: 'B', position: 150, quantity: 3 },
        ])
      );
      expect(updateTag).toHaveBeenCalledWith('list_items:list:L');
      // The library card rolls the item's entries up, so the owner's item
      // pool answers differently after a quantity that names no other item.
      expect(updateTag).toHaveBeenCalledWith(
        `items:profile:${selfProfileOf(OWNER.id)}`
      );
    });

    it('AddTrailing_AppendsAfterMaxWithoutMovingSurvivors', async () => {
      await actions.setListItems('L', sel('A', 'B', 'C'));
      const byItem = Object.fromEntries(
        (await listItemRows('L')).map((r) => [r.item_id, r.position])
      );
      expect(byItem).toEqual({ A: 100, B: 150, C: 150 + 65536 });
    });
  });

  describe('OrderChanged', () => {
    beforeEach(async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id });
      await seedItem(db, { id: 'A', user_id: OWNER.id });
      await seedItem(db, { id: 'B', user_id: OWNER.id });
      await seedItem(db, { id: 'C', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L', item_id: 'A', position: 100 });
      await seedListItem(db, { list_id: 'L', item_id: 'B', position: 150 });
    });

    const positions = async () =>
      Object.fromEntries(
        (await listItemRows('L')).map((r) => [r.item_id, r.position])
      );

    it('SurvivorsSwapped_RewritesEveryPositionAsCleanMultiples', async () => {
      const res = await actions.setListItems('L', sel('B', 'A'));
      expect(res.message).toBe('updated 2');
      expect(await positions()).toEqual({ B: 65536, A: 131072 });
    });

    it('AddedBetweenSurvivors_RewritesTheWholeOrder', async () => {
      const res = await actions.setListItems('L', sel('A', 'C', 'B'));
      expect(res.message).toBe('Added 1, updated 2');
      expect(await positions()).toEqual({ A: 65536, C: 131072, B: 196608 });
    });

    it('MoveAndRemoveTogether_RewritesAndDeletes', async () => {
      await seedListItem(db, { list_id: 'L', item_id: 'C', position: 200 });
      const res = await actions.setListItems('L', sel('C', 'A'));
      expect(res.message).toBe('removed 1, updated 2');
      expect(await positions()).toEqual({ C: 65536, A: 131072 });
    });
  });

  it('PureRemove_ReportsRemovedOnly', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'B', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    await seedListItem(db, { list_id: 'L', item_id: 'B', position: 131072 });

    const res = await actions.setListItems('L', sel('A'));
    expect(res.success).toBe(true);
    expect(res.message).toBe('removed 1');
    expect((await listItemRows('L')).map((r) => r.item_id)).toEqual(['A']);
  });

  describe('UpdateRecency', () => {
    const STALE = new Date('2020-01-01T00:00:00.000Z');

    const updatedAtOfL = async () =>
      (await db.select().from(lists).where(eq(lists.id, 'L')))[0].updated_at;

    beforeEach(async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id, updated_at: STALE });
      await seedItem(db, { id: 'A', user_id: OWNER.id });
      await seedItem(db, { id: 'B', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    });

    it('NonEmptyDiff_BumpsUpdatedAt', async () => {
      const before = Date.now();
      const res = await actions.setListItems('L', sel('A', 'B'));
      const after = Date.now();

      expect(res.success).toBe(true);
      const t = (await updatedAtOfL()).getTime();
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(after);
    });

    it('NoChanges_LeavesUpdatedAtUnchanged', async () => {
      const res = await actions.setListItems('L', sel('A'));

      expect(res.message).toBe('No changes');
      expect((await updatedAtOfL()).toISOString()).toBe(STALE.toISOString());
    });
  });

  it('DeleteThrows_ReturnsFailedToSaveItems', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.setListItems('L', sel());
    expect(res.error).toBe('Failed to save items');
  });
});
