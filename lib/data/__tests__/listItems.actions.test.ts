import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { list_items } from '@/db/schema';
import { auth } from '@/lib/auth';
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
  updateTag.mockClear();
  asOwner();
});

describe('setListItems', () => {
  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.setListItems('L', ['I']);
    expect(res.error).toBe('Unauthorized');
  });

  it('MissingList_ReturnsNotFound', async () => {
    const res = await actions.setListItems('nope', ['I']);
    expect(res.error).toBe('Not found');
  });

  it('NonOwner_ReturnsForbidden', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    asOther();
    const res = await actions.setListItems('L', ['I']);
    expect(res.error).toBe('Forbidden');
  });

  it('UnknownEmail_ReturnsForbidden', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    asGhost();
    const res = await actions.setListItems('L', ['I']);
    expect(res.error).toBe('Forbidden');
  });

  it('EmptyItemId_ReturnsInvalidInput', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    const res = await actions.setListItems('L', ['']);
    expect(res.error).toBe('Invalid input');
  });

  it('NoChanges_ReturnsNoChanges', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
    const res = await actions.setListItems('L', ['I']);
    expect(res.message).toBe('No changes');
  });

  it('MixedAddRemove_WritesDiff-PlacesInsertsAtMaxPlus65536-ReportsCounts', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'B', user_id: OWNER.id });
    await seedItem(db, { id: 'C', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    await seedListItem(db, { list_id: 'L', item_id: 'B', position: 131072 });

    const res = await actions.setListItems('L', ['A', 'C']);
    expect(res.success).toBe(true);
    expect(res.message).toBe('Added 1, removed 1');

    const rows = await listItemRows('L');
    const byItem = Object.fromEntries(rows.map((r) => [r.item_id, r.position]));
    expect(byItem).toEqual({ A: 65536, C: 131072 });
    expect(updateTag).toHaveBeenCalledWith('items');
    expect(updateTag).toHaveBeenCalledWith('lists');
  });

  it('PureAdd_PlacesAtMaxPlus65536-ReportsAddedOnly', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'B', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });

    const res = await actions.setListItems('L', ['A', 'B']);
    expect(res.success).toBe(true);
    expect(res.message).toBe('Added 1');
    const byItem = Object.fromEntries(
      (await listItemRows('L')).map((r) => [r.item_id, r.position])
    );
    expect(byItem).toEqual({ A: 65536, B: 131072 });
  });

  it('PureRemove_ReportsRemovedOnly', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'B', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    await seedListItem(db, { list_id: 'L', item_id: 'B', position: 131072 });

    const res = await actions.setListItems('L', ['A']);
    expect(res.success).toBe(true);
    expect(res.message).toBe('removed 1');
    expect((await listItemRows('L')).map((r) => r.item_id)).toEqual(['A']);
  });

  it('SelectThrows_ReturnsFailedToSaveItems', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    const res = await actions.setListItems('L', ['A', 'nonexistent']);
    expect(res.error).toBe('Failed to save items');
  });
});

describe('updatePriority', () => {
  async function seedListWith(positions: Record<string, number>) {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    for (const itemId of Object.keys(positions)) {
      await seedItem(db, { id: itemId, user_id: OWNER.id });
      await seedListItem(db, {
        list_id: 'L',
        item_id: itemId,
        position: positions[itemId],
      });
    }
  }

  async function positionOf(itemId: string) {
    const rows = await listItemRows('L');
    return rows.find((r) => r.item_id === itemId)?.position;
  }

  describe('HappyPaths', () => {
    it('MoveDownToMidpoint_SetsFloorMidpointBetweenTargetAndLowerNeighbor', async () => {
      await seedListWith({ A: 65536, B: 131072, C: 196608 });
      const res = await actions.updatePriority('C', 'B', 'L');
      expect(res.success).toBe(true);
      expect(await positionOf('C')).toBe(Math.floor((65536 + 131072) / 2));
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('MoveUpToMidpoint_SetsFloorMidpointBetweenTargetAndHigherNeighbor', async () => {
      await seedListWith({ A: 65536, B: 131072, C: 196608 });
      const res = await actions.updatePriority('A', 'B', 'L');
      expect(res.success).toBe(true);
      expect(await positionOf('A')).toBe(Math.floor((196608 + 131072) / 2));
    });

    it('MoveToFrontEdge_SetsFloorHalfTargetPosition', async () => {
      await seedListWith({ A: 65536, B: 131072, C: 196608 });
      const res = await actions.updatePriority('C', 'A', 'L');
      expect(res.success).toBe(true);
      expect(await positionOf('C')).toBe(Math.floor(65536 / 2));
    });

    it('MoveToBackEdge_SetsTargetPlusBaseSpacing', async () => {
      await seedListWith({ A: 65536, B: 131072, C: 196608 });
      const res = await actions.updatePriority('A', 'C', 'L');
      expect(res.success).toBe(true);
      expect(await positionOf('A')).toBe(196608 + 65536);
    });
  });

  it('CollisionBelowMinGap_RebalancesAllToBaseSpacing-PreservesOrder', async () => {
    // A and B share the top position; moving D up to C produces a midpoint
    // that leaves the two highest rows tied, tripping checkListBalance.
    await seedListWith({ D: 32768, C: 65536, A: 131072, B: 131072 });
    const res = await actions.updatePriority('D', 'C', 'L');
    expect(res.success).toBe(true);

    const rows = await listItemRows('L');
    const positions = rows.map((r) => r.position).sort((a, b) => a - b);
    expect(positions).toEqual([65536, 131072, 196608, 262144]);
    expect(await positionOf('C')).toBe(65536);
    expect(await positionOf('D')).toBe(131072);
    expect([await positionOf('A'), await positionOf('B')].sort()).toEqual([
      196608, 262144,
    ]);
  });

  describe('Guards', () => {
    it('NonOwner_ReturnsUnauthorized-NoWrite', async () => {
      await seedListWith({ A: 65536, B: 131072 });
      asOther();
      const res = await actions.updatePriority('A', 'B', 'L');
      expect(res.error).toBe('Unauthorized');
      expect(await positionOf('A')).toBe(65536);
    });

    it('NoSession_ReturnsUnauthorized', async () => {
      await seedListWith({ A: 65536, B: 131072 });
      noSession();
      const res = await actions.updatePriority('A', 'B', 'L');
      expect(res.error).toBe('Unauthorized');
    });

    it('TargetNotMember_ReturnsItemOrTargetNotFound', async () => {
      await seedListWith({ A: 65536 });
      const res = await actions.updatePriority('A', 'ghost', 'L');
      expect(res.error).toBe('Item or target not found on this list');
    });

    it('SameItemAndTarget_ReturnsAlreadyAtTargetPosition-NoWrite', async () => {
      await seedListWith({ A: 65536, B: 131072 });
      const res = await actions.updatePriority('A', 'A', 'L');
      expect(res.error).toBe('Item is already at the target position');
      expect(await positionOf('A')).toBe(65536);
    });
  });

  it('UpdateThrows_ReturnsFailedToUpdateItemPriority', async () => {
    await seedListWith({ A: 65536, B: 131072, C: 196608 });
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.updatePriority('C', 'B', 'L');
    expect(res.error).toBe('Failed to update item priority');
  });
});
