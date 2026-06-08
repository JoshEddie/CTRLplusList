import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedBlock, seedFollow, seedUsers } from '@/test/helpers/seedFollowGraph';
import { seedList } from '@/test/helpers/seedItemGraph';

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
  // db is shared per-file, so restore spies first or they leak between tests.
  vi.restoreAllMocks();
  await resetDb(db);
});

describe('getUserById', () => {
  it('ExistingId_ReturnsUserRow', async () => {
    await seedUsers(db, [
      { id: 'u1', name: 'Alice', email: 'alice@test.local' },
    ]);

    const row = await dal.getUserById('u1');
    expect(row?.id).toBe('u1');
    expect(row?.email).toBe('alice@test.local');
    expect(row?.name).toBe('Alice');
  });

  it('UnknownId_ReturnsNull', async () => {
    await seedUsers(db, [{ id: 'u1' }]);
    expect(await dal.getUserById('nobody')).toBeNull();
  });

  it('QueryThrows_ReturnsNullWithoutThrowing', async () => {
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(dal.getUserById('u1')).resolves.toBeNull();
  });
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

  it('QueryThrows_ReturnsNullWithoutThrowing', async () => {
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(dal.getUserIdByEmail('alice@test.local')).resolves.toBeNull();
  });
});

describe('getProfileForUser', () => {
  it('UnknownUser_ReturnsNull', async () => {
    expect(await dal.getProfileForUser('missing', null)).toBeNull();
  });

  it('NullViewer_ReturnsProfileWithFalseRelationshipFlags-PublicListCount', async () => {
    await seedUsers(db, [{ id: 'target', name: 'Tara', image: 't.png' }]);
    await seedList(db, { id: 'p1', user_id: 'target', visibility: 'public' });
    await seedList(db, { id: 'p2', user_id: 'target', visibility: 'public' });
    await seedList(db, { id: 'priv', user_id: 'target', visibility: 'private' });

    const profile = await dal.getProfileForUser('target', null);
    expect(profile).toMatchObject({
      id: 'target',
      name: 'Tara',
      image: 't.png',
      publicListCount: 2,
      viewerIsFollowing: false,
      viewerIsBlocked: false,
      blockedByViewer: false,
    });
  });

  it('SelfViewer_ReturnsFalseRelationshipFlags', async () => {
    await seedUsers(db, [{ id: 'target' }]);

    const profile = await dal.getProfileForUser('target', 'target');
    expect(profile).toMatchObject({
      viewerIsFollowing: false,
      viewerIsBlocked: false,
      blockedByViewer: false,
    });
  });

  it('OtherViewer_ComposesFollowingAndBlockFlags', async () => {
    await seedUsers(db, [{ id: 'target' }, { id: 'viewer' }]);
    await seedFollow(db, 'viewer', 'target'); // viewer follows target
    await seedBlock(db, 'target', 'viewer'); // target blocked viewer
    await seedBlock(db, 'viewer', 'target'); // viewer blocked target

    const profile = await dal.getProfileForUser('target', 'viewer');
    expect(profile).toMatchObject({
      viewerIsFollowing: true,
      viewerIsBlocked: true,
      blockedByViewer: true,
    });
  });

  it('QueryThrows_RejectsWithFetchProfileError', async () => {
    vi.spyOn(db.query.users, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getProfileForUser('target', null)).rejects.toThrow(
      'Failed to fetch profile'
    );
  });
});
