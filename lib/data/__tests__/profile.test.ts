import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNextHeaders } from '@/test/helpers/next-headers';

import { profile_members, profiles, user_follows, users } from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedAccentCatalog,
  seedAccentValue,
  seedAvatar,
  seedBlock,
  seedFollow,
  seedManagedProfile,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import { seedItem, seedList } from './test-helpers';
import { eq, sql } from 'drizzle-orm';

mockNextCache();
mockNextHeaders();

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

  it('AccountWithSelfProfile_ResolvesSelfProfileAsBothSelfAndActive', async () => {
    expect(await dal.getUserIdentity(VIEWER.id)).toMatchObject({
      userId: VIEWER.id,
      selfProfile: { id: selfProfileOf(VIEWER.id), name: 'Viewer' },
      activeProfile: { id: selfProfileOf(VIEWER.id), name: 'Viewer' },
    });
  });

  it('AccountWithoutProfile_ReturnsNull', async () => {
    expect(await dal.getUserIdentity('ghost')).toBeNull();
  });

  it('AccountlessProfilePresent_ReturnsAccountsSelfProfileId', async () => {
    await seedManagedProfile(db, { id: 'managed-1' });
    expect(await dal.getUserIdentity(VIEWER.id)).toMatchObject({
      userId: VIEWER.id,
      selfProfile: { id: selfProfileOf(VIEWER.id) },
      activeProfile: { id: selfProfileOf(VIEWER.id) },
    });
  });

  it('QueryThrows_ReturnsNull-LogsError', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'select').mockImplementation(() => {
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
  const viewerIdentity = makeIdentity(
    'viewer',
    makeProfile(selfProfileOf('viewer'), 'Viewer')
  );

  it('UnknownProfile_ReturnsNull', async () => {
    expect(await dal.getProfileForViewer('missing', null)).toBeNull();
  });

  it('NullViewer_ReturnsProfileWithFalseRelationshipFlags-PublicListCount', async () => {
    await seedUsers(db, [{ id: 'target', name: 'Tara' }]);
    await seedAvatar(db, selfProfileOf('target'), { art: '<svg id="t" />' });
    await seedList(db, { id: 'p1', user_id: 'target', visibility: 'public' });
    await seedList(db, { id: 'p2', user_id: 'target', visibility: 'public' });
    await seedList(db, {
      id: 'priv',
      user_id: 'target',
      visibility: 'private',
    });

    const profile = await dal.getProfileForViewer(
      selfProfileOf('target'),
      null
    );
    expect(profile).toMatchObject({
      id: selfProfileOf('target'),
      name: 'Tara',
      art: '<svg id="t" />',
      avatarStyle: 'toon-head',
      publicListCount: 2,
      viewerIsFollowing: false,
      viewerIsBlocked: false,
      blockedByViewer: false,
    });
  });

  it('SelfViewer_ReturnsFalseRelationshipFlags', async () => {
    await seedUsers(db, [{ id: 'target' }]);

    const profile = await dal.getProfileForViewer(
      selfProfileOf('target'),
      makeIdentity('target', makeProfile(selfProfileOf('target'), 'Tara'))
    );
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
      { id: 'follower', name: 'Alice' },
    ]);
    await seedAvatar(db, selfProfileOf('follower'), { art: '<svg id="a" />' });
    await seedFollow(db, 'follower', 'followee');

    const rows = await dal.getFollowersOfProfile(selfProfileOf('followee'));
    expect(rows).toHaveLength(1);
    expect(rows[0].follower).toEqual({
      id: 'follower',
      profile_id: selfProfileOf('follower'),
      name: 'Alice',
      accent: null,
      art: '<svg id="a" />',
      avatarStyle: 'toon-head',
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
    expect(await dal.getFollowersOfProfile(selfProfileOf('followee'))).toEqual(
      []
    );
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
      { id: 'blockedX', name: 'Xena' },
      { id: 'blockedY', name: 'Yara' },
    ]);
    await seedAvatar(db, selfProfileOf('blockedX'), { art: '<svg id="x" />' });
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
      accent: null,
      art: '<svg id="x" />',
      avatarStyle: 'toon-head',
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

  it('PoolMembers_CarryNameAndFaceForPickerRows', async () => {
    const pool = await dal.getEligiblePurchasers(pOwn, pClaimer);
    expect(pool[0]).toEqual({
      id: selfProfileOf('m-shared'),
      name: 'Zara Shared',
      accent: null,
      art: null,
      avatarStyle: null,
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
    await db.insert(profiles).values({ id: 'kiddo', name: 'Kiddo' });
    expect(await dal.getEligiblePurchasers('kiddo', pClaimer)).toEqual([]);
  });

  it('ManagedProfileInOwnersFollows_ExcludedForLackOfAnAccount', async () => {
    // The return leg runs from an account, and a managed profile holds no
    // `self` membership to resolve one from, so it can never be marked.
    await seedManagedProfile(db, { id: 'kiddo' });
    await db
      .insert(user_follows)
      .values({ follower_id: 'own', followee_profile_id: 'kiddo' });
    const pool = await dal.getEligiblePurchasers(pOwn, pClaimer);
    expect(pool.map((u) => u.id)).not.toContain('kiddo');
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
        { id: selfProfileOf('nameless-a'), name: '' },
        { id: selfProfileOf('named'), name: 'Named' },
      ]);
      await db.insert(profile_members).values([
        {
          user_id: 'nameless-a',
          profile_id: selfProfileOf('nameless-a'),
          role: 'self',
        },
        { user_id: 'named', profile_id: selfProfileOf('named'), role: 'self' },
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

describe('getProfileCardsForUser', () => {
  const OWNED_A = 'owned-ada';
  const OWNED_Z = 'owned-zoe';
  const MANAGED_B = 'managed-bea';
  const MANAGED_C = 'managed-cal';

  beforeEach(async () => {
    await seedUsers(db, [
      { id: VIEWER.id, name: 'Viewer', email: VIEWER.email },
      { id: 'stranger', name: 'Stranger' },
    ]);
    await seedAccentCatalog(db);
    for (const [id, name, role] of [
      [OWNED_Z, 'Zoe', 'owner'],
      [OWNED_A, 'Ada', 'owner'],
      [MANAGED_C, 'Cal', 'manager'],
      [MANAGED_B, 'Bea', 'manager'],
    ] as const) {
      await seedManagedProfile(db, { id, name });
      await db.insert(profile_members).values({
        user_id: VIEWER.id,
        profile_id: id,
        role,
      });
    }
  });

  it('SelfOwnedAndManaged_OrdersSelfThenOwnedAscThenManagedAsc', async () => {
    const cards = await dal.getProfileCardsForUser(VIEWER.id);
    expect(cards.map((c) => c.name)).toEqual([
      'Viewer',
      'Ada',
      'Zoe',
      'Bea',
      'Cal',
    ]);
    expect(cards.map((c) => c.role)).toEqual([
      'self',
      'owner',
      'owner',
      'manager',
      'manager',
    ]);
  });

  it('ProfileWithNoMembershipForViewer_IsAbsent', async () => {
    await seedManagedProfile(db, { id: 'unrelated', name: 'Unrelated' });
    await db.insert(profile_members).values({
      user_id: 'stranger',
      profile_id: 'unrelated',
      role: 'owner',
    });
    const cards = await dal.getProfileCardsForUser(VIEWER.id);
    expect(cards.map((c) => c.id)).not.toContain('unrelated');
  });

  it('ListsAtEveryVisibilityAndArchivedItems_CountsAllListsAndActiveItemsOnly', async () => {
    for (const [id, visibility] of [
      ['l-private', 'private'],
      ['l-unlisted', 'unlisted'],
      ['l-public', 'public'],
    ] as const) {
      await seedList(db, { id, profile_id: OWNED_A, visibility });
    }
    await seedItem(db, { id: 'i-1', profile_id: OWNED_A });
    await seedItem(db, { id: 'i-2', profile_id: OWNED_A });
    await seedItem(db, { id: 'i-3', profile_id: OWNED_A });
    await seedItem(db, {
      id: 'i-archived-1',
      profile_id: OWNED_A,
      archived_at: new Date(),
    });
    await seedItem(db, {
      id: 'i-archived-2',
      profile_id: OWNED_A,
      archived_at: new Date(),
    });

    const ada = (await dal.getProfileCardsForUser(VIEWER.id)).find(
      (c) => c.id === OWNED_A
    );
    expect(ada).toMatchObject({ listCount: 3, itemCount: 3 });
  });

  it('ProfileWithStoredAccent_ReturnsThatHue', async () => {
    await seedAccentValue(db, OWNED_A, 'blue');
    const ada = (await dal.getProfileCardsForUser(VIEWER.id)).find(
      (c) => c.id === OWNED_A
    );
    expect(ada?.accent).toBe('blue');
  });

  it('ProfileWithNoPreferenceRow_ReturnsNullAccentHue', async () => {
    const zoe = (await dal.getProfileCardsForUser(VIEWER.id)).find(
      (c) => c.id === OWNED_Z
    );
    expect(zoe?.accent).toBeNull();
  });

  it('ProfileWithTagline_ReturnsIt-AbsentTaglineReturnsNull', async () => {
    await db
      .update(profiles)
      .set({ tagline: 'Loves dinosaurs' })
      .where(eq(profiles.id, OWNED_A));
    const cards = await dal.getProfileCardsForUser(VIEWER.id);
    expect(cards.find((c) => c.id === OWNED_A)?.tagline).toBe(
      'Loves dinosaurs'
    );
    expect(cards.find((c) => c.id === OWNED_Z)?.tagline).toBeNull();
  });
});

describe('getProfileMembership', () => {
  const MANAGED = 'managed-one';

  beforeEach(async () => {
    await seedUsers(db, [
      { id: VIEWER.id, name: 'Viewer', email: VIEWER.email },
    ]);
    await seedAccentCatalog(db);
    await seedManagedProfile(db, { id: MANAGED, name: 'Kiddo' });
  });

  it('ViewerHoldsOwnerMembership_ReturnsCardWithOwnerRole', async () => {
    await db.insert(profile_members).values({
      user_id: VIEWER.id,
      profile_id: MANAGED,
      role: 'owner',
    });
    expect(await dal.getProfileMembership(VIEWER.id, MANAGED)).toMatchObject({
      id: MANAGED,
      name: 'Kiddo',
      role: 'owner',
    });
  });

  it('ViewerHoldsNoMembership_ReturnsNull', async () => {
    expect(await dal.getProfileMembership(VIEWER.id, MANAGED)).toBeNull();
  });

  it('ProfileIdNoProfileCarries_ReturnsNullSameAsNonMember', async () => {
    expect(await dal.getProfileMembership(VIEWER.id, 'no-such-id')).toBeNull();
  });
});

describe('ProfileCardsReadErrors', () => {
  it('QueryRejectedByDatabase_ThrowsFailedToFetchProfileCards', async () => {
    await seedUsers(db, [
      { id: VIEWER.id, name: 'Viewer', email: VIEWER.email },
    ]);
    // Renaming the joined column is the cheapest way to make the read's own
    // SQL fail without stubbing the module under test.
    await db.execute(
      sql.raw(`ALTER TABLE "profiles" RENAME COLUMN "tagline" TO "tagline_tmp"`)
    );
    try {
      await expect(dal.getProfileCardsForUser(VIEWER.id)).rejects.toThrow(
        'Failed to fetch profile cards'
      );
    } finally {
      await db.execute(
        sql.raw(
          `ALTER TABLE "profiles" RENAME COLUMN "tagline_tmp" TO "tagline"`
        )
      );
    }
  });
});
