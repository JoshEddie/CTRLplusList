import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers, selfProfileOf } from '@/test/helpers/seedFollowGraph';

import {
  seedItem,
  seedItemImages,
  seedItemStore,
  seedList,
  seedListItem,
  seedPurchase,
  type TestDb,
} from './test-helpers';

mockNextCache();

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let dal: typeof import('@/lib/data/item');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/data/item');
});

beforeEach(async () => {
  // db is shared per-file, so restore spies first or they leak between tests.
  vi.restoreAllMocks();
  await resetDb(db);
});

describe('getItemsByProfile', () => {
  describe('FilterMatrix', () => {
    it('DefaultFilter_ReturnsActiveOnly', async () => {
      await seedUsers(db, [{ id: 'u' }]);
      await seedItem(db, { id: 'active', user_id: 'u' });
      await seedItem(db, {
        id: 'archived',
        user_id: 'u',
        archived_at: new Date('2021-01-01'),
      });

      const rows = await dal.getItemsByProfile(selfProfileOf('u'));
      expect(rows.map((r) => r.id)).toEqual(['active']);
    });

    it('FilterArchived_ReturnsArchivedOnly', async () => {
      await seedUsers(db, [{ id: 'u' }]);
      await seedItem(db, { id: 'active', user_id: 'u' });
      await seedItem(db, {
        id: 'archived',
        user_id: 'u',
        archived_at: new Date('2021-01-01'),
      });

      const rows = await dal.getItemsByProfile(selfProfileOf('u'), { filter: 'archived' });
      expect(rows.map((r) => r.id)).toEqual(['archived']);
    });

    it('FilterAll_ReturnsActiveAndArchived', async () => {
      await seedUsers(db, [{ id: 'u' }]);
      await seedItem(db, {
        id: 'active',
        user_id: 'u',
        created_at: new Date('2022-01-01'),
      });
      await seedItem(db, {
        id: 'archived',
        user_id: 'u',
        created_at: new Date('2021-01-01'),
        archived_at: new Date('2021-06-01'),
      });

      const rows = await dal.getItemsByProfile(selfProfileOf('u'), { filter: 'all' });
      expect(rows.map((r) => r.id)).toEqual(['active', 'archived']);
    });
  });

  it('MultipleItems_OrderedByCreatedAtDesc-LowestPricedStoreSelected', async () => {
    await seedUsers(db, [{ id: 'u' }]);
    await seedItem(db, {
      id: 'old',
      user_id: 'u',
      created_at: new Date('2020-01-01'),
    });
    await seedItem(db, {
      id: 'new',
      user_id: 'u',
      created_at: new Date('2022-01-01'),
    });
    await seedItemStore(db, {
      id: 's2',
      item_id: 'new',
      name: 'second',
      price: '5',
      order: 2,
    });
    await seedItemStore(db, {
      id: 's1',
      item_id: 'new',
      name: 'first',
      price: '10',
      order: 1,
    });

    const rows = await dal.getItemsByProfile(selfProfileOf('u'));
    expect(rows.map((r) => r.id)).toEqual(['new', 'old']);
    expect(rows[0].store?.name).toBe('second');
    expect(rows[1].store).toBeNull();
  });

  describe('OwnerSpoilers', () => {
    it('SpoilersOff_ReturnsEmptyPurchases-HasPurchasesTrue', async () => {
      await seedUsers(db, [{ id: 'owner' }, { id: 'claimer', name: 'Cara' }]);
      await seedItem(db, { id: 'gift', user_id: 'owner' });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'gift',
        profile_id: selfProfileOf('claimer'),
      });

      const rows = await dal.getItemsByProfile(selfProfileOf('owner'));
      expect(rows[0].purchases).toEqual([]);
      expect(rows[0].hasPurchases).toBe(true);
    });

    it('SpoilersOn_ReturnsFirstNameOtherRows', async () => {
      await seedUsers(db, [
        { id: 'owner' },
        { id: 'claimer', name: 'Cara Lee' },
      ]);
      await seedItem(db, { id: 'gift', user_id: 'owner' });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'gift',
        profile_id: selfProfileOf('claimer'),
      });

      const rows = await dal.getItemsByProfile(selfProfileOf('owner'), { showSpoilers: true });
      expect(rows[0].purchases).toEqual([
        {
          id: 'p1',
          by: 'other',
          firstName: 'Cara',
          claimedByViewer: false,
          purchasedAt: expect.any(Date),
          image: null,
        },
      ]);
      expect(rows[0].hasPurchases).toBe(true);
    });
  });

  it('QueryThrows_RejectsWithRawError', async () => {
    vi.spyOn(db.query.items, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getItemsByProfile(selfProfileOf('u'))).rejects.toThrow('boom');
  });
});

describe('getItemById', () => {
  it('ExistingItem_ReshapesListMembershipsWithPosition-SelectsLowestPricedStore', async () => {
    await seedUsers(db, [{ id: 'u' }]);
    await seedItem(db, { id: 'i1', user_id: 'u', quantity_limit: 3 });
    await seedList(db, { id: 'l1', user_id: 'u' });
    await seedList(db, { id: 'l2', user_id: 'u' });
    await seedListItem(db, { list_id: 'l1', item_id: 'i1', position: 5 });
    await seedListItem(db, { list_id: 'l2', item_id: 'i1', position: 9 });
    await seedItemStore(db, {
      id: 's2',
      item_id: 'i1',
      name: 'second',
      price: '5',
      order: 2,
    });
    await seedItemStore(db, {
      id: 's1',
      item_id: 'i1',
      name: 'first',
      price: '10',
      order: 1,
    });

    const item = await dal.getItemById('i1', selfProfileOf('u'));
    expect(item?.id).toBe('i1');
    expect(item?.quantity_limit).toBe(3);
    expect(item?.store?.name).toBe('second');
    const byListId = Object.fromEntries(
      (item?.lists ?? []).map((l) => [l.id, l.position])
    );
    expect(byListId).toEqual({ l1: 5, l2: 9 });
  });

  it('ItemWithImagePool_ReturnsCandidatesInInsertionOrder-ActiveAsImageUrl', async () => {
    await seedUsers(db, [{ id: 'u' }]);
    await seedItem(db, { id: 'i1', user_id: 'u' });
    await seedItemImages(
      db,
      'i1',
      ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
      'https://img.test/b.jpg'
    );

    const item = await dal.getItemById('i1', selfProfileOf('u'));
    expect(item?.image_candidates).toEqual([
      'https://img.test/a.jpg',
      'https://img.test/b.jpg',
    ]);
    // image_url is sourced from the active row, not items.image_url.
    expect(item?.image_url).toBe('https://img.test/b.jpg');
  });

  it('ItemWithoutImagePool_ReturnsEmptyCandidates-NullImageUrl', async () => {
    await seedUsers(db, [{ id: 'u' }]);
    await seedItem(db, { id: 'i1', user_id: 'u' });
    const item = await dal.getItemById('i1', selfProfileOf('u'));
    expect(item?.image_candidates).toEqual([]);
    expect(item?.image_url).toBeNull();
  });

  it('UnknownId_ReturnsUndefined', async () => {
    await seedUsers(db, [{ id: 'u' }]);
    expect(await dal.getItemById('missing', selfProfileOf('u'))).toBeUndefined();
  });

  it('QueryThrows_RejectsWithRawError', async () => {
    vi.spyOn(db.query.items, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getItemById('i1', selfProfileOf('u'))).rejects.toThrow('boom');
  });
});

describe('getItemsByListId', () => {
  it('MultipleMemberships_OrderedByPositionAsc', async () => {
    await seedUsers(db, [{ id: 'u' }]);
    await seedList(db, { id: 'l1', user_id: 'u' });
    await seedItem(db, { id: 'first', user_id: 'u' });
    await seedItem(db, { id: 'second', user_id: 'u' });
    await seedListItem(db, { list_id: 'l1', item_id: 'second', position: 2 });
    await seedListItem(db, { list_id: 'l1', item_id: 'first', position: 1 });

    const rows = await dal.getItemsByListId('l1');
    expect(rows.map((r) => r.id)).toEqual(['first', 'second']);
  });

  it('ItemWithStores_MapsScalarPrimaryStore', async () => {
    await seedUsers(db, [{ id: 'u' }]);
    await seedList(db, { id: 'l1', user_id: 'u' });
    await seedItem(db, { id: 'i1', user_id: 'u' });
    await seedListItem(db, { list_id: 'l1', item_id: 'i1', position: 1 });
    await seedItemStore(db, {
      id: 's2',
      item_id: 'i1',
      name: 'pricey',
      price: '10',
      order: 2,
    });
    await seedItemStore(db, {
      id: 's1',
      item_id: 'i1',
      name: 'cheap',
      price: '5',
      order: 1,
    });

    const rows = await dal.getItemsByListId('l1');
    expect(rows[0].store?.name).toBe('cheap');
  });

  describe('SanitizeMatrix', () => {
    async function seedClaimedItem(): Promise<void> {
      await seedUsers(db, [
        { id: 'owner' },
        { id: 'viewer', name: 'Vic' },
        { id: 'other', name: 'Otto' },
      ]);
      await seedList(db, { id: 'l1', user_id: 'owner' });
      await seedItem(db, { id: 'i1', user_id: 'owner', quantity_limit: 2 });
      await seedListItem(db, { list_id: 'l1', item_id: 'i1', position: 1 });
      await seedPurchase(db, {
        id: 'pv',
        item_id: 'i1',
        profile_id: selfProfileOf('viewer'),
      });
      await seedPurchase(db, {
        id: 'po',
        item_id: 'i1',
        profile_id: selfProfileOf('other'),
      });
    }

    it('OwnerNoSpoilers_ReturnsEmptyPurchases', async () => {
      await seedClaimedItem();
      const rows = await dal.getItemsByListId('l1', { isOwner: true });
      expect(rows[0].purchases).toEqual([]);
    });

    it('OwnerWithSpoilers_ReturnsFirstNameOtherRows', async () => {
      await seedClaimedItem();
      const rows = await dal.getItemsByListId('l1', {
        isOwner: true,
        showSpoilers: true,
      });
      const tags = rows[0].purchases.map((p) => p.by);
      expect(tags).toEqual(['other', 'other']);
    });

    it('NonOwnerWithViewerId_TagsSelfAndOther', async () => {
      await seedClaimedItem();
      const rows = await dal.getItemsByListId('l1', {
        viewerProfileId: selfProfileOf('viewer'),
      });
      const byId = Object.fromEntries(rows[0].purchases.map((p) => [p.id, p]));
      expect(byId.pv).toEqual({
        id: 'pv',
        by: 'self',
        firstName: 'Vic',
        claimedByViewer: false,
        purchasedAt: expect.any(Date),
        image: null,
      });
      expect(byId.po).toEqual({
        id: 'po',
        by: 'other',
        firstName: 'Otto',
        claimedByViewer: false,
        purchasedAt: expect.any(Date),
        image: null,
      });
    });

    it('NonOwnerNoViewerId_TagsAllOther', async () => {
      await seedClaimedItem();
      const rows = await dal.getItemsByListId('l1');
      expect(rows[0].purchases.map((p) => p.by)).toEqual(['other', 'other']);
    });

    it('NonOwnerGuestClaim_ProjectsGuestFirstName', async () => {
      // Guest claim (profile_id null) drives the non-owner branch's
      // `p.purchaserProfile?.name ?? p.guest_name` fallback to the guest name.
      await seedUsers(db, [{ id: 'owner' }, { id: 'viewer' }]);
      await seedList(db, { id: 'l1', user_id: 'owner' });
      await seedItem(db, { id: 'i1', user_id: 'owner', quantity_limit: 2 });
      await seedListItem(db, { list_id: 'l1', item_id: 'i1', position: 1 });
      await seedPurchase(db, {
        id: 'pg',
        item_id: 'i1',
        guest_name: 'Gabby Guest',
      });

      const rows = await dal.getItemsByListId('l1', {
        viewerProfileId: selfProfileOf('viewer'),
      });
      expect(rows[0].purchases).toEqual([
        {
          id: 'pg',
          by: 'other',
          firstName: 'Gabby',
          claimedByViewer: false,
          purchasedAt: expect.any(Date),
          image: null,
        },
      ]);
    });
  });

  it('QueryThrows_RejectsWithFetchItemsError', async () => {
    vi.spyOn(db.query.list_items, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getItemsByListId('l1')).rejects.toThrow(
      'Failed to fetch items'
    );
  });
});

// Drives the private firstNameOf projection through getItemsByProfile
// owner+spoilers (every claim maps to {by:'other', firstName}); covers the
// falsy/whitespace/multi-word name branches and both sides of
// `p.purchaserProfile?.name ?? p.guest_name`.
describe('firstNameOf', () => {
  it('VariedClaimerNames_ProjectsFirstTokenElseSomeone', async () => {
    // seedUsers coalesces a null name to the id, so the null-name branch is
    // reached via a guest purchase with no guest_name (user null, guest null).
    await seedUsers(db, [
      { id: 'owner' },
      { id: 'full', name: 'Alice Smith' },
      { id: 'empty', name: '' },
      { id: 'spaces', name: '   ' },
    ]);
    const userClaimers: Record<string, string> = {
      iFull: 'full',
      iEmpty: 'empty',
      iSpaces: 'spaces',
    };
    for (const [itemId, userId] of Object.entries(userClaimers)) {
      await seedItem(db, { id: itemId, user_id: 'owner' });
      await seedPurchase(db, {
        id: `p-${itemId}`,
        item_id: itemId,
        profile_id: selfProfileOf(userId),
      });
    }
    // Guest claim with a name: exercises the `?? p.guest_name` fallback (right side).
    await seedItem(db, { id: 'iGuest', user_id: 'owner' });
    await seedPurchase(db, {
      id: 'p-iGuest',
      item_id: 'iGuest',
      guest_name: 'Charlie Brown',
    });
    // Guest claim with no name at all: purchaser profile and guest_name both
    // null → 'Someone'.
    await seedItem(db, { id: 'iNull', user_id: 'owner' });
    await seedPurchase(db, { id: 'p-iNull', item_id: 'iNull' });

    const rows = await dal.getItemsByProfile(selfProfileOf('owner'), { showSpoilers: true });
    const firstNameByItem = Object.fromEntries(
      rows.map((r) => [r.id, r.purchases[0]?.firstName])
    );
    expect(firstNameByItem).toEqual({
      iFull: 'Alice',
      iEmpty: 'Someone',
      iSpaces: 'Someone',
      iGuest: 'Charlie',
      iNull: 'Someone',
    });
  });
});
