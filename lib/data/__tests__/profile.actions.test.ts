import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { user_blocks, user_follows } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedBlock,
  seedFollow,
  seedManagedProfile,
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
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const VIEWER = { id: 'viewer', email: 'viewer@test.local' };
const TARGET = { id: 'target', email: 'target@test.local' };
const THIRD = { id: 'third', email: 'third@test.local' };
const VIEWER_PROFILE = selfProfileOf(VIEWER.id);
const TARGET_PROFILE = selfProfileOf(TARGET.id);

let db: TestDb;
let actions: typeof import('@/lib/data/profile.actions');
let updateTag: ReturnType<typeof vi.fn>;

function asViewer() {
  vi.mocked(auth).mockResolvedValue({ user: { email: VIEWER.email } } as never);
}
function asTarget() {
  vi.mocked(auth).mockResolvedValue({ user: { email: TARGET.email } } as never);
}
function noSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

async function followRows() {
  return db.select().from(user_follows);
}
async function blockRows() {
  return db.select().from(user_blocks);
}

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/profile.actions');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  // db is shared per-file, so restore spies first or they leak between tests.
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [VIEWER, TARGET, THIRD]);
  updateTag.mockClear();
  asViewer();
});

describe('followUser', () => {
  it('AuthedNewTarget_InsertsFollowRow', async () => {
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    const rows = await followRows();
    expect(rows).toEqual([
      expect.objectContaining({
        follower_id: VIEWER.id,
        followee_profile_id: TARGET_PROFILE,
      }),
    ]);
  });

  it('AlreadyFollowing_NoDuplicateRowNoError', async () => {
    await actions.followUser(TARGET_PROFILE);
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(1);
  });

  it('SelfFollow_ReturnsInvalid-NoRow', async () => {
    const res = await actions.followUser(VIEWER_PROFILE);
    expect(res.error).toBe('Invalid');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockedByTarget_ReturnsBlocked-NoRow', async () => {
    await seedBlock(db, TARGET.id, VIEWER.id);
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockedViewer_ReturnsBlocked-NoRow', async () => {
    await seedBlock(db, VIEWER.id, TARGET.id);
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized-NoRow', async () => {
    noSession();
    const res = await actions.followUser(TARGET_PROFILE);
    expect(res.error).toBe('Unauthorized');
    expect(await followRows()).toHaveLength(0);
  });

  it('Success_CallsUpdateTagUserFollowsOnce', async () => {
    await actions.followUser(TARGET_PROFILE);
    expect(updateTag.mock.calls).toEqual([['user_follows']]);
  });

  it('EarlyReturns_DoNotCallUpdateTag', async () => {
    noSession();
    await actions.followUser(TARGET_PROFILE);
    asViewer();
    await actions.followUser(VIEWER_PROFILE);
    await seedBlock(db, VIEWER.id, TARGET.id);
    await actions.followUser(TARGET_PROFILE);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('InsertThrows_ReturnsFailed-NoUpdateTag', async () => {
    const res = await actions.followUser('ghost-profile-id');
    expect(res.error).toBe('Failed');
    expect(await followRows()).toHaveLength(0);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('unfollowUser', () => {
  it('Following_DeletesRow', async () => {
    await seedFollow(db, VIEWER.id, TARGET.id);
    const res = await actions.unfollowUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
  });

  it('NotFollowing_NoOpSuccess', async () => {
    const res = await actions.unfollowUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.unfollowUser(TARGET_PROFILE);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTagUserFollowsOnce', async () => {
    await actions.unfollowUser(TARGET_PROFILE);
    expect(updateTag.mock.calls).toEqual([['user_follows']]);
  });

  it('EarlyReturns_DoNotCallUpdateTag', async () => {
    noSession();
    await actions.unfollowUser(TARGET_PROFILE);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('DeleteThrows_ReturnsFailed-NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.unfollowUser(TARGET_PROFILE);
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('blockUser', () => {
  it('Authed_InsertsBlockRow-DeletesBothFollowDirections', async () => {
    await seedFollow(db, VIEWER.id, TARGET.id);
    await seedFollow(db, TARGET.id, VIEWER.id);
    const res = await actions.blockUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await blockRows()).toEqual([
      expect.objectContaining({
        blocker_profile_id: VIEWER_PROFILE,
        blocked_profile_id: TARGET_PROFILE,
      }),
    ]);
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockFirstOrdering_RacingFollowStillGated', async () => {
    await actions.blockUser(TARGET_PROFILE);
    asTarget();
    const res = await actions.followUser(VIEWER_PROFILE);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockFirstOrdering_BlockInsertPrecedesMembershipLookup', async () => {
    const order: string[] = [];
    const insert = db.insert.bind(db);
    const select = db.select.bind(db);
    vi.spyOn(db, 'insert').mockImplementation(((table: never) => {
      order.push('block-insert');
      return insert(table);
    }) as never);
    vi.spyOn(db, 'select').mockImplementation(((fields: never) => {
      order.push('select');
      return select(fields);
    }) as never);
    await actions.blockUser(TARGET_PROFILE);
    // The two leading selects are authedIdentity resolving the viewer, which
    // runs before the action body; the blocked profile's membership lookup
    // comes after the block row.
    expect(order).toEqual(['select', 'select', 'block-insert', 'select']);
  });

  it('Reblock_CleansLeftoverFollowRowIdempotently', async () => {
    await actions.blockUser(TARGET_PROFILE);
    await seedFollow(db, TARGET.id, VIEWER.id);
    const res = await actions.blockUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
    expect(await blockRows()).toHaveLength(1);
  });

  it('ManagedProfileTarget_InsertsBlockRow-SkipsAccountlessBackEdgeDelete', async () => {
    // A managed profile has no account, so there is no follower id to
    // resolve for the back edge; the viewer's own follow edge still goes.
    await seedManagedProfile(db, { id: 'managed-1' });
    await seedFollow(db, VIEWER.id, TARGET.id);
    const res = await actions.blockUser('managed-1');
    expect(res.success).toBe(true);
    expect(await blockRows()).toEqual([
      expect.objectContaining({
        blocker_profile_id: VIEWER_PROFILE,
        blocked_profile_id: 'managed-1',
      }),
    ]);
    expect(await followRows()).toEqual([
      expect.objectContaining({
        follower_id: VIEWER.id,
        followee_profile_id: TARGET_PROFILE,
      }),
    ]);
  });

  it('SelfBlock_ReturnsInvalid-NoRows', async () => {
    const res = await actions.blockUser(VIEWER_PROFILE);
    expect(res.error).toBe('Invalid');
    expect(await blockRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.blockUser(TARGET_PROFILE);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTagUserFollowsAndUserBlocksOnceEach', async () => {
    await actions.blockUser(TARGET_PROFILE);
    expect(updateTag.mock.calls).toEqual([['user_follows'], ['user_blocks']]);
  });

  it('StatementThrows_NeitherUpdateTagFires', async () => {
    const res = await actions.blockUser('ghost-profile-id');
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('unblockUser', () => {
  it('Blocked_DeletesBlockRow', async () => {
    await seedBlock(db, VIEWER.id, TARGET.id);
    const res = await actions.unblockUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await blockRows()).toHaveLength(0);
  });

  it('NotBlocked_NoOpSuccess', async () => {
    const res = await actions.unblockUser(TARGET_PROFILE);
    expect(res.success).toBe(true);
    expect(await blockRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.unblockUser(TARGET_PROFILE);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTagUserBlocksOnly', async () => {
    await actions.unblockUser(TARGET_PROFILE);
    expect(updateTag.mock.calls).toEqual([['user_blocks']]);
  });

  it('DeleteThrows_ReturnsFailed-NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.unblockUser(TARGET_PROFILE);
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('NoInteractiveTransactions', () => {
  it('NoCodePath_UsesTransactionApi', async () => {
    const txSpy = vi.fn();
    (db as unknown as { transaction: unknown }).transaction = txSpy;
    await seedFollow(db, TARGET.id, VIEWER.id);
    await actions.followUser(TARGET_PROFILE);
    await actions.unfollowUser(TARGET_PROFILE);
    await actions.blockUser(TARGET_PROFILE);
    await actions.unblockUser(TARGET_PROFILE);
    expect(txSpy).not.toHaveBeenCalled();
  });
});
