import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedFollow,
  seedPublicList,
  seedUsers,
  selfProfileOf,
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

describe('getFollowingByUser', () => {
  it('ViewerFollowsTwo_ReturnsFolloweeProfilesWithAccountImage', async () => {
    await seedUsers(db, [
      { id: 'follower' },
      { id: 'followeeA', name: 'Alice', image: 'a.png' },
      { id: 'followeeB', name: 'Bob', image: null },
    ]);
    await seedFollow(db, 'follower', 'followeeA');
    await seedFollow(db, 'follower', 'followeeB');

    const rows = await dal.getFollowingByUser('follower');
    const byId = Object.fromEntries(
      rows.map((r) => [r.followee.id, r.followee])
    );
    expect(byId[selfProfileOf('followeeA')]).toEqual({
      id: selfProfileOf('followeeA'),
      name: 'Alice',
      image: 'a.png',
    });
    expect(byId[selfProfileOf('followeeB')]).toEqual({
      id: selfProfileOf('followeeB'),
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
    expect(rows.map((r) => r.followee_profile_id)).toEqual([
      selfProfileOf('followeeB'),
      selfProfileOf('followeeA'),
    ]);
  });

  it('FollowsNoOne_ReturnsEmptyArray', async () => {
    await seedUsers(db, [{ id: 'follower' }]);
    expect(await dal.getFollowingByUser('follower')).toEqual([]);
  });
});

describe('getFollowingFeedProfiles', () => {
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

    const rows = await dal.getFollowingFeedProfiles('follower');
    expect(rows).toHaveLength(1);
    expect(String(rows[0].latest_shared_at)).toContain('2021-06-01');
  });

  it('NewCount_CountsListsSharedAfterGreatestLastSeenOrFollow', async () => {
    // The query resolves the followee profile's account through that
    // profile's `self` membership, so last_seen_following_at in the GREATEST
    // filter is the followee's value (preserved from the pre-profile query
    // shape).
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

    const rows = await dal.getFollowingFeedProfiles('follower');
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

    const rows = await dal.getFollowingFeedProfiles('follower');
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

    const rows = await dal.getFollowingFeedProfiles('follower');
    expect(rows.map((r) => r.id)).toEqual([
      selfProfileOf('followeeB'),
      selfProfileOf('followeeA'),
    ]);
  });

  it('FolloweeNoPublicLists_LatestNull-NewCountZero', async () => {
    await seedUsers(db, [{ id: 'follower' }, { id: 'followee' }]);
    await seedFollow(db, 'follower', 'followee', new Date('2020-01-01'));

    const rows = await dal.getFollowingFeedProfiles('follower');
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

    const rows = await dal.getFollowingFeedProfiles('follower');
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
    expect(
      await dal.isFollowing({
        userId: 'alice',
        followeeProfileId: selfProfileOf('bob'),
      })
    ).toBe(true);
  });

  it('UserDoesNotFollowBack_ReturnsFalse', async () => {
    expect(
      await dal.isFollowing({
        userId: 'bob',
        followeeProfileId: selfProfileOf('alice'),
      })
    ).toBe(false);
  });

  it('UserFollowsSomeoneElse_ReturnsFalse', async () => {
    expect(
      await dal.isFollowing({
        userId: 'alice',
        followeeProfileId: selfProfileOf('carol'),
      })
    ).toBe(false);
  });

  it('TargetFollowedBySomeoneElse_ReturnsFalse', async () => {
    expect(
      await dal.isFollowing({
        userId: 'carol',
        followeeProfileId: selfProfileOf('bob'),
      })
    ).toBe(false);
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

// Each read's `catch` re-throw — uncovered by the happy-path tests above but
// required by the whole-file per-file branch floor.
describe('ReadErrorPaths', () => {
  it('FollowingQueryThrows_RejectsWithFetchFollowingError', async () => {
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(dal.getFollowingByUser('follower')).rejects.toThrow(
      'Failed to fetch following'
    );
  });

  it('IsFollowingQueryThrows_RejectsWithCheckFollowStatusError', async () => {
    vi.spyOn(db.query.user_follows, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(
      dal.isFollowing({
        userId: 'alice',
        followeeProfileId: selfProfileOf('bob'),
      })
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

  it('FollowingFeedQueryThrows_RejectsWithFetchFollowingFeedProfilesError', async () => {
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(dal.getFollowingFeedProfiles('follower')).rejects.toThrow(
      'Failed to fetch following feed profiles'
    );
  });
});
