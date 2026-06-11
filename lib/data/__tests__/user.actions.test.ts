import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { lists, user_blocks, user_follows } from '@/db/schema';
import { auth, signIn, signOut } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedBlock, seedFollow, seedUsers } from '@/test/helpers/seedFollowGraph';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { seedItem, seedList, seedListItem } from './test-helpers';

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

// Real Next `redirect()` throws to abort the request; production code relies on
// nothing running after it. The mock mirrors that with a tagged sentinel the
// test catches via `rejects.toThrow`.
class RedirectSignal extends Error {
  constructor(public target: string) {
    super(`__redirect:${target}__`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new RedirectSignal(target);
  }),
}));

const VIEWER = { id: 'viewer', email: 'viewer@test.local' };
const TARGET = { id: 'target', email: 'target@test.local' };
const THIRD = { id: 'third', email: 'third@test.local' };

let db: TestDb;
let actions: typeof import('@/lib/data/user.actions');
let signInUser: typeof import('@/lib/data/user.actions').signInUser;
let signOutUser: typeof import('@/lib/data/user.actions').signOutUser;
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
  actions = await import('@/lib/data/user.actions');
  ({ signInUser, signOutUser } = actions);
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
  vi.mocked(signIn).mockReset();
  vi.mocked(signOut).mockReset();
  vi.mocked(redirect).mockClear();
});

describe('signInUser', () => {
  it('Invoked_DelegatesToSignInWithGoogleProvider', async () => {
    await signInUser();
    expect(signIn).toHaveBeenCalledExactlyOnceWith('google');
  });

  it('Invoked_DoesNotCallSignOutOrRedirect', async () => {
    await signInUser();
    expect(signOut).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('signOutUser', () => {
  it('Invoked_CallsSignOutWithRedirectFalse', async () => {
    await expect(signOutUser()).rejects.toThrow(/__redirect:\/sign-in__/);
    expect(signOut).toHaveBeenCalledExactlyOnceWith({ redirect: false });
  });

  it('Invoked_RedirectsToSignIn', async () => {
    await expect(signOutUser()).rejects.toThrow(/__redirect:\/sign-in__/);
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/sign-in');
  });

  it('Invoked_ClearsSessionBeforeRedirect', async () => {
    await expect(signOutUser()).rejects.toThrow(/__redirect:\/sign-in__/);
    expect(vi.mocked(signOut).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(redirect).mock.invocationCallOrder[0],
    );
  });

  it('Invoked_DoesNotCallSignIn', async () => {
    await expect(signOutUser()).rejects.toThrow(/__redirect:\/sign-in__/);
    expect(signIn).not.toHaveBeenCalled();
  });
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

  it('SelfFollow_ReturnsInvalid-NoRow', async () => {
    const res = await actions.followUser(VIEWER.id);
    expect(res.error).toBe('Invalid');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockedByTarget_ReturnsBlocked-NoRow', async () => {
    await seedBlock(db, TARGET.id, VIEWER.id);
    const res = await actions.followUser(TARGET.id);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('BlockedViewer_ReturnsBlocked-NoRow', async () => {
    await seedBlock(db, VIEWER.id, TARGET.id);
    const res = await actions.followUser(TARGET.id);
    expect(res.error).toBe('Blocked');
    expect(await followRows()).toHaveLength(0);
  });

  it('NoSession_ReturnsUnauthorized-NoRow', async () => {
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

  it('InsertThrows_ReturnsFailed-NoUpdateTag', async () => {
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

  it('Success_CallsUpdateTagUserFollowsOnce', async () => {
    await actions.unfollowUser(TARGET.id);
    expect(updateTag.mock.calls).toEqual([['user_follows']]);
  });

  it('EarlyReturns_DoNotCallUpdateTag', async () => {
    noSession();
    await actions.unfollowUser(TARGET.id);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('DeleteThrows_ReturnsFailed-NoUpdateTag', async () => {
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

  it('OnlySeversEdgeWhereActorIsFollowee_LeavesThirdPartyEdgeIntact', async () => {
    // server-endpoint-authorization SHALL: removeFollower(B) deletes only the
    // (follower=B, followee=actor) edge. An edge from B to a third user C —
    // where the actor is not the followee — must survive, so a caller cannot
    // sever follow relationships between two other users.
    await seedFollow(db, TARGET.id, VIEWER.id);
    await seedFollow(db, TARGET.id, THIRD.id);
    const res = await actions.removeFollower(TARGET.id);
    expect(res.success).toBe(true);
    expect(await followRows()).toEqual([
      expect.objectContaining({
        follower_id: TARGET.id,
        followee_id: THIRD.id,
      }),
    ]);
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

  it('DeleteThrows_ReturnsFailed-NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.removeFollower(TARGET.id);
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('blockUser', () => {
  it('Authed_InsertsBlockRow-DeletesBothFollowDirections', async () => {
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

  it('SelfBlock_ReturnsInvalid-NoRows', async () => {
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

  it('DeleteThrows_ReturnsFailed-NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.unblockUser(TARGET.id);
    expect(res.error).toBe('Failed');
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('NoInteractiveTransactions', () => {
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

describe('getClaimPickerForItem', () => {
  beforeEach(async () => {
    // TARGET owns a public list+item; THIRD is TARGET's mutual, so THIRD is
    // the eligible pool for VIEWER's picker.
    await seedList(db, { id: 'L', user_id: TARGET.id, visibility: 'public' });
    await seedItem(db, { id: 'I', user_id: TARGET.id });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
    await seedFollow(db, TARGET.id, THIRD.id);
    await seedFollow(db, THIRD.id, TARGET.id);
  });

  it('AuthedViewerOnViewableItem_ReturnsOwnerNameAndMutualPool', async () => {
    const picker = await actions.getClaimPickerForItem('I');
    expect(picker).toEqual({
      ownerName: 'target',
      pool: [{ id: THIRD.id, name: 'third', image: null }],
    });
  });

  it('Unauthenticated_ReturnsNull', async () => {
    noSession();
    expect(await actions.getClaimPickerForItem('I')).toBeNull();
  });

  it('NonViewableItem_ReturnsNull', async () => {
    await db
      .update(lists)
      .set({ visibility: 'private' })
      .where(eq(lists.id, 'L'));
    expect(await actions.getClaimPickerForItem('I')).toBeNull();
  });

  it('ItemDeletedBetweenViewabilityCheckAndRefetch_ReturnsNull', async () => {
    // isItemViewable's findFirst hits the real db; the picker's own re-fetch
    // then sees the item gone (separate round-trips under neon-http).
    const realFindFirst = db.query.items.findFirst.bind(db.query.items);
    vi.spyOn(db.query.items, 'findFirst')
      .mockImplementationOnce(realFindFirst)
      .mockResolvedValueOnce(undefined as never);
    expect(await actions.getClaimPickerForItem('I')).toBeNull();
  });

  it('QueryThrows_ReturnsNullWithoutThrowing', async () => {
    vi.spyOn(db.query.items, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(actions.getClaimPickerForItem('I')).resolves.toBeNull();
  });
});
