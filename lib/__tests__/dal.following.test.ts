import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedBlock,
  seedFollow,
  seedPublicList,
  seedUsers,
} from '@/test/helpers/seedFollowGraph';

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

describe('getFollowingByUser', () => {
  it('ViewerFollowsTwo_ReturnsFolloweesWithUserJoin', async () => {
    await seedUsers(db, [
      { id: 'viewer' },
      { id: 'a', name: 'Alice', image: 'a.png' },
      { id: 'b', name: 'Bob', image: null },
    ]);
    await seedFollow(db, 'viewer', 'a');
    await seedFollow(db, 'viewer', 'b');

    const rows = await dal.getFollowingByUser('viewer');
    const byId = Object.fromEntries(rows.map((r) => [r.followee.id, r.followee]));
    expect(byId.a).toEqual({ id: 'a', name: 'Alice', image: 'a.png' });
    expect(byId.b).toEqual({ id: 'b', name: 'Bob', image: null });
  });

  it('MultipleFollows_OrderedByCreatedAtDesc', async () => {
    await seedUsers(db, [{ id: 'viewer' }, { id: 'a' }, { id: 'b' }]);
    await seedFollow(db, 'viewer', 'a', new Date('2020-01-01'));
    await seedFollow(db, 'viewer', 'b', new Date('2022-01-01'));

    const rows = await dal.getFollowingByUser('viewer');
    expect(rows.map((r) => r.followee_id)).toEqual(['b', 'a']);
  });

  it('FollowsNoOne_ReturnsEmptyArray', async () => {
    await seedUsers(db, [{ id: 'viewer' }]);
    expect(await dal.getFollowingByUser('viewer')).toEqual([]);
  });
});

describe('getFollowersOfUser', () => {
  it('HasFollowers_ReturnsFollowersWithJoin', async () => {
    await seedUsers(db, [
      { id: 'owner' },
      { id: 'a', name: 'Alice', image: 'a.png' },
    ]);
    await seedFollow(db, 'a', 'owner');

    const rows = await dal.getFollowersOfUser('owner');
    expect(rows).toHaveLength(1);
    expect(rows[0].follower).toEqual({
      id: 'a',
      name: 'Alice',
      image: 'a.png',
    });
  });

  it('MultipleFollowers_OrderedByCreatedAtDesc', async () => {
    await seedUsers(db, [{ id: 'owner' }, { id: 'a' }, { id: 'b' }]);
    await seedFollow(db, 'a', 'owner', new Date('2020-01-01'));
    await seedFollow(db, 'b', 'owner', new Date('2022-01-01'));

    const rows = await dal.getFollowersOfUser('owner');
    expect(rows.map((r) => r.follower_id)).toEqual(['b', 'a']);
  });

  it('NoFollowers_ReturnsEmptyArray', async () => {
    await seedUsers(db, [{ id: 'owner' }]);
    expect(await dal.getFollowersOfUser('owner')).toEqual([]);
  });
});

describe('getFollowingFeedUsers', () => {
  it('FolloweeWithPublicLists_LatestSharedAtIsMax', async () => {
    await seedUsers(db, [{ id: 'viewer' }, { id: 'a' }]);
    await seedFollow(db, 'viewer', 'a', new Date('2020-01-01'));
    await seedPublicList(db, { id: 'l1', user_id: 'a', shared_at: new Date('2021-01-01') });
    await seedPublicList(db, { id: 'l2', user_id: 'a', shared_at: new Date('2021-06-01') });

    const rows = await dal.getFollowingFeedUsers('viewer');
    expect(rows).toHaveLength(1);
    expect(String(rows[0].latest_shared_at)).toContain('2021-06-01');
  });

  it('NewCount_CountsListsSharedAfterGreatestLastSeenOrFollow', async () => {
    // The query joins `users` on followee_id, so last_seen_following_at in the
    // GREATEST filter is the followee's value.
    await seedUsers(db, [
      { id: 'viewer' },
      { id: 'a', last_seen_following_at: new Date('2021-03-01') },
    ]);
    await seedFollow(db, 'viewer', 'a', new Date('2020-01-01'));
    await seedPublicList(db, { id: 'old', user_id: 'a', shared_at: new Date('2021-01-01') });
    await seedPublicList(db, { id: 'new', user_id: 'a', shared_at: new Date('2021-06-01') });

    const rows = await dal.getFollowingFeedUsers('viewer');
    expect(rows[0].new_count).toBe(1);
  });

  it('NewCount_CoercedToNumber', async () => {
    await seedUsers(db, [{ id: 'viewer' }, { id: 'a' }]);
    await seedFollow(db, 'viewer', 'a', new Date('2020-01-01'));
    await seedPublicList(db, { id: 'l1', user_id: 'a', shared_at: new Date('2021-01-01') });

    const rows = await dal.getFollowingFeedUsers('viewer');
    expect(typeof rows[0].new_count).toBe('number');
  });

  it('FolloweesWithLists_OrderedByMaxSharedAtDesc', async () => {
    await seedUsers(db, [{ id: 'viewer' }, { id: 'a' }, { id: 'b' }]);
    await seedFollow(db, 'viewer', 'a', new Date('2020-01-01'));
    await seedFollow(db, 'viewer', 'b', new Date('2020-01-01'));
    await seedPublicList(db, { id: 'la', user_id: 'a', shared_at: new Date('2021-01-01') });
    await seedPublicList(db, { id: 'lb', user_id: 'b', shared_at: new Date('2022-01-01') });

    const rows = await dal.getFollowingFeedUsers('viewer');
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('FolloweeNoPublicLists_LatestNull-NewCountZero', async () => {
    await seedUsers(db, [{ id: 'viewer' }, { id: 'a' }]);
    await seedFollow(db, 'viewer', 'a', new Date('2020-01-01'));

    const rows = await dal.getFollowingFeedUsers('viewer');
    expect(rows).toHaveLength(1);
    expect(rows[0].latest_shared_at).toBeNull();
    expect(rows[0].new_count).toBe(0);
  });

  it('NullLastSeen_PreexistingListsNotCountedNew', async () => {
    await seedUsers(db, [
      { id: 'viewer', last_seen_following_at: null },
      { id: 'a' },
    ]);
    await seedFollow(db, 'viewer', 'a', new Date('2022-01-01'));
    await seedPublicList(db, { id: 'old', user_id: 'a', shared_at: new Date('2021-01-01') });

    const rows = await dal.getFollowingFeedUsers('viewer');
    expect(rows[0].new_count).toBe(0);
    expect(String(rows[0].latest_shared_at)).toContain('2021-01-01');
  });
});

describe('isFollowing', () => {
  it('TrueWhenRowExists_FalseWhenAbsent', async () => {
    await seedUsers(db, [{ id: 'viewer' }, { id: 'a' }]);
    await seedFollow(db, 'viewer', 'a');
    expect(await dal.isFollowing('viewer', 'a')).toBe(true);
    expect(await dal.isFollowing('a', 'viewer')).toBe(false);
  });
});

describe('isBlocked', () => {
  it('TrueInBlockDirection_FalseInReverse', async () => {
    await seedUsers(db, [{ id: 'viewer' }, { id: 'a' }]);
    await seedBlock(db, 'viewer', 'a');
    expect(await dal.isBlocked('viewer', 'a')).toBe(true);
    expect(await dal.isBlocked('a', 'viewer')).toBe(false);
  });
});

describe('viewerHasAnyFollows', () => {
  it('TrueWhenAtLeastOne_FalseWhenZero', async () => {
    await seedUsers(db, [{ id: 'viewer' }, { id: 'a' }]);
    expect(await dal.viewerHasAnyFollows('viewer')).toBe(false);
    await seedFollow(db, 'viewer', 'a');
    expect(await dal.viewerHasAnyFollows('viewer')).toBe(true);
  });
});

describe('getBlockedByUser', () => {
  it('BlockedRows_OrderedByCreatedAtDesc-IncludesBlockedJoin', async () => {
    await seedUsers(db, [
      { id: 'blocker' },
      { id: 'x', name: 'Xena', image: 'x.png' },
      { id: 'y', name: 'Yara', image: null },
    ]);
    await seedBlock(db, 'blocker', 'x', new Date('2020-01-01'));
    await seedBlock(db, 'blocker', 'y', new Date('2022-01-01'));

    const rows = await dal.getBlockedByUser('blocker');
    expect(rows.map((r) => r.blocked_id)).toEqual(['y', 'x']);
    expect(rows[1].blocked).toEqual({ id: 'x', name: 'Xena', image: 'x.png' });
  });
});

// Each read's `catch` re-throw — uncovered by the happy-path tests above but
// required by the whole-file per-file branch floor (test-dal-remainder §2.14).
describe('ReadErrorPaths', () => {
  it('FollowingQueryThrows_RejectsWithFetchFollowingError', async () => {
    vi.spyOn(db.query.user_follows, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getFollowingByUser('viewer')).rejects.toThrow(
      'Failed to fetch following'
    );
  });

  it('FollowersQueryThrows_RejectsWithFetchFollowersError', async () => {
    vi.spyOn(db.query.user_follows, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getFollowersOfUser('owner')).rejects.toThrow(
      'Failed to fetch followers'
    );
  });

  it('IsFollowingQueryThrows_RejectsWithCheckFollowStatusError', async () => {
    vi.spyOn(db.query.user_follows, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.isFollowing('viewer', 'a')).rejects.toThrow(
      'Failed to check follow status'
    );
  });

  it('ViewerHasAnyFollowsQueryThrows_RejectsWithCheckViewerFollowCountError', async () => {
    vi.spyOn(db.query.user_follows, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.viewerHasAnyFollows('viewer')).rejects.toThrow(
      'Failed to check viewer follow count'
    );
  });

  it('IsBlockedQueryThrows_RejectsWithCheckBlockStatusError', async () => {
    vi.spyOn(db.query.user_blocks, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.isBlocked('viewer', 'a')).rejects.toThrow(
      'Failed to check block status'
    );
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
    await expect(dal.getFollowingFeedUsers('viewer')).rejects.toThrow(
      'Failed to fetch following feed users'
    );
  });
});
