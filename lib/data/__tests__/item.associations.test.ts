import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { lists } from '@/db/schema';
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
let associations: typeof import('@/lib/data/item.associations');
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

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  associations = await import('@/lib/data/item.associations');
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

describe('updateItemStores', () => {
  describe('AuthGuards', () => {
    it('NoSession_ThrowsFailedToUpdateItemStores', async () => {
      noSession();
      await expect(associations.updateItemStores([], 'I')).rejects.toThrow(
        'Failed to update item stores.'
      );
    });

    it('UnknownEmail_ThrowsFailedToUpdateItemStores', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      asGhost();
      await expect(associations.updateItemStores([], 'I')).rejects.toThrow(
        'Failed to update item stores.'
      );
    });

    it('MissingItem_ThrowsFailedToUpdateItemStores', async () => {
      await expect(associations.updateItemStores([], 'nope')).rejects.toThrow(
        'Failed to update item stores.'
      );
    });

    it('NonOwner_ThrowsFailedToUpdateItemStores', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      asOther();
      await expect(associations.updateItemStores([], 'I')).rejects.toThrow(
        'Failed to update item stores.'
      );
    });
  });
});

describe('updateItemLists', () => {
  describe('AuthGuards', () => {
    it('NoSession_ThrowsFailedToUpdateItemLists', async () => {
      noSession();
      await expect(associations.updateItemLists([], 'I')).rejects.toThrow(
        'Failed to update item lists.'
      );
    });

    it('UnknownEmail_ThrowsFailedToUpdateItemLists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      asGhost();
      await expect(associations.updateItemLists([], 'I')).rejects.toThrow(
        'Failed to update item lists.'
      );
    });

    it('MissingItem_ThrowsFailedToUpdateItemLists', async () => {
      await expect(associations.updateItemLists([], 'nope')).rejects.toThrow(
        'Failed to update item lists.'
      );
    });

    it('NonOwner_ThrowsFailedToUpdateItemLists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      asOther();
      await expect(associations.updateItemLists([], 'I')).rejects.toThrow(
        'Failed to update item lists.'
      );
    });
  });

  describe('UpdateRecency', () => {
    const STALE = new Date('2020-01-01T00:00:00.000Z');

    beforeEach(async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      // I is on A and C; the act adds B, removes A, keeps C.
      await seedList(db, { id: 'A', user_id: OWNER.id, updated_at: STALE });
      await seedList(db, { id: 'B', user_id: OWNER.id, updated_at: STALE });
      await seedList(db, { id: 'C', user_id: OWNER.id, updated_at: STALE });
      await seedListItem(db, { list_id: 'A', item_id: 'I', position: 65536 });
      await seedListItem(db, { list_id: 'C', item_id: 'I', position: 65536 });
    });

    const updatedAtById = async () =>
      Object.fromEntries(
        (await db.select().from(lists)).map((r) => [r.id, r.updated_at])
      );

    it('MixedAddRemove_BumpsGainingAndLosingLists-LeavesUnchangedListUntouched-CallsUpdateTagLists', async () => {
      const before = Date.now();
      await associations.updateItemLists(['B', 'C'], 'I');
      const after = Date.now();

      const byId = await updatedAtById();
      expect(byId.A.getTime()).toBeGreaterThanOrEqual(before);
      expect(byId.A.getTime()).toBeLessThanOrEqual(after);
      expect(byId.B.getTime()).toBeGreaterThanOrEqual(before);
      expect(byId.B.getTime()).toBeLessThanOrEqual(after);
      expect(byId.C.toISOString()).toBe(STALE.toISOString());
      expect(updateTag).toHaveBeenCalledWith('lists');
    });

    it('UnchangedMembership_BumpsNoList-NoUpdateTag', async () => {
      await associations.updateItemLists(['A', 'C'], 'I');

      const byId = await updatedAtById();
      expect(byId.A.toISOString()).toBe(STALE.toISOString());
      expect(byId.B.toISOString()).toBe(STALE.toISOString());
      expect(byId.C.toISOString()).toBe(STALE.toISOString());
      expect(updateTag).not.toHaveBeenCalled();
    });
  });
});
