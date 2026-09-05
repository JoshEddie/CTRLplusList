import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedAvatar,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';

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

      const rows = await dal.getItemsByProfile(selfProfileOf('u'), {
        filter: 'archived',
      });
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

      const rows = await dal.getItemsByProfile(selfProfileOf('u'), {
        filter: 'all',
      });
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

  describe('SpoilerTier', () => {
    beforeEach(async () => {
      await seedUsers(db, [
        { id: 'owner' },
        { id: 'claimer', name: 'Cara Lee' },
      ]);
      await seedAvatar(db, selfProfileOf('claimer'), {
        art: '<svg id="cara" />',
      });
      await seedItem(db, { id: 'gift', user_id: 'owner' });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'gift',
        profile_id: selfProfileOf('claimer'),
      });
    });

    it('Surprise_ReturnsEmptyPurchases-HasPurchasesFalse', async () => {
      const rows = await dal.getItemsByProfile(selfProfileOf('owner'), {
        tier: 'surprise',
      });
      expect(rows[0].purchases).toEqual([]);
      // `hasPurchases` now reflects only what the tier discloses: an item
      // carrying only others' claims below `claims` reads as unclaimed.
      expect(rows[0].hasPurchases).toBe(false);
    });

    it('Claims_ReturnsBareCountEntry-HasPurchasesTrue', async () => {
      const rows = await dal.getItemsByProfile(selfProfileOf('owner'), {
        tier: 'claims',
      });
      expect(rows[0].purchases).toEqual([
        { id: 'p1', by: 'other', claimedByViewer: false },
      ]);
      expect(rows[0].hasPurchases).toBe(true);
    });
  });

  it('QueryThrows_RejectsWithRawError', async () => {
    vi.spyOn(db.query.items, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getItemsByProfile(selfProfileOf('u'))).rejects.toThrow(
      'boom'
    );
  });
});

describe('getItemById', () => {
  it('ExistingItem_ReshapesListMembershipsWithPosition-SelectsLowestPricedStore', async () => {
    await seedUsers(db, [{ id: 'u' }]);
    await seedItem(db, { id: 'i1', user_id: 'u' });
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
    expect(
      await dal.getItemById('missing', selfProfileOf('u'))
    ).toBeUndefined();
  });

  it('QueryThrows_RejectsWithRawError', async () => {
    vi.spyOn(db.query.items, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getItemById('i1', selfProfileOf('u'))).rejects.toThrow(
      'boom'
    );
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

  it('ItemProfileDiffersFromList_ExcludedFromMembership', async () => {
    await seedUsers(db, [{ id: 'owner' }, { id: 'stranger' }]);
    await seedList(db, { id: 'l1', user_id: 'owner' });
    await seedItem(db, { id: 'mine', user_id: 'owner' });
    await seedItem(db, { id: 'theirs', user_id: 'stranger' });
    await seedListItem(db, { list_id: 'l1', item_id: 'mine', position: 1 });
    await seedListItem(db, { list_id: 'l1', item_id: 'theirs', position: 2 });

    const rows = await dal.getItemsByListId('l1');
    expect(rows.map((r) => r.id)).toEqual(['mine']);
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
      await seedItem(db, { id: 'i1', user_id: 'owner' });
      await seedListItem(db, {
        list_id: 'l1',
        item_id: 'i1',
        position: 1,
        quantity: 2,
      });
      await seedPurchase(db, {
        id: 'pv',
        item_id: 'i1',
        list_id: 'l1',
        profile_id: selfProfileOf('viewer'),
      });
      await seedPurchase(db, {
        id: 'po',
        item_id: 'i1',
        list_id: 'l1',
        profile_id: selfProfileOf('other'),
      });
    }

    it('SurpriseNoViewerId_ReturnsEmptyPurchases-HasPurchasesFalse', async () => {
      await seedClaimedItem();
      const rows = await dal.getItemsByListId('l1', { tier: 'surprise' });
      expect(rows[0].purchases).toEqual([]);
      // No viewer id, so neither claim is held: `hasPurchases` reflects the
      // empty projection rather than the unprojected rows.
      expect(rows[0].hasPurchases).toBe(false);
    });

    it('Claims_ReturnsCountWithNoFirstName', async () => {
      await seedClaimedItem();
      const rows = await dal.getItemsByListId('l1', { tier: 'claims' });
      expect(rows[0].purchases).toHaveLength(2);
      expect(rows[0].purchases.map((p) => p.name)).toEqual([
        undefined,
        undefined,
      ]);
    });

    // The cached raw read is entered once for the list; each viewer's rows are
    // projected separately, outside it — two viewers with differing tiers each
    // get their own projection.
    it('TwoViewersDifferingTiers_ProjectSeparatelyOverOneCachedRead', async () => {
      await seedClaimedItem();
      const viewerRows = await dal.getItemsByListId('l1', {
        viewerSelfProfileId: selfProfileOf('viewer'),
        tier: 'surprise',
      });
      const otherRows = await dal.getItemsByListId('l1', {
        viewerSelfProfileId: selfProfileOf('other'),
        tier: 'claims',
      });
      // 'viewer' at surprise keeps only their own held claim; 'other' at
      // claims sees both, their own as self and the viewer's as a bare count.
      expect(viewerRows[0].purchases.map((p) => p.by)).toEqual(['self']);
      expect(otherRows[0].purchases.map((p) => p.by)).toEqual([
        'other',
        'self',
      ]);
    });

    it('Claims_CarriesTheEntrysQuantityAndClaimedUnits', async () => {
      await seedClaimedItem();
      const [row] = await dal.getItemsByListId('l1', { tier: 'claims' });
      expect(row).toMatchObject({
        list_id: 'l1',
        quantity: 2,
        claimed_units: 2,
      });
    });

    // Units, not rows: with one unit per claim a sum and a count agree, so
    // this is the only fixture that would fail if the read counted rows.
    it('ClaimCoveringSeveralUnits_ClaimedUnitsExceedsTheClaimCount', async () => {
      await seedClaimedItem();
      await seedPurchase(db, {
        id: 'pb',
        item_id: 'i1',
        list_id: 'l1',
        units: 3,
        guest_name: 'Bulk Buyer',
      });

      const [row] = await dal.getItemsByListId('l1', { tier: 'claims' });
      expect(row.purchases).toHaveLength(3);
      expect(row.claimed_units).toBe(5);
    });

    it('Surprise_WithholdsClaimedUnits', async () => {
      await seedClaimedItem();
      const [row] = await dal.getItemsByListId('l1', { tier: 'surprise' });
      expect(row.claimed_units).toBeUndefined();
    });

    it('ClaimOnAnotherListOfASharedItem_IsNeitherProjectedNorCounted', async () => {
      await seedClaimedItem();
      await seedList(db, { id: 'l2', user_id: 'owner' });
      await seedListItem(db, { list_id: 'l2', item_id: 'i1', position: 1 });
      await seedPurchase(db, {
        id: 'pe',
        item_id: 'i1',
        list_id: 'l2',
        guest_name: 'Elsewhere',
      });

      const [row] = await dal.getItemsByListId('l1', { tier: 'claims' });
      expect(row.purchases.map((p) => p.id).sort()).toEqual(['po', 'pv']);
      expect(row.claimed_units).toBe(2);

      const [otherRow] = await dal.getItemsByListId('l2', { tier: 'claims' });
      expect(otherRow.purchases.map((p) => p.id)).toEqual(['pe']);
      expect(otherRow.claimed_units).toBe(1);
    });

    it('RawRead_IsNotExported', () => {
      expect(Object.keys(dal).filter((name) => name.startsWith('raw'))).toEqual(
        []
      );
    });

    it('NonOwnerWithViewerId_NamesTheirOwn-CountsTheOther', async () => {
      await seedClaimedItem();
      const rows = await dal.getItemsByListId('l1', {
        viewerSelfProfileId: selfProfileOf('viewer'),
      });
      const byId = Object.fromEntries(rows[0].purchases.map((p) => [p.id, p]));
      expect(byId.pv).toEqual({
        id: 'pv',
        units: 1,
        by: 'self',
        name: 'Vic',
        claimedByViewer: false,
        purchasedAt: expect.any(Date),
        avatar: { name: 'Vic', accent: null, art: null, avatarStyle: null },
      });
      expect(byId.po).toEqual({
        id: 'po',
        by: 'other',
        claimedByViewer: false,
      });
    });

    it('NonOwnerNoViewerId_TagsAllOther', async () => {
      await seedClaimedItem();
      const rows = await dal.getItemsByListId('l1');
      expect(rows[0].purchases.map((p) => p.by)).toEqual(['other', 'other']);
    });

    it('NonOwnerGuestClaim_CollapsesToABareCount', async () => {
      // A guest claim is another party's like any other: the maximal tier
      // keeps the entry so capacity stays derivable and drops the name.
      await seedUsers(db, [{ id: 'owner' }, { id: 'viewer' }]);
      await seedList(db, { id: 'l1', user_id: 'owner' });
      await seedItem(db, { id: 'i1', user_id: 'owner' });
      await seedListItem(db, {
        list_id: 'l1',
        item_id: 'i1',
        position: 1,
        quantity: 2,
      });
      await seedPurchase(db, {
        id: 'pg',
        item_id: 'i1',
        list_id: 'l1',
        guest_name: 'Gabby Guest',
      });

      const rows = await dal.getItemsByListId('l1', {
        viewerSelfProfileId: selfProfileOf('viewer'),
      });
      expect(rows[0].purchases).toEqual([
        { id: 'pg', by: 'other', claimedByViewer: false },
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
