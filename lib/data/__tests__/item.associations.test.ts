import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

import { seedItem, type TestDb } from './test-helpers';

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
});

beforeEach(async () => {
  // Restore any per-test db spies (db is shared across tests now) and reset the
  // auth mock, then start each case from a clean, freshly seeded database.
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [OWNER, OTHER]);
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
});
