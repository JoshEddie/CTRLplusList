import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { lists, purchases } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedBlock,
  seedFollow,
  seedManagedProfile,
  seedMembership,
  seedUsers,
} from '@/test/helpers/seedFollowGraph';

import {
  seedItem,
  seedList,
  seedListItem,
  seedPurchase,
  selfProfileOf,
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

const cookieJar = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      cookieJar.store.set(name, value);
    },
  }),
}));

function setGuestCookie(claims: {
  id: string;
  name: string;
  purchases: string[];
}) {
  cookieJar.store.set('guest_claims', JSON.stringify(claims));
}

function readGuestCookie() {
  const raw = cookieJar.store.get('guest_claims');
  return raw === undefined
    ? null
    : (JSON.parse(raw) as {
        id: string;
        name: string;
        purchases: string[];
      });
}

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
const OWNER_PROFILE = selfProfileOf(OWNER.id);
const OTHER_PROFILE = selfProfileOf(OTHER.id);
const TARGET_PROFILE = selfProfileOf(TARGET.id);

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
  cookieJar.store.clear();
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

    const res = await actions.createPurchase({
      item_id: 'I',
      guest_name: null,
    });

    expect(res.success).toBe(true);
    const row = (await db.select().from(lists).where(eq(lists.id, 'L')))[0];
    expect(row.updated_at.toISOString()).toBe(STALE.toISOString());
  });

  describe('IdentityContract', () => {
    // A claim is a human act, so switching does not move it: both ends stay
    // the actor's self-profile whatever profile the request acts as.
    it('ClaimerActingAsAManagedProfile_StillRecordsTheirSelfProfileAtBothEnds', async () => {
      // A third party's public list, so viewability does not depend on the
      // claimer's own ownership and the claim is the only thing under test.
      await seedList(db, { id: 'L', user_id: OTHER.id, visibility: 'public' });
      await seedItem(db, { id: 'I', user_id: OTHER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      await seedManagedProfile(db, { id: 'kiddo', name: 'Kiddo' });
      await seedMembership(db, { user_id: OWNER.id, profile_id: 'kiddo' });
      cookieJar.store.set('active_profile', 'kiddo');

      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });

      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({
          profile_id: OWNER_PROFILE,
          claimed_by_profile_id: OWNER_PROFILE,
        }),
      ]);
    });

    it('AuthedSelfClaim_InsertsSelfProfileForBothRoles-NullGuestName', async () => {
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
          profile_id: OWNER_PROFILE,
          claimed_by_profile_id: OWNER_PROFILE,
          guest_name: null,
        }),
      ]);
      expect(res.id).toBe(rows[0].id);
      expect(updateTag).toHaveBeenCalledWith(`items:profile:${OWNER_PROFILE}`);
      expect(updateTag).toHaveBeenCalledWith(
        `purchases:profile:${OWNER_PROFILE}`
      );
    });

    it('AuthedOnBehalf_RecordsNamedGuestClaimWithCallerAsClaimer', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });

      // A signed-in caller recording a claim for a named non-user stores the
      // typed name as the purchaser label (profile_id NULL) while
      // claimed_by_profile_id records the asserter — which is what grants them
      // removal rights.
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: '  Aunt May  ',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({
          profile_id: null,
          claimed_by_profile_id: OWNER_PROFILE,
          guest_name: 'Aunt May',
        }),
      ]);
      expect(updateTag).toHaveBeenCalledWith(`items:profile:${OWNER_PROFILE}`);
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
          profile_id: null,
          claimed_by_profile_id: null,
          guest_name: 'Gifty',
        }),
      ]);
    });

    it('FirstGuestClaim_SetsCookieWithMintedIdAndSingleId', async () => {
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
        guest_name: 'Gifty',
      });
      expect(res.success).toBe(true);
      const cookie = readGuestCookie();
      expect(cookie?.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(cookie?.name).toBe('Gifty');
      expect(cookie?.purchases).toEqual([res.id]);
    });

    it('SecondGuestClaim_KeepsIdPrependsPurchaseUpdatesName', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'unlisted',
      });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      noSession();
      setGuestCookie({ id: 'g1', name: 'Old Name', purchases: ['prior'] });

      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'New Name',
      });
      expect(res.success).toBe(true);
      expect(readGuestCookie()).toEqual({
        id: 'g1',
        name: 'New Name',
        purchases: [res.id, 'prior'],
      });
    });

    it('AuthedClaim_WritesNoCookie', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      asOwner();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Aunt May',
      });
      expect(res.success).toBe(true);
      expect(readGuestCookie()).toBeNull();
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

    it('AuthedUnknownEmail_ReturnsUnauthorized-NoRow', async () => {
      // A stale session must not fall through to the guest path and write a
      // purchases row with claimed_by_profile_id = NULL (server-endpoint-authorization,
      // "A stale session does not become a guest").
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      asGhost();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Unauthorized');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('AuthedUnknownEmailWithGuestName_ReturnsUnauthorized-NoRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      asGhost();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Gifty',
      });
      expect(res.error).toBe('Unauthorized');
      expect(await purchaseRows('I')).toHaveLength(0);
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

    it('GuestOnPublicList_InsertsNullProfileIdAndGuestName', async () => {
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
        expect.objectContaining({ profile_id: null, guest_name: 'Aunt May' }),
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
      // The on-behalf path stores a guest claim (profile_id NULL) but is still
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
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: OWNER_PROFILE,
      });
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
        profile_id: null,
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
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: OTHER_PROFILE,
      });
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
      expect(rows[0].profile_id).toBe(OWNER_PROFILE);
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
        purchased_by: TARGET_PROFILE,
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({
          profile_id: TARGET_PROFILE,
          claimed_by_profile_id: OTHER_PROFILE,
          guest_name: null,
        }),
      ]);
      expect(updateTag).toHaveBeenCalledWith(`items:profile:${OWNER_PROFILE}`);
      expect(updateTag).toHaveBeenCalledWith(
        `purchases:profile:${TARGET_PROFILE}`
      );
    });

    it('TargetNotFollowedByOwner_ReturnsIneligiblePurchaser-NoRow-NoUpdateTag', async () => {
      // OTHER follows the owner both ways with no edge to TARGET — but the
      // pool is the OWNER's mutuals, and 'stranger' has no owner edge.
      await seedUsers(db, [{ id: 'stranger', email: 'stranger@test.local' }]);
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: selfProfileOf('stranger'),
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
        purchased_by: selfProfileOf('oneway'),
      });
      expect(res.error).toBe('Ineligible purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('TargetBlockedClaimer_ReturnsIneligiblePurchaser-NoRow', async () => {
      await seedBlock(db, TARGET.id, OTHER.id);
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET_PROFILE,
      });
      expect(res.error).toBe('Ineligible purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('ClaimerBlockedTarget_ReturnsIneligiblePurchaser-NoRow', async () => {
      await seedBlock(db, OTHER.id, TARGET.id);
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET_PROFILE,
      });
      expect(res.error).toBe('Ineligible purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('TargetIsOwner_ReturnsIneligiblePurchaser-NoRow', async () => {
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: OWNER_PROFILE,
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
        purchased_by: OTHER_PROFILE,
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({
          profile_id: OTHER_PROFILE,
          claimed_by_profile_id: OTHER_PROFILE,
        }),
      ]);
    });

    it('PurchasedByWithGuestName_ReturnsAmbiguousPurchaser-NoRow', async () => {
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Aunt May',
        purchased_by: TARGET_PROFILE,
      });
      expect(res.error).toBe('Ambiguous purchaser');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('UnauthenticatedWithPurchasedBy_ReturnsMissingIdentity-NoRow', async () => {
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET_PROFILE,
      });
      expect(res.error).toBe('Missing identity');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('TargetAlreadyPurchaser_ReturnsDuplicateClaim-AlreadyMarkedMessage', async () => {
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: TARGET_PROFILE,
        claimed_by_profile_id: TARGET_PROFILE,
      });
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET_PROFILE,
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
        expect.objectContaining({
          profile_id: OWNER_PROFILE,
          claimed_by_profile_id: OWNER_PROFILE,
        }),
      ]);
    });

    it('OwnerAttributedClaim_InsertsOwnerAsClaimerAndMutualAsPurchaser', async () => {
      await seedFollow(db, OWNER.id, TARGET.id);
      await seedFollow(db, TARGET.id, OWNER.id);
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
        purchased_by: TARGET_PROFILE,
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({
          profile_id: TARGET_PROFILE,
          claimed_by_profile_id: OWNER_PROFILE,
        }),
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
  // profile_id — the stored count exceeds quantity_limit. NOT a guarantee.
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
    it('AuthedOwner_DeletesOwnRow-BumpsItemAndPurchaserTags', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: OWNER_PROFILE,
      });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
      expect(updateTag).toHaveBeenCalledWith(`items:profile:${OWNER_PROFILE}`);
      expect(updateTag).toHaveBeenCalledWith(
        `purchases:profile:${OWNER_PROFILE}`
      );
    });

    it('AuthedNonOwner_ReturnsNotYourClaim-RowPersists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: OWNER_PROFILE,
      });
      asOther();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('ClaimerActingAsAManagedProfile_StillRemovesTheirOwnClaim', async () => {
      // The claim was recorded at both ends as the human's self-profile, so a
      // removal gate reading the active profile would refuse the claimer their
      // own unclaim the moment they switch.
      await seedItem(db, { id: 'I', user_id: OTHER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: OWNER_PROFILE,
        claimed_by_profile_id: OWNER_PROFILE,
      });
      await seedManagedProfile(db, { id: 'kiddo', name: 'Kiddo' });
      await seedMembership(db, { user_id: OWNER.id, profile_id: 'kiddo' });
      cookieJar.store.set('active_profile', 'kiddo');

      const res = await actions.removePurchase({ purchase_id: 'p1' });

      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestCookieListedRow_DeletesRow-PrunesCookie', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      setGuestCookie({ id: 'g1', name: 'Gifty', purchases: ['p1', 'p2'] });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
      expect(readGuestCookie()).toEqual({
        id: 'g1',
        name: 'Gifty',
        purchases: ['p2'],
      });
    });

    it('GuestCookieOnIdentityBearingRow_ReturnsNotYourClaim-RowPersists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: OWNER_PROFILE,
      });
      noSession();
      setGuestCookie({ id: 'g1', name: 'Gifty', purchases: ['p1'] });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
      expect(readGuestCookie()?.purchases).toEqual(['p1']);
    });

    it('GuestCookieWithoutRowId_ReturnsNotYourClaim-RowPersists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      setGuestCookie({ id: 'g1', name: 'Gifty', purchases: ['other'] });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('GhostSessionWithCookieListedRow_DeletesRow', async () => {
      // A session email with no users row falls to the guest path, where the
      // cookie authorizes exactly as for a sessionless caller.
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: null,
        guest_name: 'Gifty',
      });
      asGhost();
      setGuestCookie({ id: 'g1', name: 'Gifty', purchases: ['p1'] });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestNoCookie_ReturnsNotYourClaim-RowPersists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: null,
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
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: OWNER_PROFILE,
      });
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
        profile_id: TARGET_PROFILE,
        claimed_by_profile_id: OTHER_PROFILE,
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
        profile_id: TARGET_PROFILE,
        claimed_by_profile_id: OTHER_PROFILE,
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
        profile_id: TARGET_PROFILE,
        claimed_by_profile_id: TARGET_PROFILE,
      });
      asOwner();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    // The owner's master unclaim is an ownership comparison, so it follows the
    // profile the request acts as — it reaches a claim on the acted-as
    // profile's item and stops reaching one on the human's own.
    it('ItemOwnedByTheActedAsProfile_DeletesUnrelatedClaim', async () => {
      await seedManagedProfile(db, { id: 'kiddo', name: 'Kiddo' });
      await seedMembership(db, { user_id: OWNER.id, profile_id: 'kiddo' });
      await seedItem(db, {
        id: 'K',
        profile_id: 'kiddo',
        quantity_limit: null,
      });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'K',
        profile_id: TARGET_PROFILE,
        claimed_by_profile_id: TARGET_PROFILE,
      });
      cookieJar.store.set('active_profile', 'kiddo');

      const res = await actions.removePurchase({ purchase_id: 'p1' });

      expect(res.success).toBe(true);
      expect(await purchaseRows('K')).toHaveLength(0);
    });

    it('ItemOwnedBySelfProfileWhileActingAsAnother_ReturnsNotYourClaim', async () => {
      await seedManagedProfile(db, { id: 'kiddo', name: 'Kiddo' });
      await seedMembership(db, { user_id: OWNER.id, profile_id: 'kiddo' });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: TARGET_PROFILE,
        claimed_by_profile_id: TARGET_PROFILE,
      });
      cookieJar.store.set('active_profile', 'kiddo');

      const res = await actions.removePurchase({ purchase_id: 'p1' });

      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('ItemOwnerOnAllNullGuestRow_DeletesRowWithoutName', async () => {
      // Legacy guest rows (all-NULL identities) are creator-locked; the
      // owner's master unclaim is their escape hatch.
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: null,
        claimed_by_profile_id: null,
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
        profile_id: TARGET_PROFILE,
        claimed_by_profile_id: TARGET_PROFILE,
      });
      asOther();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('AuthedCreatorOfGuestNameRow_DeletesRow', async () => {
      // The legacy lockout: the creator's identity was on no column, so
      // `profile_id === actor` denied them. claimed_by_profile_id now records it.
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: null,
        claimed_by_profile_id: OTHER_PROFILE,
        guest_name: 'Mom',
      });
      asOther();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestCookieOnClaimedRow_ReturnsNotYourClaim-RowPersists', async () => {
      // The cookie path only covers all-NULL-identity rows; an authenticated
      // caller's guest-name claim is not guest-removable.
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: null,
        claimed_by_profile_id: OTHER_PROFILE,
        guest_name: 'Mom',
      });
      noSession();
      setGuestCookie({ id: 'g1', name: 'Mom', purchases: ['p1'] });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });
  });

  describe('MissingIdentity', () => {
    it('EmptyPurchaseId_ReturnsMissingIdentity-NoDelete', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        profile_id: OWNER_PROFILE,
      });
      const res = await actions.removePurchase({ purchase_id: '' });
      expect(res.error).toBe('Missing identity');
      expect(await purchaseRows('I')).toHaveLength(1);
    });
  });
});

/**
 * Pins `claim-attribution` — the endpoint the owner's name reveal reaches. No
 * tier gates it, so what stands in for one is the rule that decides whether the
 * viewer may see the item at all.
 */
describe('revealedClaimsForItem', () => {
  beforeEach(async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: 2 });
    await seedPurchase(db, { id: 'P', item_id: 'I', guest_name: 'Grandma' });
  });

  it('OwnerOfTheItem_NamesEveryClaim', async () => {
    asOwner();

    expect(await actions.revealedClaimsForItem('I')).toEqual([
      {
        id: 'P',
        by: 'other',
        name: 'Grandma',
        claimedByViewer: false,
        purchasedAt: expect.any(Date),
      },
    ]);
  });

  it('ViewerWhoCannotSeeTheItem_ReturnsEmptyRatherThanNaming', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'owner' });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
    asOther();

    expect(await actions.revealedClaimsForItem('I')).toEqual([]);
  });

  it('SignedOutVisitorOnAPublicList_NamesEveryClaim', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'public' });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
    noSession();

    expect(
      (await actions.revealedClaimsForItem('I')).map((c) => c.name)
    ).toEqual(['Grandma']);
  });
});

/**
 * Pins `claim-attribution` — the endpoint the claim affordance's reveal
 * reaches. It is scoped to the item and names nobody, so it is a pass-through
 * to the read rather than a second projection.
 */
describe('claimSummaryForItem', () => {
  it('ClaimedLimitedItem_ReportsTheCountAndTheRemainder', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: 2 });
    await seedPurchase(db, { id: 'P', item_id: 'I', guest_name: 'Grandma' });

    expect(await actions.claimSummaryForItem('I')).toEqual({
      claimCount: 1,
      remaining: 1,
    });
  });

  it('UnknownItem_ReturnsNull', async () => {
    expect(await actions.claimSummaryForItem('no-such-item')).toBeNull();
  });
});
