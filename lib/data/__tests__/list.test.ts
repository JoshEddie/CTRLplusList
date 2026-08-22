import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { VISIBILITY } from '@/lib/visibility';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers, selfProfileOf } from '@/test/helpers/seedFollowGraph';

import { seedItem, seedList, seedListItem } from './test-helpers';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let dal: typeof import('@/lib/data/list');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/data/list');
});

beforeEach(async () => {
  // db is shared per-file, so restore spies first or they leak between tests.
  vi.restoreAllMocks();
  await resetDb(db);
});

describe('getList', () => {
  it('ExistingList_ReturnsListWithProfileJoin-ItemCount-DecodedVisibility', async () => {
    await seedUsers(db, [
      { id: 'owner', name: 'Owen', email: 'owen@test.local', image: 'o.png' },
    ]);
    await seedList(db, { id: 'l1', user_id: 'owner', visibility: 'public' });
    await seedItem(db, { id: 'i1', user_id: 'owner' });
    await seedItem(db, { id: 'i2', user_id: 'owner' });
    await seedListItem(db, { list_id: 'l1', item_id: 'i1', position: 1 });
    await seedListItem(db, { list_id: 'l1', item_id: 'i2', position: 2 });

    const list = await dal.getList('l1');
    expect(list?.profile).toEqual({
      id: selfProfileOf('owner'),
      name: 'Owen',
      members: [{ user: { image: 'o.png' } }],
    });
    expect(list?.items).toHaveLength(2);
    expect(list?.items.map((i) => i.item_id).sort()).toEqual(['i1', 'i2']);
    expect(list?.visibility).toBe(VISIBILITY.FOLLOWERS);
  });

  it('UnknownId_ReturnsUndefined', async () => {
    expect(await dal.getList('missing')).toBeUndefined();
  });

  it('QueryThrows_RejectsWithFetchListError', async () => {
    vi.spyOn(db.query.lists, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getList('l1')).rejects.toThrow('Failed to fetch list');
  });
});

describe('getListsByProfile', () => {
  it('OwnLists_OrderedByUpdatedAtDescNotCreatedAt-ExcludesOtherProfiles', async () => {
    await seedUsers(db, [{ id: 'owner' }, { id: 'other' }]);
    // created_at and updated_at deliberately disagree: ordering by created_at
    // would yield ['b', 'a']; the correct updated_at DESC yields ['a', 'b'].
    await seedList(db, {
      id: 'a',
      user_id: 'owner',
      created_at: new Date('2020-01-01'),
      updated_at: new Date('2023-01-01'),
    });
    await seedList(db, {
      id: 'b',
      user_id: 'owner',
      created_at: new Date('2022-01-01'),
      updated_at: new Date('2021-01-01'),
    });
    await seedList(db, { id: 'foreign', user_id: 'other' });

    const rows = await dal.getListsByProfile(selfProfileOf('owner'));
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(rows[0].profile.id).toBe(selfProfileOf('owner'));
  });

  it('QueryThrows_RejectsWithFetchListsError', async () => {
    vi.spyOn(db.query.lists, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getListsByProfile(selfProfileOf('owner'))).rejects.toThrow(
      'Failed to fetch lists'
    );
  });
});

describe('getListsSharedByProfile', () => {
  it('LinkAndFollowersLists_ReturnedOrderedByCreatedAtDesc-ExcludesOwnerOnly', async () => {
    await seedUsers(db, [{ id: 'owner' }]);
    await seedList(db, {
      id: 'priv',
      user_id: 'owner',
      visibility: 'private',
      created_at: new Date('2023-01-01'),
    });
    await seedList(db, {
      id: 'link',
      user_id: 'owner',
      visibility: 'unlisted',
      created_at: new Date('2020-01-01'),
    });
    await seedList(db, {
      id: 'followers',
      user_id: 'owner',
      visibility: 'public',
      created_at: new Date('2022-01-01'),
    });

    const rows = await dal.getListsSharedByProfile(selfProfileOf('owner'));
    expect(rows.map((r) => r.id)).toEqual(['followers', 'link']);
  });

  it('QueryThrows_RejectsWithFetchListsError', async () => {
    vi.spyOn(db.query.lists, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(
      dal.getListsSharedByProfile(selfProfileOf('owner'))
    ).rejects.toThrow('Failed to fetch lists');
  });
});

describe('getPublicListsByProfile', () => {
  it('FollowersLists_OnlyReturnedOrderedBySharedAtDesc-ProfileProjection', async () => {
    await seedUsers(db, [
      { id: 'owner', name: 'Owen', image: 'o.png', profile_name: 'Not Owen' },
    ]);
    await seedList(db, { id: 'priv', user_id: 'owner', visibility: 'private' });
    await seedList(db, {
      id: 'link',
      user_id: 'owner',
      visibility: 'unlisted',
    });
    await seedList(db, {
      id: 'older',
      user_id: 'owner',
      visibility: 'public',
      shared_at: new Date('2020-01-01'),
    });
    await seedList(db, {
      id: 'newer',
      user_id: 'owner',
      visibility: 'public',
      shared_at: new Date('2022-01-01'),
    });

    const rows = await dal.getPublicListsByProfile(selfProfileOf('owner'));
    expect(rows.map((r) => r.id)).toEqual(['newer', 'older']);
    expect(rows[0].profile).toEqual({
      id: selfProfileOf('owner'),
      name: 'Not Owen',
      members: [{ user: { image: 'o.png' } }],
    });
  });

  it('Limit_CapsResultToNewestShared', async () => {
    await seedUsers(db, [{ id: 'owner' }]);
    await seedList(db, {
      id: 'a',
      user_id: 'owner',
      visibility: 'public',
      shared_at: new Date('2023-01-01'),
    });
    await seedList(db, {
      id: 'b',
      user_id: 'owner',
      visibility: 'public',
      shared_at: new Date('2022-01-01'),
    });
    await seedList(db, {
      id: 'c',
      user_id: 'owner',
      visibility: 'public',
      shared_at: new Date('2021-01-01'),
    });

    const page = await dal.getPublicListsByProfile(selfProfileOf('owner'), {
      limit: 2,
    });
    expect(page.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('QueryThrows_RejectsWithFetchPublicListsError', async () => {
    vi.spyOn(db.query.lists, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(
      dal.getPublicListsByProfile(selfProfileOf('owner'))
    ).rejects.toThrow('Failed to fetch public lists');
  });
});
