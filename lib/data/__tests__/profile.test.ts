import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { profiles, users } from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedBlock,
  seedFollow,
  seedManagedProfile,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';
import { makeProfile } from '@/test/helpers/profile';
import { seedList } from './test-helpers';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

const VIEWER = { id: 'viewer', email: 'viewer@test.local' };

let db: TestDb;
let dal: typeof import('@/lib/data/profile');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/data/profile');
});

beforeEach(async () => {
  // db is shared per-file, so restore spies first or they leak between tests.
  vi.restoreAllMocks();
  await resetDb(db);
});

describe('getUserIdentity', () => {
  beforeEach(async () => {
    await seedUsers(db, [
      { id: VIEWER.id, name: 'Viewer', email: VIEWER.email },
    ]);
  });

  it('AccountWithSelfProfile_ReturnsUserIdAndSelfProfileRow', async () => {
    expect(await dal.getUserIdentity(VIEWER.id)).toMatchObject({
      userId: VIEWER.id,
      profile: {
        id: selfProfileOf(VIEWER.id),
        name: 'Viewer',
        user_id: VIEWER.id,
      },
    });
  });

  it('AccountWithoutProfile_ReturnsNull', async () => {
    expect(await dal.getUserIdentity('ghost')).toBeNull();
  });

  it('AccountlessProfilePresent_ReturnsAccountsSelfProfileId', async () => {
    await seedManagedProfile(db, { id: 'managed-1' });
    expect(await dal.getUserIdentity(VIEWER.id)).toMatchObject({
      userId: VIEWER.id,
      profile: { id: selfProfileOf(VIEWER.id) },
    });
  });

  it('QueryThrows_ReturnsNull-LogsError', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db.query.profiles, 'findFirst').mockImplementation(() => {
      throw new Error('boom');
    });

    expect(await dal.getUserIdentity(VIEWER.id)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      'Error resolving user identity:',
      expect.any(Error)
    );
  });
});

describe('getProfileForViewer', () => {
  const viewerIdentity = {
    userId: 'viewer',
    profile: makeProfile(selfProfileOf('viewer'), 'Viewer', 'viewer'),
  };

  it('UnknownProfile_ReturnsNull', async () => {
    expect(await dal.getProfileForViewer('missing', null)).toBeNull();
  });

  it('NullViewer_ReturnsProfileWithFalseRelationshipFlags-PublicListCount', async () => {
    await seedUsers(db, [{ id: 'target', name: 'Tara', image: 't.png' }]);
    await seedList(db, { id: 'p1', user_id: 'target', visibility: 'public' });
    await seedList(db, { id: 'p2', user_id: 'target', visibility: 'public' });
    await seedList(db, { id: 'priv', user_id: 'target', visibility: 'private' });

    const profile = await dal.getProfileForViewer(selfProfileOf('target'), null);
    expect(profile).toMatchObject({
      id: selfProfileOf('target'),
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

    const profile = await dal.getProfileForViewer(selfProfileOf('target'), {
      userId: 'target',
      profile: makeProfile(selfProfileOf('target'), 'Tara', 'target'),
    });
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

    const profile = await dal.getProfileForViewer(
      selfProfileOf('target'),
      viewerIdentity
    );
    expect(profile).toMatchObject({
      viewerIsFollowing: true,
      viewerIsBlocked: true,
      blockedByViewer: true,
    });
  });

  it('QueryThrows_RejectsWithFetchProfileError', async () => {
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(
      dal.getProfileForViewer(selfProfileOf('target'), null)
    ).rejects.toThrow('Failed to fetch profile');
  });
});

describe('getFollowersOfProfile', () => {
  it('HasFollowers_ReturnsFollowerAccountWithItsProfileId', async () => {
    await seedUsers(db, [
      { id: 'followee' },
      { id: 'follower', name: 'Alice', image: 'a.png' },
    ]);
    await seedFollow(db, 'follower', 'followee');

    const rows = await dal.getFollowersOfProfile(selfProfileOf('followee'));
    expect(rows).toHaveLength(1);
    expect(rows[0].follower).toEqual({
      id: 'follower',
      profile_id: selfProfileOf('follower'),
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

    const rows = await dal.getFollowersOfProfile(selfProfileOf('followee'));
    expect(rows.map((r) => r.follower_id)).toEqual(['followerB', 'followerA']);
  });

  it('NoFollowers_ReturnsEmptyArray', async () => {
    await seedUsers(db, [{ id: 'followee' }]);
    expect(
      await dal.getFollowersOfProfile(selfProfileOf('followee'))
    ).toEqual([]);
  });
});

describe('hasBlocked', () => {
  beforeEach(async () => {
    await seedUsers(db, [{ id: 'alice' }, { id: 'bob' }, { id: 'carol' }]);
    await seedBlock(db, 'alice', 'bob');
  });

  it('ProfileBlocks_ReturnsTrue', async () => {
    expect(
      await dal.hasBlocked({
        blockerProfileId: selfProfileOf('alice'),
        blockedProfileId: selfProfileOf('bob'),
      })
    ).toBe(true);
  });

  it('ProfileHasNotBlockedBack_ReturnsFalse', async () => {
    expect(
      await dal.hasBlocked({
        blockerProfileId: selfProfileOf('bob'),
        blockedProfileId: selfProfileOf('alice'),
      })
    ).toBe(false);
  });

  it('ProfileBlocksSomeoneElse_ReturnsFalse', async () => {
    expect(
      await dal.hasBlocked({
        blockerProfileId: selfProfileOf('alice'),
        blockedProfileId: selfProfileOf('carol'),
      })
    ).toBe(false);
  });

  it('TargetBlockedBySomeoneElse_ReturnsFalse', async () => {
    expect(
      await dal.hasBlocked({
        blockerProfileId: selfProfileOf('carol'),
        blockedProfileId: selfProfileOf('bob'),
      })
    ).toBe(false);
  });
});

describe('getBlockedByProfile', () => {
  it('BlockedRows_OrderedByCreatedAtDesc-IncludesBlockedProfileJoin', async () => {
    await seedUsers(db, [
      { id: 'blocker' },
      { id: 'blockedX', name: 'Xena', image: 'x.png' },
      { id: 'blockedY', name: 'Yara', image: null },
    ]);
    await seedBlock(db, 'blocker', 'blockedX', new Date('2020-01-01'));
    await seedBlock(db, 'blocker', 'blockedY', new Date('2022-01-01'));

    const rows = await dal.getBlockedByProfile(selfProfileOf('blocker'));
    expect(rows.map((r) => r.blocked_profile_id)).toEqual([
      selfProfileOf('blockedY'),
      selfProfileOf('blockedX'),
    ]);
    expect(rows[1].blocked).toEqual({
      id: selfProfileOf('blockedX'),
      name: 'Xena',
      image: 'x.png',
    });
  });
});

// Each read's `catch` re-throw — uncovered by the happy-path tests above but
// required by the whole-file per-file branch floor.
describe('ReadErrorPaths', () => {
  it('FollowersQueryThrows_RejectsWithFetchFollowersError', async () => {
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(
      dal.getFollowersOfProfile(selfProfileOf('followee'))
    ).rejects.toThrow('Failed to fetch followers');
  });

  it('HasBlockedQueryThrows_RejectsWithCheckBlockStatusError', async () => {
    vi.spyOn(db.query.user_blocks, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(
      dal.hasBlocked({
        blockerProfileId: selfProfileOf('alice'),
        blockedProfileId: selfProfileOf('bob'),
      })
    ).rejects.toThrow('Failed to check block status');
  });

  it('BlockedQueryThrows_RejectsWithFetchBlockedUsersError', async () => {
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(
      dal.getBlockedByProfile(selfProfileOf('blocker'))
    ).rejects.toThrow('Failed to fetch blocked users');
  });
});

describe('getEligiblePurchasers', () => {
  beforeEach(async () => {
    await seedUsers(db, [
      { id: 'own', name: 'Olive Owner' },
      { id: 'claimer', name: 'Cleo Claimer' },
      { id: 'm-shared', name: 'Zara Shared' },
      { id: 'm-owner-only', name: 'Andy OwnerOnly' },
      { id: 'oneway', name: 'Wendy Oneway' },
      { id: 'm-blocked', name: 'Blake Blocked' },
    ]);
    // Owner mutuals: m-shared, m-owner-only, m-blocked. oneway is one-direction.
    for (const id of ['m-shared', 'm-owner-only', 'm-blocked']) {
      await seedFollow(db, 'own', id);
      await seedFollow(db, id, 'own');
    }
    await seedFollow(db, 'own', 'oneway');
    // m-shared is also the claimer's mutual (sorts first).
    await seedFollow(db, 'claimer', 'm-shared');
    await seedFollow(db, 'm-shared', 'claimer');
  });

  const [pOwn, pClaimer] = [selfProfileOf('own'), selfProfileOf('claimer')];

  it('OwnerMutualsOnly_ExcludesOneWayFollowAndOwner', async () => {
    const pool = await dal.getEligiblePurchasers(pOwn, pClaimer);
    expect(pool.map((u) => u.id).sort()).toEqual([
      selfProfileOf('m-blocked'),
      selfProfileOf('m-owner-only'),
      selfProfileOf('m-shared'),
    ]);
  });

  it('ClaimerInOwnersMutuals_ExcludedFromPool', async () => {
    // The claimer's own claim is the modal's primary self-claim CTA, never a
    // picker row.
    await seedFollow(db, 'own', 'claimer');
    await seedFollow(db, 'claimer', 'own');
    const pool = await dal.getEligiblePurchasers(pOwn, pClaimer);
    expect(pool.map((u) => u.id)).not.toContain(pClaimer);
  });

  it('BlockedByTarget_ExcludesTarget', async () => {
    await seedBlock(db, 'm-blocked', 'claimer');
    const pool = await dal.getEligiblePurchasers(pOwn, pClaimer);
    expect(pool.map((u) => u.id)).not.toContain(selfProfileOf('m-blocked'));
  });

  it('BlockedByClaimer_ExcludesTarget', async () => {
    await seedBlock(db, 'claimer', 'm-blocked');
    const pool = await dal.getEligiblePurchasers(pOwn, pClaimer);
    expect(pool.map((u) => u.id)).not.toContain(selfProfileOf('m-blocked'));
  });

  it('ClaimerMutualsPresent_SortFirstThenNameAscending', async () => {
    const pool = await dal.getEligiblePurchasers(pOwn, pClaimer);
    // m-shared (claimer mutual) leads; the rest sort by name: Andy < Blake.
    expect(pool.map((u) => u.id)).toEqual([
      selfProfileOf('m-shared'),
      selfProfileOf('m-owner-only'),
      selfProfileOf('m-blocked'),
    ]);
  });

  it('PoolMembers_CarryNameAndImageForPickerRows', async () => {
    const pool = await dal.getEligiblePurchasers(pOwn, pClaimer);
    expect(pool[0]).toEqual({
      id: selfProfileOf('m-shared'),
      name: 'Zara Shared',
      image: null,
    });
  });

  it('NoMutuals_ReturnsEmptyArray', async () => {
    await resetDb(db);
    await seedUsers(db, [{ id: 'own' }, { id: 'claimer' }]);
    expect(await dal.getEligiblePurchasers(pOwn, pClaimer)).toEqual([]);
  });

  it('ManagedOwnerProfile_ReturnsEmptyPool', async () => {
    // A managed profile has no account, so its follow legs cannot resolve and
    // the pool is empty by consequence of the predicate, not a special case.
    await resetDb(db);
    await seedUsers(db, [{ id: 'claimer' }]);
    await db
      .insert(profiles)
      .values({ id: 'kiddo', name: 'Kiddo', user_id: null });
    expect(await dal.getEligiblePurchasers('kiddo', pClaimer)).toEqual([]);
  });

  describe('FailureAndSortEdges', () => {
    it('QueryThrows_RejectsWithFetchEligiblePurchasersError', async () => {
      vi.spyOn(db, 'select').mockImplementationOnce(() => {
        throw new Error('boom');
      });
      await expect(dal.getEligiblePurchasers(pOwn, pClaimer)).rejects.toThrow(
        'Failed to fetch eligible purchasers'
      );
    });

    it('EmptyNamePoolMembers_SortAheadOfNamed', async () => {
      await resetDb(db);
      await seedUsers(db, [{ id: 'own' }, { id: 'claimer' }]);
      // seedUsers defaults the profile name to the id, so seed an empty-named
      // profile's account and profile directly.
      await db
        .insert(users)
        .values([{ id: 'nameless-a' }, { id: 'named', name: 'Named' }]);
      await db.insert(profiles).values([
        { id: selfProfileOf('nameless-a'), name: '', user_id: 'nameless-a' },
        { id: selfProfileOf('named'), name: 'Named', user_id: 'named' },
      ]);
      for (const id of ['nameless-a', 'named']) {
        await seedFollow(db, 'own', id);
        await seedFollow(db, id, 'own');
      }
      const pool = await dal.getEligiblePurchasers(pOwn, pClaimer);
      // Empty names compare as '' and sort ahead of real names.
      expect(pool.map((u) => u.id)).toEqual([
        selfProfileOf('nameless-a'),
        selfProfileOf('named'),
      ]);
    });
  });
});
