import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { lists, purchases } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedBlock,
  seedFollow,
  seedUsers,
} from '@/test/helpers/seedFollowGraph';

import {
  seedItem,
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
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

// Booting a fresh pglite (full migration set) per test is the dominant per-test
// cost; doing it for every case turns the full parallel-fork suite into a boot
// storm that starves hooks and flakes unrelated tests. Instead boot once per
// file (beforeAll) and TRUNCATE + reseed between tests (beforeEach) — the same
// per-test isolation the design requires, without the storm. The generous hook
// timeout still covers the single boot under contention.
vi.setConfig({ hookTimeout: 60000 });

const OWNER = { id: 'owner', email: 'owner@test.local' };
const OTHER = { id: 'other', email: 'other@test.local' };
const TARGET = { id: 'target', email: 'target@test.local' };
const GHOST_EMAIL = 'ghost@test.local';

let db: TestDb;
let actions: typeof import('@/lib/data/purchase.actions');
let updateTag: ReturnType<typeof vi.fn>;

function asOwner() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OWNER.email } } as never);
}
function asOther() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OTHER.email } } as never);
}
function asTarget() {
  vi.mocked(auth).mockResolvedValue({ user: { email: TARGET.email } } as never);
}
function asGhost() {
  vi.mocked(auth).mockResolvedValue({ user: { email: GHOST_EMAIL } } as never);
}
function noSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

const purchaseRows = (itemId: string) =>
  db.select().from(purchases).where(eq(purchases.item_id, itemId));

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/purchase.actions');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  // Restore any per-test db spies (db is shared across tests now) and reset the
  // auth mock, then start each case from a clean, freshly seeded database.
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [OWNER, OTHER, TARGET]);
  updateTag.mockClear();
  asOwner();
});

describe('createPurchase', () => {
  // Spoiler hazard: a claim-driven bump would leak claim activity to the
  // owner through the hero's "updated" label (list-update-recency).
  it('AuthedSelfClaim_LeavesListUpdatedAtUnchanged', async () => {
    const STALE = new Date('2020-01-01T00:00:00.000Z');
    await seedList(db, { id: 'L', user_id: OWNER.id, updated_at: STALE });
    await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });

    const res = await actions.createPurchase({ item_id: 'I', guest_name: null });

    expect(res.success).toBe(true);
    const row = (await db.select().from(lists).where(eq(lists.id, 'L')))[0];
    expect(row.updated_at.toISOString()).toBe(STALE.toISOString());
  });

  describe('IdentityContract', () => {
    it('AuthedSelfClaim_UsesSessionUserIdForBothRoles-NullGuestName', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });

      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.success).toBe(true);
      const rows = await purchaseRows('I');
      expect(rows).toEqual([
        expect.objectContaining({
          user_id: OWNER.id,
          claimed_by: OWNER.id,
          guest_name: null,
        }),
      ]);
      expect(res.id).toBe(rows[0].id);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('AuthedOnBehalf_RecordsNamedGuestClaimWithCallerAsClaimer', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });

      // A signed-in caller recording a claim for a named non-user stores the
      // typed name as the purchaser label (user_id NULL) while claimed_by
      // records the asserter — which is what grants them removal rights.
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: '  Aunt May  ',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({
          user_id: null,
          claimed_by: OWNER.id,
          guest_name: 'Aunt May',
        }),
      ]);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('GuestWithName_InsertsAllNullIdentitiesAndGuestName', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'unlisted',
      });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      noSession();

      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: '  Gifty  ',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({
          user_id: null,
          claimed_by: null,
          guest_name: 'Gifty',
        }),
      ]);
    });

    it('GuestWhitespaceName_ReturnsMissingIdentity-NoRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: '   ',
      });
      expect(res.error).toBe('Missing identity');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestNullName_ReturnsMissingIdentity-NoRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Missing identity');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('AuthedUnknownEmail_ReturnsUnauthorized', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      asGhost();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Unauthorized');
    });
  });

  describe('ViewabilityAndCapacity', () => {
    it('NonViewableItem_ReturnsItemNotFound-NoRow', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'private' });
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      asOther();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Item not found');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestOnPublicList_InsertsNullUserIdAndGuestName', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'public' });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Aunt May',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({ user_id: null, guest_name: 'Aunt May' }),
      ]);
    });

    it('BlockedCallerOnPublicList_ReturnsItemNotFound-NoRow', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'public' });
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      await seedBlock(db, OWNER.id, OTHER.id);
      asOther();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Item not found');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('BlockedCallerOnBehalf_ReturnsItemNotFound-NoRow', async () => {
      // The on-behalf path stores a guest claim (user_id NULL) but is still
      // authorized as the authenticated caller, so a blocked caller cannot use
      // it to slip a claim past the block.
      await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'public' });
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      await seedBlock(db, OWNER.id, OTHER.id);
      asOther();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Aunt May',
      });
      expect(res.error).toBe('Item not found');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('DuplicateSameUser_ReturnsDuplicateClaim-NoNewRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Duplicate claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('DuplicateSameGuest_ReturnsDuplicateClaim-NoNewRow', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'unlisted',
      });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Gifty',
      });
      expect(res.error).toBe('Duplicate claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('CapacityReached_ReturnsFullyClaimed-NoNewRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: 1 });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OTHER.id });
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Fully claimed');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('ConcurrentSameUser_SecondTripsUniqueIndex-ReturnsDuplicateClaim', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      const [a, b] = await Promise.all([
        actions.createPurchase({ item_id: 'I', guest_name: null }),
        actions.createPurchase({ item_id: 'I', guest_name: null }),
      ]);
      const results = [a, b];
      expect(results.filter((r) => r.success)).toHaveLength(1);
      expect(results.filter((r) => r.error === 'Duplicate claim')).toHaveLength(
        1
      );
      const rows = await purchaseRows('I');
      expect(rows).toHaveLength(1);
      expect(rows[0].user_id).toBe(OWNER.id);
    });

    it('ItemDeletedBetweenViewabilityCheckAndRefetch_ReturnsItemNotFound-NoRow', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });

      // Under neon-http the viewability check and the quantity re-fetch are
      // separate round-trips; a concurrent delete can land between them. Let
      // the first findFirst (inside isItemViewable) hit the real db, then make
      // the re-fetch see the item gone.
      const realFindFirst = db.query.items.findFirst.bind(db.query.items);
      vi.spyOn(db.query.items, 'findFirst')
        .mockImplementationOnce(realFindFirst)
        .mockResolvedValueOnce(undefined as never);

      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res).toMatchObject({ success: false, message: 'Item not found' });
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('InsertThrowsNonUnique_ReturnsFailedToCreatePurchase', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      vi.spyOn(db, 'insert').mockImplementation(() => {
        throw new Error('boom');
      });
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Failed to create purchase');
    });
  });

  describe('AttributedClaims', () => {
    beforeEach(async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'public' });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      // TARGET is an owner-mutual; OTHER (the claimer) needs no relationship.
      await seedFollow(db, OWNER.id, TARGET.id);
      await seedFollow(db, TARGET.id, OWNER.id);
      asOther();
    });

    it('EligibleTarget_InsertsCallerAsClaimerAndTargetAsPurchaser', async () => {
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET.id,
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({
          user_id: TARGET.id,
          claimed_by: OTHER.id,
          guest_name: null,
        }),
      ]);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('TargetNotFollowedByOwner_ReturnsIneligiblePurchaser-NoRow-NoUpdateTag', async () => {
      // OTHER follows the owner both ways with no edge to TARGET — but the
      // pool is the OWNER's mutuals, and 'stranger' has no owner edge.
      await seedUsers(db, [{ id: 'stranger', email: 'stranger@test.local' }]);
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: 'stranger',
      });
      expect(res.error).toBe('Ineligible purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('TargetWithOneWayFollow_ReturnsIneligiblePurchaser-NoRow', async () => {
      await seedUsers(db, [{ id: 'oneway', email: 'oneway@test.local' }]);
      await seedFollow(db, OWNER.id, 'oneway');
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: 'oneway',
      });
      expect(res.error).toBe('Ineligible purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('TargetBlockedClaimer_ReturnsIneligiblePurchaser-NoRow', async () => {
      await seedBlock(db, TARGET.id, OTHER.id);
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET.id,
      });
      expect(res.error).toBe('Ineligible purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('ClaimerBlockedTarget_ReturnsIneligiblePurchaser-NoRow', async () => {
      await seedBlock(db, OTHER.id, TARGET.id);
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET.id,
      });
      expect(res.error).toBe('Ineligible purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('TargetIsOwner_ReturnsIneligiblePurchaser-NoRow', async () => {
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: OWNER.id,
      });
      expect(res.error).toBe('Ineligible purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('TargetIsCaller_InsertsSelfClaimShapeWithoutPoolCheck', async () => {
      // Picking yourself in the picker is just a self-claim — no eligibility
      // gate, identical row shape.
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: OTHER.id,
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({ user_id: OTHER.id, claimed_by: OTHER.id }),
      ]);
    });

    it('PurchasedByWithGuestName_ReturnsAmbiguousPurchaser-NoRow', async () => {
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Aunt May',
        purchased_by: TARGET.id,
      });
      expect(res.error).toBe('Ambiguous purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('UnauthenticatedWithPurchasedBy_ReturnsMissingIdentity-NoRow', async () => {
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET.id,
      });
      expect(res.error).toBe('Missing identity');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('TargetAlreadyPurchaser_ReturnsDuplicateClaim-AlreadyMarkedMessage', async () => {
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: TARGET.id,
        claimed_by: TARGET.id,
      });
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET.id,
      });
      expect(res).toMatchObject({
        success: false,
        error: 'Duplicate claim',
        message: 'Already marked as the purchaser',
      });
      expect(await purchaseRows('I')).toHaveLength(1);
    });
  });

  describe('OwnerClaims', () => {
    beforeEach(async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'private' });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: 1 });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      asOwner();
    });

    it('OwnerSelfClaim_InsertsOwnerAsClaimerAndPurchaser', async () => {
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({ user_id: OWNER.id, claimed_by: OWNER.id }),
      ]);
    });

    it('OwnerAttributedClaim_InsertsOwnerAsClaimerAndMutualAsPurchaser', async () => {
      await seedFollow(db, OWNER.id, TARGET.id);
      await seedFollow(db, TARGET.id, OWNER.id);
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET.id,
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({ user_id: TARGET.id, claimed_by: OWNER.id }),
      ]);
    });

    it('OwnerSelfClaimOnLimitOneItem_BlocksSubsequentViewerClaimAsFullyClaimed', async () => {
      // Owner claims count toward quantity_limit like any other claim.
      await db
        .update(lists)
        .set({ visibility: 'public' })
        .where(eq(lists.id, 'L'));
      const ownerRes = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(ownerRes.success).toBe(true);
      asOther();
      const viewerRes = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(viewerRes.error).toBe('Fully claimed');
      expect(await purchaseRows('I')).toHaveLength(1);
    });
  });

  // Documents the accepted residual race (spec MODIFIED scenario: concurrent
  // distinct claimants on a limited item). Two guests both pass the best-effort
  // count and both insert because the partial unique index excludes NULL
  // user_id — the stored count exceeds quantity_limit. NOT a guarantee.
  it('TwoDistinctGuestsConcurrent_BothInsertExceedingLimit', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'unlisted' });
    await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: 1 });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
    noSession();

    const [a, b] = await Promise.all([
      actions.createPurchase({ item_id: 'I', guest_name: 'Alice' }),
      actions.createPurchase({ item_id: 'I', guest_name: 'Bob' }),
    ]);
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    expect(await purchaseRows('I')).toHaveLength(2);
  });
});

describe('removePurchase', () => {
  describe('ByPurchaseId', () => {
    it('AuthedOwner_DeletesOwnRow-CallsUpdateTagItems', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('AuthedNonOwner_ReturnsNotYourClaim-RowPersists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      asOther();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('GuestMatchingName_DeletesGuestRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: 'Gifty',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestOnAuthedRow_ReturnsNotYourClaim-RowPersists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      noSession();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: 'whatever',
      });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('GuestWrongName_ReturnsNotYourClaim', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: 'Wrong',
      });
      expect(res.error).toBe('Not your claim');
    });

    it('GuestEmptyName_ReturnsNotYourClaim', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: '',
      });
      expect(res.error).toBe('Not your claim');
    });

    it('GhostSessionMatchingGuestRow_DeletesRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      asGhost();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: 'Gifty',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestNoNameSupplied_ReturnsNotYourClaim', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('MissingRow_ReturnsNotFound', async () => {
      const res = await actions.removePurchase({ purchase_id: 'nope' });
      expect(res.error).toBe('Not found');
    });

    it('DeleteThrows_ReturnsFailedToRemovePurchase', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      vi.spyOn(db, 'delete').mockImplementation(() => {
        throw new Error('boom');
      });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Failed to remove purchase');
    });
  });

  describe('RightsMatrix', () => {
    beforeEach(async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
    });

    it('ClaimerOnAttributedRow_DeletesRow', async () => {
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: TARGET.id,
        claimed_by: OTHER.id,
      });
      asOther();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('PurchaserOnAttributedRow_DeletesRow', async () => {
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: TARGET.id,
        claimed_by: OTHER.id,
      });
      asTarget();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('ItemOwnerOnUnrelatedClaim_DeletesRow', async () => {
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: TARGET.id,
        claimed_by: TARGET.id,
      });
      asOwner();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('ItemOwnerOnAllNullGuestRow_DeletesRowWithoutName', async () => {
      // Legacy guest rows (all-NULL identities) are creator-locked; the
      // owner's master unclaim is their escape hatch.
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        claimed_by: null,
        guest_name: 'Gifty',
      });
      asOwner();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('UnrelatedAuthedUser_ReturnsNotYourClaim-RowPersists', async () => {
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: TARGET.id,
        claimed_by: TARGET.id,
      });
      asOther();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('AuthedCreatorOfGuestNameRow_DeletesRow', async () => {
      // The legacy lockout: the creator's identity was on no column, so
      // `user_id === actor` denied them. claimed_by now records it.
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        claimed_by: OTHER.id,
        guest_name: 'Mom',
      });
      asOther();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestNameMatchOnClaimedRow_ReturnsNotYourClaim-RowPersists', async () => {
      // The unauthenticated name-match path only covers claimed_by-NULL rows;
      // an authenticated caller's guest-name claim is not guest-removable.
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        claimed_by: OTHER.id,
        guest_name: 'Mom',
      });
      noSession();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: 'Mom',
      });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });
  });

  describe('MissingIdentity', () => {
    it('EmptyPurchaseId_ReturnsMissingIdentity-NoDelete', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      const res = await actions.removePurchase({ purchase_id: '' });
      expect(res.error).toBe('Missing identity');
      expect(await purchaseRows('I')).toHaveLength(1);
    });
  });
});
