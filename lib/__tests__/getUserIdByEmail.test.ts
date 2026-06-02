import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let dal: typeof import('@/lib/dal');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/dal');
});

beforeEach(async () => {
  await resetDb(db);
});

describe('getUserIdByEmail', () => {
  it('MatchingEmail_ReturnsSeededUserRow', async () => {
    await seedUsers(db, [
      { id: 'u1', name: 'Alice', email: 'alice@test.local' },
    ]);

    const row = await dal.getUserIdByEmail('alice@test.local');
    expect(row).not.toBeNull();
    expect(row?.id).toBe('u1');
    expect(row?.email).toBe('alice@test.local');
  });

  it('NonMatchingEmail_ReturnsNull', async () => {
    await seedUsers(db, [
      { id: 'u1', name: 'Alice', email: 'alice@test.local' },
    ]);

    expect(await dal.getUserIdByEmail('nobody@test.local')).toBeNull();
  });

  it('EmptyUsersTable_ReturnsNull', async () => {
    expect(await dal.getUserIdByEmail('alice@test.local')).toBeNull();
  });

  it('CaseSensitiveExactMatch_OnlyExactReturns', async () => {
    await seedUsers(db, [
      { id: 'u1', name: 'Alice', email: 'alice@test.local' },
    ]);

    // `eq(users.email, …)` is a byte-exact comparison — no implicit
    // normalization — so a differently-cased value does not match.
    expect(await dal.getUserIdByEmail('ALICE@test.local')).toBeNull();
    expect(await dal.getUserIdByEmail('alice@test.local')).not.toBeNull();
  });
});
