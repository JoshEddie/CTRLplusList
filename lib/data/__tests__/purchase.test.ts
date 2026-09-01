import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES } from '@/lib/data/profile.roles';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
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
      avatar: { name: 'Bea', accent: null, art: null, avatarStyle: null },
    });
    expect(byId.theirs).toEqual({
      id: 'theirs',
      by: 'other',
      firstName: 'Otto',
      claimedByViewer: false,
      purchasedAt: expect.any(Date),
      avatar: { name: 'Otto', accent: null, art: null, avatarStyle: null },
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
    purchaserProfile: {
      name: 'Bea Buyer',
      avatar: { art: '<svg id="bea" />', style: 'toon-head' },
      preferences: [{ value: 'spice' }],
    },
    claimerProfile: { name: 'Carl Claimer' },
  };

  describe('IdentityTier', () => {
    it('ViewerIsPurchaser_MarkedSelf-NamedFirstName-RecorderNamed', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'bea', 'identity');
      expect(view).toEqual({
        id: 'p1',
        purchasedAt: CLAIMED_AT,
        avatar: {
          name: 'Bea Buyer',
          accent: 'spice',
          art: '<svg id="bea" />',
          avatarStyle: 'toon-head',
        },
        by: 'self',
        firstName: 'Bea',
        claimedByViewer: false,
        claimerFirstName: 'Carl',
      });
    });

    it('ViewerIsRecorder_MarkedOther-ClaimedByViewerTrue', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'carl', 'identity');
      expect(view).toEqual({
        id: 'p1',
        purchasedAt: CLAIMED_AT,
        avatar: {
          name: 'Bea Buyer',
          accent: 'spice',
          art: '<svg id="bea" />',
          avatarStyle: 'toon-head',
        },
        by: 'other',
        firstName: 'Bea',
        claimedByViewer: true,
        claimerFirstName: 'Carl',
      });
    });

    it('UnrelatedViewer_MarkedOther-NamedFirstName-RecorderNamed', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'someone', 'identity');
      expect(view).toEqual({
        id: 'p1',
        purchasedAt: CLAIMED_AT,
        avatar: {
          name: 'Bea Buyer',
          accent: 'spice',
          art: '<svg id="bea" />',
          avatarStyle: 'toon-head',
        },
        by: 'other',
        firstName: 'Bea',
        claimedByViewer: false,
        claimerFirstName: 'Carl',
      });
    });

    it('RecorderMatchesPurchaser_OmitsClaimerFirstName', () => {
      const [view] = dal.sanitizePurchases(
        [
          {
            id: 'p3',
            purchased_at: CLAIMED_AT,
            profile_id: 'own',
            claimed_by_profile_id: 'own',
            guest_name: null,
            purchaserProfile: { name: 'Olive Owner' },
            claimerProfile: { name: 'Olive Owner' },
          },
        ],
        'own',
        'identity'
      );
      expect(view).toEqual({
        id: 'p3',
        purchasedAt: CLAIMED_AT,
        avatar: {
          name: 'Olive Owner',
          accent: null,
          art: null,
          avatarStyle: null,
        },
        by: 'self',
        firstName: 'Olive',
        claimedByViewer: true,
      });
    });

    it('AuthedGuestNameRow_NamesGuest-RecorderNamed', () => {
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
        'identity'
      );
      expect(view).toEqual({
        id: 'p2',
        purchasedAt: CLAIMED_AT,
        by: 'other',
        firstName: 'Mom',
        claimedByViewer: false,
        claimerFirstName: 'Carl',
      });
    });

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
        'identity'
      );
      expect(view).toEqual({
        id: 'p4',
        purchasedAt: CLAIMED_AT,
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
            purchaserProfile: { name: '' },
            claimerProfile: { name: null },
          },
        ],
        'viewer',
        'identity'
      );
      expect(view).toEqual({
        id: 'p5',
        purchasedAt: CLAIMED_AT,
        avatar: { name: '', accent: null, art: null, avatarStyle: null },
        by: 'other',
        firstName: 'Someone',
        claimedByViewer: false,
      });
    });
  });

  describe('ClaimsTier', () => {
    it('OtherPartyClaim_ReturnsBareCountEntryWithNoIdentity', () => {
      expect(dal.sanitizePurchases([attributedRow], 'someone', 'claims')).toEqual([
        { id: 'p1', by: 'other', claimedByViewer: false },
      ]);
    });

    it('TwoOtherPartyClaims_PreservesCountSoCapacityStaysDerivable', () => {
      expect(
        dal.sanitizePurchases(
          [attributedRow, { ...attributedRow, id: 'p9' }],
          'someone',
          'claims'
        )
      ).toHaveLength(2);
    });

    it('ViewerOwnClaim_ReturnsFullSelfAlongsideStrippedOthers', () => {
      const views = dal.sanitizePurchases(
        [attributedRow, { ...attributedRow, id: 'p9', profile_id: 'zoe' }],
        'bea',
        'claims'
      );
      expect(views).toEqual([
        expect.objectContaining({ id: 'p1', by: 'self', firstName: 'Bea' }),
        { id: 'p9', by: 'other', claimedByViewer: false },
      ]);
    });
  });

  describe('SurpriseTier', () => {
    it('OtherPartyClaim_ReturnsEmptyArray', () => {
      expect(
        dal.sanitizePurchases([attributedRow], 'someone', 'surprise')
      ).toEqual([]);
    });

    it('ViewerIsPurchaser_ReturnsClaimInFull', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'bea', 'surprise');
      expect(view).toMatchObject({
        id: 'p1',
        by: 'self',
        firstName: 'Bea',
        claimedByViewer: false,
      });
    });

    it('ViewerIsRecorder_ReturnsClaimInFull', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'carl', 'surprise');
      expect(view).toMatchObject({
        id: 'p1',
        by: 'other',
        firstName: 'Bea',
        claimedByViewer: true,
      });
    });

    it('MixedOtherClaims_ClaimedItemIndistinguishableFromUnclaimed', () => {
      expect(
        dal.sanitizePurchases(
          [attributedRow, { ...attributedRow, id: 'p9' }],
          'stranger',
          'surprise'
        )
      ).toEqual([]);
    });
  });

  describe('ProgressTier', () => {
    it('OtherPartyClaim_ReturnsEmptyArrayLikeSurprise', () => {
      expect(
        dal.sanitizePurchases([attributedRow], 'someone', 'progress')
      ).toEqual([]);
    });

    it('ViewerOwnClaim_SurvivesInFull', () => {
      const [view] = dal.sanitizePurchases([attributedRow], 'bea', 'progress');
      expect(view).toMatchObject({
        id: 'p1',
        by: 'self',
        firstName: 'Bea',
        claimedByViewer: false,
      });
    });
  });

  // At every tier an entry that survives (here the viewer's own claim, which
  // survives all four) carries only the PurchaseView surface — never a raw
  // profile id, account id, email, or guest_name key, and never a full name.
  describe('IdentityLeakage', () => {
    const ALLOWED_KEYS = [
      'id',
      'by',
      'firstName',
      'claimedByViewer',
      'claimerFirstName',
      'purchasedAt',
      'avatar',
    ];

    it.each(['surprise', 'progress', 'claims', 'identity'] as const)(
      'Tier%s_ExposesOnlyPurchaseViewKeysAndNeverAFullName',
      (tier) => {
        const ownRow = {
          ...attributedRow,
          profile_id: 'bea',
          claimed_by_profile_id: 'bea',
        };
        const views = dal.sanitizePurchases([ownRow], 'bea', tier);
        expect(views).toHaveLength(1);
        for (const key of Object.keys(views[0])) {
          expect(ALLOWED_KEYS).toContain(key);
        }
        // First token only — the persisted 'Bea Buyer' never reaches the view.
        expect(views[0].firstName).toBe('Bea');
      }
    );
  });
});

/**
 * Pins `list-item-management`'s aggregate rule: the count is derived from
 * UNPROJECTED rows, since at `surprise`/`progress` the projected set no longer
 * carries the claims it counts. There is no shoppers disclosure.
 */
describe('getListClaimedCount', () => {
  beforeEach(async () => {
    await seedUsers(db, [
      { id: 'owner' },
      { id: 'cara', name: 'Cara Lee' },
      { id: 'sam', name: 'Sam Ray' },
    ]);
    await seedList(db, { id: 'l1', user_id: 'owner' });
    for (const id of ['i1', 'i2', 'i3']) {
      await seedItem(db, { id, user_id: 'owner' });
      await seedListItem(db, { list_id: 'l1', item_id: id, position: 1 });
    }
    await seedPurchase(db, {
      id: 'p1',
      item_id: 'i1',
      profile_id: selfProfileOf('cara'),
    });
    await seedPurchase(db, {
      id: 'p2',
      item_id: 'i2',
      profile_id: selfProfileOf('sam'),
    });
  });

  it('ListWithTwoOfThreeClaimed_ReportsTwoClaimedItems', async () => {
    expect(await dal.getListClaimedCount('l1')).toEqual({ claimedItemCount: 2 });
  });

  it('OneItemClaimedTwice_CountsItOnce', async () => {
    await seedPurchase(db, {
      id: 'p1b',
      item_id: 'i1',
      profile_id: selfProfileOf('sam'),
    });

    expect(await dal.getListClaimedCount('l1')).toEqual({ claimedItemCount: 2 });
  });

  // 13.4: the count reflects claims by others that a `surprise` viewer's
  // projected set no longer carries, which is why it reads unprojected rows.
  it('OthersClaims_CountedThoughASurpriseViewerSeesNone', async () => {
    const raw = [
      {
        id: 'p1',
        purchased_at: new Date(),
        profile_id: selfProfileOf('cara'),
        claimed_by_profile_id: selfProfileOf('cara'),
        guest_name: null,
        purchaserProfile: { name: 'Cara Lee' },
        claimerProfile: { name: 'Cara Lee' },
      },
    ];
    expect(
      dal.sanitizePurchases(raw, selfProfileOf('stranger'), 'surprise')
    ).toEqual([]);
    expect(await dal.getListClaimedCount('l1')).toEqual({ claimedItemCount: 2 });
  });

  it('ListWithNoClaims_ReportsZero', async () => {
    await seedList(db, { id: 'l2', user_id: 'owner' });

    expect(await dal.getListClaimedCount('l2')).toEqual({ claimedItemCount: 0 });
  });

  it('QueryThrows_RejectsWithFailedToFetchListClaimedCount', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(dal.getListClaimedCount('l1')).rejects.toThrow(
      'Failed to fetch list claimed count'
    );
  });
});

/**
 * Pins `claim-attribution`'s reveal fetch: the confirmed item's badge-level
 * state, scoped to that item and carrying no identity.
 */
describe('getItemClaimSummary', () => {
  beforeEach(async () => {
    await seedUsers(db, [{ id: 'owner' }, { id: 'cara', name: 'Cara Lee' }]);
  });

  it('LimitedItemWithOneClaim_ReportsTheCountAndTheRemainder', async () => {
    await seedItem(db, { id: 'i1', user_id: 'owner', quantity_limit: 3 });
    await seedPurchase(db, {
      id: 'p1',
      item_id: 'i1',
      profile_id: selfProfileOf('cara'),
    });

    expect(await dal.getItemClaimSummary('i1')).toEqual({
      claimCount: 1,
      remaining: 2,
    });
  });

  it('UnlimitedItem_ReportsNullRemaining', async () => {
    await seedItem(db, { id: 'i2', user_id: 'owner', quantity_limit: null });
    await seedPurchase(db, { id: 'p2', item_id: 'i2', guest_name: 'Sam' });

    expect(await dal.getItemClaimSummary('i2')).toEqual({
      claimCount: 1,
      remaining: null,
    });
  });

  it('ClaimsBeyondTheLimit_FloorsRemainingAtZero', async () => {
    await seedItem(db, { id: 'i3', user_id: 'owner', quantity_limit: 1 });
    await seedPurchase(db, { id: 'p3', item_id: 'i3', guest_name: 'A' });
    await seedPurchase(db, { id: 'p4', item_id: 'i3', guest_name: 'B' });

    expect((await dal.getItemClaimSummary('i3'))?.remaining).toBe(0);
  });

  it('QueryThrows_RejectsWithFailedToFetchItemClaimSummary', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(dal.getItemClaimSummary('i1')).rejects.toThrow(
      'Failed to fetch item claim summary'
    );
  });

  it('UnknownItem_ReturnsNull', async () => {
    expect(await dal.getItemClaimSummary('no-such-item')).toBeNull();
  });

  it('ClaimedItem_NamesNobody', async () => {
    await seedItem(db, { id: 'i4', user_id: 'owner', quantity_limit: 2 });
    await seedPurchase(db, {
      id: 'p5',
      item_id: 'i4',
      profile_id: selfProfileOf('cara'),
    });

    expect(Object.keys((await dal.getItemClaimSummary('i4')) ?? {})).toEqual([
      'claimCount',
      'remaining',
    ]);
  });
});

describe('canRemovePurchase', () => {
  const SELF = selfProfileOf('viewer');
  const OWNED = 'kiddo';
  const actor = makeIdentity('viewer', makeProfile(SELF), makeProfile(OWNED));
  const foreignClaim = {
    id: 'p1',
    profile_id: selfProfileOf('someone-else'),
    claimed_by_profile_id: selfProfileOf('someone-else'),
  };
  const noCookies = new Set<string>();

  describe('MasterUnclaimLeg', () => {
    it('RoleSelf_ReturnsTrue', () => {
      expect(
        dal.canRemovePurchase(foreignClaim, OWNED, actor, noCookies, ROLES.self)
      ).toBe(true);
    });

    it('RoleOwner_ReturnsTrue', () => {
      expect(
        dal.canRemovePurchase(foreignClaim, OWNED, actor, noCookies, ROLES.owner)
      ).toBe(true);
    });

    it('RoleManager_ReturnsFalse', () => {
      expect(
        dal.canRemovePurchase(foreignClaim, OWNED, actor, noCookies, ROLES.manager)
      ).toBe(false);
    });
  });

  describe('SelfProfileLegs', () => {
    it('ManagerIsTheAsserter_ReturnsTrue', () => {
      expect(
        dal.canRemovePurchase(
          { id: 'p2', profile_id: null, claimed_by_profile_id: SELF },
          OWNED,
          actor,
          noCookies,
          ROLES.manager
        )
      ).toBe(true);
    });

    it('ManagerIsThePurchaser_ReturnsTrue', () => {
      expect(
        dal.canRemovePurchase(
          { id: 'p3', profile_id: SELF, claimed_by_profile_id: null },
          OWNED,
          actor,
          noCookies,
          ROLES.manager
        )
      ).toBe(true);
    });
  });
});
