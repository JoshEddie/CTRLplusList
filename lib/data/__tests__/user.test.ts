import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedBlock,
  seedFollow,
  seedPublicList,
  seedUsers,
} from '@/test/helpers/seedFollowGraph';
import { seedList } from './test-helpers';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let dal: typeof import('@/lib/data/user');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/data/user');
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

describe('getFollowingByUser', () => {
  it('ViewerFollowsTwo_ReturnsFolloweesWithUserJoin', async () => {
    await seedUsers(db, [
      { id: 'follower' },
      { id: 'followeeA', name: 'Alice', image: 'a.png' },
      { id: 'followeeB', name: 'Bob', image: null },
    ]);
    await seedFollow(db, 'follower', 'followeeA');
    await seedFollow(db, 'follower', 'followeeB');

    const rows = await dal.getFollowingByUser('follower');
    const byId = Object.fromEntries(rows.map((r) => [r.followee.id, r.followee]));
    expect(byId.followeeA).toEqual({
      id: 'followeeA',
      name: 'Alice',
      image: 'a.png',
    });
    expect(byId.followeeB).toEqual({
      id: 'followeeB',
      name: 'Bob',
      image: null,
    });
  });

  it('MultipleFollows_OrderedByCreatedAtDesc', async () => {
    await seedUsers(db, [
      { id: 'follower' },
      { id: 'followeeA' },
      { id: 'followeeB' },
    ]);
    await seedFollow(db, 'follower', 'followeeA', new Date('2020-01-01'));
    await seedFollow(db, 'follower', 'followeeB', new Date('2022-01-01'));

    const rows = await dal.getFollowingByUser('follower');
    expect(rows.map((r) => r.followee_id)).toEqual(['followeeB', 'followeeA']);
  });

  it('FollowsNoOne_ReturnsEmptyArray', async () => {
    await seedUsers(db, [{ id: 'follower' }]);
    expect(await dal.getFollowingByUser('follower')).toEqual([]);
  });
});

describe('getFollowersOfUser', () => {
  it('HasFollowers_ReturnsFollowersWithJoin', async () => {
    await seedUsers(db, [
      { id: 'followee' },
      { id: 'follower', name: 'Alice', image: 'a.png' },
    ]);
    await seedFollow(db, 'follower', 'followee');

    const rows = await dal.getFollowersOfUser('followee');
    expect(rows).toHaveLength(1);
    expect(rows[0].follower).toEqual({
      id: 'follower',
      name: 'Alice',
      image: 'a.png',
    });
  });

  it('MultipleFollowers_OrderedByCreatedAtDesc', async () => {
    await seedUsers(db, [
      { id: 'followee' },
      { id: 'followerA' },
      { id: 'followerB' },
    ]);
    await seedFollow(db, 'followerA', 'followee', new Date('2020-01-01'));
    await seedFollow(db, 'followerB', 'followee', new Date('2022-01-01'));

    const rows = await dal.getFollowersOfUser('followee');
    expect(rows.map((r) => r.follower_id)).toEqual(['followerB', 'followerA']);
  });

  it('NoFollowers_ReturnsEmptyArray', async () => {
    await seedUsers(db, [{ id: 'followee' }]);
    expect(await dal.getFollowersOfUser('followee')).toEqual([]);
  });
});

describe('getFollowingFeedUsers', () => {
  it('FolloweeWithPublicLists_LatestSharedAtIsMax', async () => {
    await seedUsers(db, [{ id: 'follower' }, { id: 'followee' }]);
    await seedFollow(db, 'follower', 'followee', new Date('2020-01-01'));
    await seedPublicList(db, {
      id: 'l1',
      user_id: 'followee',
      shared_at: new Date('2021-01-01'),
    });
    await seedPublicList(db, {
      id: 'l2',
      user_id: 'followee',
      shared_at: new Date('2021-06-01'),
    });

    const rows = await dal.getFollowingFeedUsers('follower');
    expect(rows).toHaveLength(1);
    expect(String(rows[0].latest_shared_at)).toContain('2021-06-01');
  });

  it('NewCount_CountsListsSharedAfterGreatestLastSeenOrFollow', async () => {
    // The query joins `users` on followee_id, so last_seen_following_at in the
    // GREATEST filter is the followee's value.
    await seedUsers(db, [
      { id: 'follower' },
      { id: 'followee', last_seen_following_at: new Date('2021-03-01') },
    ]);
    await seedFollow(db, 'follower', 'followee', new Date('2020-01-01'));
    await seedPublicList(db, {
      id: 'old',
      user_id: 'followee',
      shared_at: new Date('2021-01-01'),
    });
    await seedPublicList(db, {
      id: 'new',
      user_id: 'followee',
      shared_at: new Date('2021-06-01'),
    });

    const rows = await dal.getFollowingFeedUsers('follower');
    expect(rows[0].new_count).toBe(1);
  });

  it('NewCount_CoercedToNumber', async () => {
    await seedUsers(db, [{ id: 'follower' }, { id: 'followee' }]);
    await seedFollow(db, 'follower', 'followee', new Date('2020-01-01'));
    await seedPublicList(db, {
      id: 'l1',
      user_id: 'followee',
      shared_at: new Date('2021-01-01'),
    });

    const rows = await dal.getFollowingFeedUsers('follower');
    expect(typeof rows[0].new_count).toBe('number');
  });

  it('FolloweesWithLists_OrderedByMaxSharedAtDesc', async () => {
    await seedUsers(db, [
      { id: 'follower' },
      { id: 'followeeA' },
      { id: 'followeeB' },
    ]);
    await seedFollow(db, 'follower', 'followeeA', new Date('2020-01-01'));
    await seedFollow(db, 'follower', 'followeeB', new Date('2020-01-01'));
    await seedPublicList(db, {
      id: 'la',
      user_id: 'followeeA',
      shared_at: new Date('2021-01-01'),
    });
    await seedPublicList(db, {
      id: 'lb',
      user_id: 'followeeB',
      shared_at: new Date('2022-01-01'),
    });

    const rows = await dal.getFollowingFeedUsers('follower');
    expect(rows.map((r) => r.id)).toEqual(['followeeB', 'followeeA']);
  });

  it('FolloweeNoPublicLists_LatestNull-NewCountZero', async () => {
    await seedUsers(db, [{ id: 'follower' }, { id: 'followee' }]);
    await seedFollow(db, 'follower', 'followee', new Date('2020-01-01'));

    const rows = await dal.getFollowingFeedUsers('follower');
    expect(rows).toHaveLength(1);
    expect(rows[0].latest_shared_at).toBeNull();
    expect(rows[0].new_count).toBe(0);
  });

  it('NullLastSeen_PreexistingListsNotCountedNew', async () => {
    await seedUsers(db, [
      { id: 'follower', last_seen_following_at: null },
      { id: 'followee' },
    ]);
    await seedFollow(db, 'follower', 'followee', new Date('2022-01-01'));
    await seedPublicList(db, {
      id: 'old',
      user_id: 'followee',
      shared_at: new Date('2021-01-01'),
    });

    const rows = await dal.getFollowingFeedUsers('follower');
    expect(rows[0].new_count).toBe(0);
    expect(String(rows[0].latest_shared_at)).toContain('2021-01-01');
  });
});

describe('isFollowing', () => {
  beforeEach(async () => {
    await seedUsers(db, [{ id: 'alice' }, { id: 'bob' }, { id: 'carol' }]);
    await seedFollow(db, 'alice', 'bob');
  });

  it('UserFollows_ReturnsTrue', async () => {
    expect(await dal.isFollowing({ userId: 'alice', followeeId: 'bob' })).toBe(
      true
    );
  });

  it('UserDoesNotFollowBack_ReturnsFalse', async () => {
    expect(await dal.isFollowing({ userId: 'bob', followeeId: 'alice' })).toBe(
      false
    );
  });

  it('UserFollowsSomeoneElse_ReturnsFalse', async () => {
    expect(
      await dal.isFollowing({ userId: 'alice', followeeId: 'carol' })
    ).toBe(false);
  });

  it('TargetFollowedBySomeoneElse_ReturnsFalse', async () => {
    expect(await dal.isFollowing({ userId: 'carol', followeeId: 'bob' })).toBe(
      false
    );
  });
});

describe('hasBlocked', () => {
  beforeEach(async () => {
    await seedUsers(db, [{ id: 'alice' }, { id: 'bob' }, { id: 'carol' }]);
    await seedBlock(db, 'alice', 'bob');
  });

  it('UserBlocks_ReturnsTrue', async () => {
    expect(await dal.hasBlocked({ userId: 'alice', blockedId: 'bob' })).toBe(
      true
    );
  });

  it('UserHasNotBlockedBack_ReturnsFalse', async () => {
    expect(await dal.hasBlocked({ userId: 'bob', blockedId: 'alice' })).toBe(
      false
    );
  });

  it('UserBlocksSomeoneElse_ReturnsFalse', async () => {
    expect(
      await dal.hasBlocked({ userId: 'alice', blockedId: 'carol' })
    ).toBe(false);
  });

  it('TargetBlockedBySomeoneElse_ReturnsFalse', async () => {
    expect(await dal.hasBlocked({ userId: 'carol', blockedId: 'bob' })).toBe(
      false
    );
  });
});

describe('viewerHasAnyFollows', () => {
  it('NoFollows_ReturnsFalse', async () => {
    await seedUsers(db, [{ id: 'follower' }, { id: 'followee' }]);
    expect(await dal.viewerHasAnyFollows('follower')).toBe(false);
  });

  it('HasFollows_ReturnsTrue', async () => {
    await seedUsers(db, [{ id: 'follower' }, { id: 'followee' }]);
    await seedFollow(db, 'follower', 'followee');
    expect(await dal.viewerHasAnyFollows('follower')).toBe(true);
  });
});

describe('getBlockedByUser', () => {
  it('BlockedRows_OrderedByCreatedAtDesc-IncludesBlockedJoin', async () => {
    await seedUsers(db, [
      { id: 'blocker' },
      { id: 'blockedX', name: 'Xena', image: 'x.png' },
      { id: 'blockedY', name: 'Yara', image: null },
    ]);
    await seedBlock(db, 'blocker', 'blockedX', new Date('2020-01-01'));
    await seedBlock(db, 'blocker', 'blockedY', new Date('2022-01-01'));

    const rows = await dal.getBlockedByUser('blocker');
    expect(rows.map((r) => r.blocked_id)).toEqual(['blockedY', 'blockedX']);
    expect(rows[1].blocked).toEqual({
      id: 'blockedX',
      name: 'Xena',
      image: 'x.png',
    });
  });
});

// Each read's `catch` re-throw — uncovered by the happy-path tests above but
// required by the whole-file per-file branch floor.
describe('ReadErrorPaths', () => {
  it('FollowingQueryThrows_RejectsWithFetchFollowingError', async () => {
    vi.spyOn(db.query.user_follows, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getFollowingByUser('follower')).rejects.toThrow(
      'Failed to fetch following'
    );
  });

  it('FollowersQueryThrows_RejectsWithFetchFollowersError', async () => {
    vi.spyOn(db.query.user_follows, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getFollowersOfUser('followee')).rejects.toThrow(
      'Failed to fetch followers'
    );
  });

  it('IsFollowingQueryThrows_RejectsWithCheckFollowStatusError', async () => {
    vi.spyOn(db.query.user_follows, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(
      dal.isFollowing({ userId: 'alice', followeeId: 'bob' })
    ).rejects.toThrow('Failed to check follow status');
  });

  it('ViewerHasAnyFollowsQueryThrows_RejectsWithCheckViewerFollowCountError', async () => {
    vi.spyOn(db.query.user_follows, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.viewerHasAnyFollows('follower')).rejects.toThrow(
      'Failed to check viewer follow count'
    );
  });

  it('HasBlockedQueryThrows_RejectsWithCheckBlockStatusError', async () => {
    vi.spyOn(db.query.user_blocks, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(
      dal.hasBlocked({ userId: 'alice', blockedId: 'bob' })
    ).rejects.toThrow('Failed to check block status');
  });

  it('BlockedQueryThrows_RejectsWithFetchBlockedUsersError', async () => {
    vi.spyOn(db.query.user_blocks, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getBlockedByUser('blocker')).rejects.toThrow(
      'Failed to fetch blocked users'
    );
  });

  it('FollowingFeedQueryThrows_RejectsWithFetchFollowingFeedUsersError', async () => {
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(dal.getFollowingFeedUsers('follower')).rejects.toThrow(
      'Failed to fetch following feed users'
    );
  });
});
