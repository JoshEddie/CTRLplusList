import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedBlock,
  seedFollow,
  seedUsers,
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
  it('NoUserId_ReturnsEmptyArray', async () => {
    expect(await dal.getItemsByPurchased()).toEqual([]);
  });

  it('PurchasedItems_OrderedByPurchasedAtDesc', async () => {
    await seedUsers(db, [{ id: 'buyer' }, { id: 'owner' }]);
    await seedItem(db, { id: 'early', user_id: 'owner' });
    await seedItem(db, { id: 'late', user_id: 'owner' });
    await seedPurchase(db, {
      id: 'pe',
      item_id: 'early',
      user_id: 'buyer',
      purchased_at: new Date('2021-01-01'),
    });
    await seedPurchase(db, {
      id: 'pl',
      item_id: 'late',
      user_id: 'buyer',
      purchased_at: new Date('2022-01-01'),
    });

    const rows = await dal.getItemsByPurchased('buyer');
    expect(rows.map((r) => r.id)).toEqual(['late', 'early']);
  });

  it('PurchasedItemWithStores_MapsScalarPrimaryStore', async () => {
    await seedUsers(db, [{ id: 'buyer' }, { id: 'owner' }]);
    await seedItem(db, { id: 'bought', user_id: 'owner' });
    await seedPurchase(db, { id: 'p', item_id: 'bought', user_id: 'buyer' });
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

    const rows = await dal.getItemsByPurchased('buyer');
    expect(rows[0].store?.name).toBe('cheap');
  });

  it('NonOwnerView_TagsViewersOwnPurchaseSelf-OthersOther', async () => {
    await seedUsers(db, [
      { id: 'buyer', name: 'Bea' },
      { id: 'owner' },
      { id: 'other', name: 'Otto' },
    ]);
    await seedItem(db, { id: 'shared', user_id: 'owner', quantity_limit: 2 });
    await seedPurchase(db, { id: 'mine', item_id: 'shared', user_id: 'buyer' });
    await seedPurchase(db, {
      id: 'theirs',
      item_id: 'shared',
      user_id: 'other',
    });

    const rows = await dal.getItemsByPurchased('buyer');
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
    await expect(dal.getItemsByPurchased('buyer')).rejects.toThrow('boom');
  });
});

describe('isEligiblePurchaser', () => {
  beforeEach(async () => {
    await seedUsers(db, [{ id: 'own' }, { id: 'claimer' }, { id: 'b' }]);
  });

  it('OwnerMutualNoBlocks_ReturnsTrue', async () => {
    await seedFollow(db, 'own', 'b');
    await seedFollow(db, 'b', 'own');
    expect(await dal.isEligiblePurchaser('own', 'claimer', 'b')).toBe(true);
  });

  it('OneWayFollow_ReturnsFalse', async () => {
    await seedFollow(db, 'own', 'b');
    expect(await dal.isEligiblePurchaser('own', 'claimer', 'b')).toBe(false);
  });

  it('BlockBetweenClaimerAndTarget_ReturnsFalse', async () => {
    await seedFollow(db, 'own', 'b');
    await seedFollow(db, 'b', 'own');
    await seedBlock(db, 'b', 'claimer');
    expect(await dal.isEligiblePurchaser('own', 'claimer', 'b')).toBe(false);
  });

  it('TargetIsOwner_ReturnsFalse', async () => {
    expect(await dal.isEligiblePurchaser('own', 'claimer', 'own')).toBe(false);
  });
});

describe('sanitizePurchases', () => {
  const CLAIMED_AT = new Date('2026-07-01T00:00:00Z');
  const attributedRow = {
    purchased_at: CLAIMED_AT,
    id: 'p1',
    user_id: 'bea',
    claimed_by: 'carl',
    guest_name: null,
    user: { name: 'Bea Buyer' },
    claimer: { name: 'Carl Claimer' },
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
            user_id: null,
            claimed_by: 'carl',
            guest_name: 'Mom',
            user: null,
            claimer: { name: 'Carl Claimer' },
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
            user_id: 'own',
            claimed_by: 'own',
            guest_name: null,
            user: { name: 'Olive Owner' },
            claimer: { name: 'Olive Owner' },
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
            user_id: null,
            claimed_by: null,
            guest_name: 'Grandma',
            user: null,
            claimer: null,
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
            user_id: 'ghost',
            claimed_by: 'ghost',
            guest_name: null,
            user: { name: null },
            claimer: { name: null },
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
