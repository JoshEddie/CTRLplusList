import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedBlock,
  seedFollow,
  seedManagedProfile,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';

import {
  seedItem,
  seedItemStore,
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
let dal: typeof import('@/lib/data/purchase');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/data/purchase');
});

beforeEach(async () => {
  // db is shared per-file, so restore spies first or they leak between tests.
  vi.restoreAllMocks();
  await resetDb(db);
});

describe('getItemsByPurchased', () => {
  it('NoProfileId_ReturnsEmptyArray', async () => {
    expect(await dal.getItemsByPurchased()).toEqual([]);
  });

  it('PurchasedItems_OrderedByPurchasedAtDesc', async () => {
    await seedUsers(db, [{ id: 'buyer' }, { id: 'owner' }]);
    await seedItem(db, { id: 'early', user_id: 'owner' });
    await seedItem(db, { id: 'late', user_id: 'owner' });
    await seedPurchase(db, {
      id: 'pe',
      item_id: 'early',
      profile_id: selfProfileOf('buyer'),
      purchased_at: new Date('2021-01-01'),
    });
    await seedPurchase(db, {
      id: 'pl',
      item_id: 'late',
      profile_id: selfProfileOf('buyer'),
      purchased_at: new Date('2022-01-01'),
    });

    const rows = await dal.getItemsByPurchased(selfProfileOf('buyer'));
    expect(rows.map((r) => r.id)).toEqual(['late', 'early']);
  });

  it('PurchasedItemWithStores_MapsScalarPrimaryStore', async () => {
    await seedUsers(db, [{ id: 'buyer' }, { id: 'owner' }]);
    await seedItem(db, { id: 'bought', user_id: 'owner' });
    await seedPurchase(db, {
      id: 'p',
      item_id: 'bought',
      profile_id: selfProfileOf('buyer'),
    });
    await seedItemStore(db, {
      id: 's2',
      item_id: 'bought',
      name: 'pricey',
      price: '10',
      order: 2,
    });
    await seedItemStore(db, {
      id: 's1',
      item_id: 'bought',
      name: 'cheap',
      price: '5',
      order: 1,
    });

    const rows = await dal.getItemsByPurchased(selfProfileOf('buyer'));
    expect(rows[0].store?.name).toBe('cheap');
  });

  it('NonOwnerView_TagsViewersOwnPurchaseSelf-OthersOther', async () => {
    await seedUsers(db, [
      { id: 'buyer', name: 'Bea' },
      { id: 'owner' },
      { id: 'other', name: 'Otto' },
    ]);
    await seedItem(db, { id: 'shared', user_id: 'owner', quantity_limit: 2 });
    await seedPurchase(db, {
      id: 'mine',
      item_id: 'shared',
      profile_id: selfProfileOf('buyer'),
    });
    await seedPurchase(db, {
      id: 'theirs',
      item_id: 'shared',
      profile_id: selfProfileOf('other'),
    });

    const rows = await dal.getItemsByPurchased(selfProfileOf('buyer'));
    const byId = Object.fromEntries(rows[0].purchases.map((p) => [p.id, p]));
    expect(byId.mine).toEqual({
      id: 'mine',
      by: 'self',
      firstName: 'Bea',
      claimedByViewer: false,
      purchasedAt: expect.any(Date),
      image: null,
    });
    expect(byId.theirs).toEqual({
      id: 'theirs',
      by: 'other',
      firstName: 'Otto',
      claimedByViewer: false,
      purchasedAt: expect.any(Date),
      image: null,
    });
  });

  it('QueryThrows_RejectsWithRawError', async () => {
    vi.spyOn(db.query.purchases, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(
      dal.getItemsByPurchased(selfProfileOf('buyer'))
    ).rejects.toThrow('boom');
  });
});

describe('isEligiblePurchaser', () => {
  beforeEach(async () => {
    await seedUsers(db, [{ id: 'own' }, { id: 'claimer' }, { id: 'b' }]);
  });

  const [pOwn, pClaimer, pB] = [
    selfProfileOf('own'),
    selfProfileOf('claimer'),
    selfProfileOf('b'),
  ];

  it('OwnerMutualNoBlocks_ReturnsTrue', async () => {
    await seedFollow(db, 'own', 'b');
    await seedFollow(db, 'b', 'own');
    expect(await dal.isEligiblePurchaser(pOwn, pClaimer, pB)).toBe(true);
  });

  it('OneWayFollow_ReturnsFalse', async () => {
    await seedFollow(db, 'own', 'b');
    expect(await dal.isEligiblePurchaser(pOwn, pClaimer, pB)).toBe(false);
  });

  it('BlockBetweenClaimerAndTarget_ReturnsFalse', async () => {
    await seedFollow(db, 'own', 'b');
    await seedFollow(db, 'b', 'own');
    await seedBlock(db, 'b', 'claimer');
    expect(await dal.isEligiblePurchaser(pOwn, pClaimer, pB)).toBe(false);
  });

  it('TargetIsOwner_ReturnsFalse', async () => {
    expect(await dal.isEligiblePurchaser(pOwn, pClaimer, pOwn)).toBe(false);
  });

  it('ManagedOwnerProfile_ReturnsFalse', async () => {
    // A managed profile has no account, so neither follow leg can resolve.
    await seedManagedProfile(db, { id: 'kiddo' });
    await seedFollow(db, 'b', 'own');
    expect(await dal.isEligiblePurchaser('kiddo', pClaimer, pB)).toBe(false);
  });

  it('ManagedTargetProfile_ReturnsFalse', async () => {
    await seedManagedProfile(db, { id: 'kiddo' });
    await seedFollow(db, 'own', 'b');
    expect(await dal.isEligiblePurchaser(pOwn, pClaimer, 'kiddo')).toBe(false);
  });
});

describe('sanitizePurchases', () => {
  const CLAIMED_AT = new Date('2026-07-01T00:00:00Z');
  const attributedRow = {
    purchased_at: CLAIMED_AT,
    id: 'p1',
    profile_id: 'bea',
    claimed_by_profile_id: 'carl',
    guest_name: null,
    purchaserProfile: { name: 'Bea Buyer', members: [] },
    claimerProfile: { name: 'Carl Claimer' },
  };

  describe('AttributedRows', () => {
    it('ViewerIsPurchaser_MarkedSelf-LinkedFirstName', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'bea', false);
      expect(view).toEqual({
        id: 'p1',
        purchasedAt: CLAIMED_AT,
        image: null,
        by: 'self',
        firstName: 'Bea',
        claimedByViewer: false,
      });
    });

    it('ViewerIsClaimer_MarkedOther-ClaimedByViewerTrue', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'carl', false);
      expect(view).toEqual({
        id: 'p1',
        purchasedAt: CLAIMED_AT,
        image: null,
        by: 'other',
        firstName: 'Bea',
        claimedByViewer: true,
      });
    });

    it('UnrelatedViewer_MarkedOther-ClaimedByViewerFalse', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'someone', false);
      expect(view).toEqual({
        id: 'p1',
        purchasedAt: CLAIMED_AT,
        image: null,
        by: 'other',
        firstName: 'Bea',
        claimedByViewer: false,
      });
    });
  });

  describe('OwnerView', () => {
    it('SpoilersOff_ReturnsEmptyArray', () => {
      expect(dal.sanitizePurchases([attributedRow], 'own', true, false)).toEqual(
        []
      );
    });

    it('SpoilersOnClaimerDiffersFromPurchaser_SetsClaimerFirstName', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'own', true, true);
      expect(view).toEqual({
        id: 'p1',
        purchasedAt: CLAIMED_AT,
        image: null,
        by: 'other',
        firstName: 'Bea',
        claimedByViewer: false,
        claimerFirstName: 'Carl',
      });
    });

    it('SpoilersOnAuthedGuestNameRow_SetsClaimerFirstName-GuestDisplayName', () => {
      const [view] = dal.sanitizePurchases(
        [
          {
            id: 'p2',
            purchased_at: CLAIMED_AT,
            profile_id: null,
            claimed_by_profile_id: 'carl',
            guest_name: 'Mom',
            purchaserProfile: null,
            claimerProfile: { name: 'Carl Claimer' },
          },
        ],
        'own',
        true,
        true
      );
      expect(view).toEqual({
        id: 'p2',
        purchasedAt: CLAIMED_AT,
        image: null,
        by: 'other',
        firstName: 'Mom',
        claimedByViewer: false,
        claimerFirstName: 'Carl',
      });
    });

    it('SpoilersOnOwnerSelfClaim_MarkedSelf-NoClaimerFirstName', () => {
      const [view] = dal.sanitizePurchases(
        [
          {
            id: 'p3',
            purchased_at: CLAIMED_AT,
            profile_id: 'own',
            claimed_by_profile_id: 'own',
            guest_name: null,
            purchaserProfile: { name: 'Olive Owner', members: [] },
            claimerProfile: { name: 'Olive Owner' },
          },
        ],
        'own',
        true,
        true
      );
      expect(view).toEqual({
        id: 'p3',
        purchasedAt: CLAIMED_AT,
        image: null,
        by: 'self',
        firstName: 'Olive',
        claimedByViewer: true,
      });
    });
  });

  describe('NameFallbacks', () => {
    it('SignedOutGuestRow_UsesGuestName', () => {
      const [view] = dal.sanitizePurchases(
        [
          {
            id: 'p4',
            purchased_at: CLAIMED_AT,
            profile_id: null,
            claimed_by_profile_id: null,
            guest_name: 'Grandma',
            purchaserProfile: null,
            claimerProfile: null,
          },
        ],
        'viewer',
        false
      );
      expect(view).toEqual({
        id: 'p4',
        purchasedAt: CLAIMED_AT,
        image: null,
        by: 'other',
        firstName: 'Grandma',
        claimedByViewer: false,
      });
    });

    it('NoNamesAnywhere_FallsBackToSomeone', () => {
      const [view] = dal.sanitizePurchases(
        [
          {
            id: 'p5',
            purchased_at: CLAIMED_AT,
            profile_id: 'ghost',
            claimed_by_profile_id: 'ghost',
            guest_name: null,
            purchaserProfile: { name: null, members: [] },
            claimerProfile: { name: null },
          },
        ],
        'viewer',
        false
      );
      expect(view).toEqual({
        id: 'p5',
        purchasedAt: CLAIMED_AT,
        image: null,
        by: 'other',
        firstName: 'Someone',
        claimedByViewer: false,
      });
    });
  });
});
