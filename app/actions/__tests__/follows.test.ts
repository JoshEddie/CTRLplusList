import { beforeEach, describe, expect, it, vi } from 'vitest';

import { user_blocks, user_follows } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedBlock, seedFollow, seedUsers } from '@/test/helpers/seedFollowGraph';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const VIEWER = { id: 'viewer', email: 'viewer@test.local' };
const TARGET = { id: 'target', email: 'target@test.local' };

let db: TestDb;
let actions: typeof import('@/app/actions/follows');
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

beforeEach(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  await seedUsers(db, [VIEWER, TARGET]);
  actions = await import('@/app/actions/follows');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
  updateTag.mockClear();
  asViewer();
});

describe('followUser', () => {
  it('AuthedNewTarget_InsertsFollowRow', async () => {
    const res = await actions.followUser(TARGET.id);
    expect(res.success).toBe(true);
    const rows = await followRows();
    expect(rows).toEqual([
      expect.objectContaining({
        follower_id: VIEWER.id,
        followee_id: TARGET.id,
      }),
    ]);
  });

  it('AlreadyFollowing_NoDuplicateRowNoError', async () => {
    await actions.followUser(TARGET.id);
    const res = await actions.followUser(TARGET.id);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(1);
  });

  it('SelfFollow_ReturnsInvalid_NoRow', async () => {
    const res = await actions.followUser(VIEWER.id);
    expect(res.error).toBe('Invalid');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockedByTarget_ReturnsBlocked_NoRow', async () => {
    await seedBlock(db, TARGET.id, VIEWER.id);
    const res = await actions.followUser(TARGET.id);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockedViewer_ReturnsBlocked_NoRow', async () => {
    await seedBlock(db, VIEWER.id, TARGET.id);
    const res = await actions.followUser(TARGET.id);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized_NoRow', async () => {
    noSession();
    const res = await actions.followUser(TARGET.id);
    expect(res.error).toBe('Unauthorized');
    expect(await followRows()).toHaveLength(0);
  });

  it('Success_CallsUpdateTagUserFollowsOnce', async () => {
    await actions.followUser(TARGET.id);
    expect(updateTag.mock.calls).toEqual([['user_follows']]);
  });

  it('EarlyReturns_DoNotCallUpdateTag', async () => {
    noSession();
    await actions.followUser(TARGET.id);
    asViewer();
    await actions.followUser(VIEWER.id);
    await seedBlock(db, VIEWER.id, TARGET.id);
    await actions.followUser(TARGET.id);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('InsertThrows_ReturnsFailed_NoUpdateTag', async () => {
    const res = await actions.followUser('ghost-user-id');
    expect(res.error).toBe('Failed');
    expect(await followRows()).toHaveLength(0);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('unfollowUser', () => {
  it('Following_DeletesRow', async () => {
    await seedFollow(db, VIEWER.id, TARGET.id);
    const res = await actions.unfollowUser(TARGET.id);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
  });

  it('NotFollowing_NoOpSuccess', async () => {
    const res = await actions.unfollowUser(TARGET.id);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.unfollowUser(TARGET.id);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTagUserFollowsOnce_EarlyReturnDoesNot', async () => {
    await actions.unfollowUser(TARGET.id);
    expect(updateTag.mock.calls).toEqual([['user_follows']]);
    updateTag.mockClear();
    noSession();
    await actions.unfollowUser(TARGET.id);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('DeleteThrows_ReturnsFailed_NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.unfollowUser(TARGET.id);
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('removeFollower', () => {
  it('FollowerExists_DeletesInvertedRow', async () => {
    await seedFollow(db, TARGET.id, VIEWER.id);
    await seedFollow(db, VIEWER.id, TARGET.id);
    const res = await actions.removeFollower(TARGET.id);
    expect(res.success).toBe(true);
    const rows = await followRows();
    expect(rows).toEqual([
      expect.objectContaining({
        follower_id: VIEWER.id,
        followee_id: TARGET.id,
      }),
    ]);
  });

  it('NoSuchFollower_NoOpSuccess', async () => {
    const res = await actions.removeFollower(TARGET.id);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.removeFollower(TARGET.id);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTag', async () => {
    await actions.removeFollower(TARGET.id);
    expect(updateTag.mock.calls).toEqual([['user_follows']]);
  });

  it('DeleteThrows_ReturnsFailed_NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.removeFollower(TARGET.id);
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('blockUser', () => {
  it('Authed_InsertsBlockRow_AndDeletesBothFollowDirections', async () => {
    await seedFollow(db, VIEWER.id, TARGET.id);
    await seedFollow(db, TARGET.id, VIEWER.id);
    const res = await actions.blockUser(TARGET.id);
    expect(res.success).toBe(true);
    expect(await blockRows()).toEqual([
      expect.objectContaining({
        blocker_id: VIEWER.id,
        blocked_id: TARGET.id,
      }),
    ]);
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockFirstOrdering_RacingFollowStillGated', async () => {
    await actions.blockUser(TARGET.id);
    asTarget();
    const res = await actions.followUser(VIEWER.id);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('Reblock_CleansLeftoverFollowRowIdempotently', async () => {
    await actions.blockUser(TARGET.id);
    await seedFollow(db, TARGET.id, VIEWER.id);
    const res = await actions.blockUser(TARGET.id);
    expect(res.success).toBe(true);
    expect(await followRows()).toHaveLength(0);
    expect(await blockRows()).toHaveLength(1);
  });

  it('SelfBlock_ReturnsInvalid_NoRows', async () => {
    const res = await actions.blockUser(VIEWER.id);
    expect(res.error).toBe('Invalid');
    expect(await blockRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.blockUser(TARGET.id);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTagUserFollowsAndUserBlocksOnceEach', async () => {
    await actions.blockUser(TARGET.id);
    expect(updateTag.mock.calls).toEqual([['user_follows'], ['user_blocks']]);
  });

  it('StatementThrows_NeitherUpdateTagFires', async () => {
    const res = await actions.blockUser('ghost-user-id');
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('unblockUser', () => {
  it('Blocked_DeletesBlockRow', async () => {
    await seedBlock(db, VIEWER.id, TARGET.id);
    const res = await actions.unblockUser(TARGET.id);
    expect(res.success).toBe(true);
    expect(await blockRows()).toHaveLength(0);
  });

  it('NotBlocked_NoOpSuccess', async () => {
    const res = await actions.unblockUser(TARGET.id);
    expect(res.success).toBe(true);
    expect(await blockRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.unblockUser(TARGET.id);
    expect(res.error).toBe('Unauthorized');
  });

  it('Success_CallsUpdateTagUserBlocksOnly', async () => {
    await actions.unblockUser(TARGET.id);
    expect(updateTag.mock.calls).toEqual([['user_blocks']]);
  });

  it('DeleteThrows_ReturnsFailed_NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.unblockUser(TARGET.id);
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('no interactive transactions', () => {
  it('NoCodePath_UsesTransactionApi', async () => {
    const txSpy = vi.fn();
    (db as unknown as { transaction: unknown }).transaction = txSpy;
    await seedFollow(db, TARGET.id, VIEWER.id);
    await actions.followUser(TARGET.id);
    await actions.unfollowUser(TARGET.id);
    await actions.removeFollower(TARGET.id);
    await actions.blockUser(TARGET.id);
    await actions.unblockUser(TARGET.id);
    expect(txSpy).not.toHaveBeenCalled();
  });
});
