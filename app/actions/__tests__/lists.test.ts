import { eq, sql } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { list_items, list_visits, lists } from '@/db/schema';
import { auth } from '@/lib/auth';
import type { ListVisibility } from '@/lib/visibility';
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

import {
  seedItem,
  seedList,
  seedListItem,
  seedListVisit,
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
const GHOST_EMAIL = 'ghost@test.local';

type ListData = import('@/app/actions/lists').ListData;

let db: TestDb;
let actions: typeof import('@/app/actions/lists');
let updateTag: ReturnType<typeof vi.fn>;

function asOwner() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OWNER.email } } as never);
}
function asOther() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OTHER.email } } as never);
}
function asGhost() {
  vi.mocked(auth).mockResolvedValue({ user: { email: GHOST_EMAIL } } as never);
}
function noSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

function makeList(overrides: Partial<ListData> = {}): ListData {
  return {
    name: 'Valid List',
    subtitle: null,
    occasion: 'birthday',
    date: new Date('2030-01-01'),
    ...overrides,
  };
}

const listRows = () => db.select().from(lists);
const listItemRows = (listId: string) =>
  db.select().from(list_items).where(eq(list_items.list_id, listId));
const visitRows = (userId: string) =>
  db.select().from(list_visits).where(eq(list_visits.user_id, userId));

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/app/actions/lists');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  // Restore any per-test db spies (db is shared across tests now) and reset the
  // auth mock, then start each case from a clean, freshly seeded database.
  vi.restoreAllMocks();
  await db.execute(
    sql`TRUNCATE TABLE "user", lists, items, list_items, item_stores, purchases, list_visits CASCADE`
  );
  await seedUsers(db, [OWNER, OTHER]);
  updateTag.mockClear();
  asOwner();
});

describe('createList', () => {
  describe('ListSchemaValidation', () => {
    it('NameTooShort_ReturnsNameFieldError-NoRow', async () => {
      const res = await actions.createList(makeList({ name: 'ab' }));
      expect(res.success).toBe(false);
      expect(res.errors?.name).toBeDefined();
      expect(await listRows()).toHaveLength(0);
    });

    it('SubtitleTooLong_ReturnsSubtitleFieldError-NoRow', async () => {
      const res = await actions.createList(
        makeList({ subtitle: 'a'.repeat(121) })
      );
      expect(res.success).toBe(false);
      expect(res.errors?.subtitle).toBeDefined();
      expect(await listRows()).toHaveLength(0);
    });

    it('DateMissing_ReturnsDateFieldError-NoRow', async () => {
      const res = await actions.createList(
        makeList({ date: undefined as unknown as Date })
      );
      expect(res.success).toBe(false);
      expect(res.errors?.date).toBeDefined();
      expect(await listRows()).toHaveLength(0);
    });
  });

  describe('AuthGuards', () => {
    it('NoSession_ReturnsUnauthorized', async () => {
      noSession();
      const res = await actions.createList(makeList());
      expect(res.error).toBe('Unauthorized');
    });

    it('UnknownEmail_ReturnsUnauthorized', async () => {
      asGhost();
      const res = await actions.createList(makeList());
      expect(res.error).toBe('Unauthorized');
    });
  });

  it('EmptySubtitle_InsertsRow-NullSubtitle-ReturnsId-CallsUpdateTagLists', async () => {
    const res = await actions.createList(
      makeList({ name: 'Birthday Bash', subtitle: '' })
    );
    expect(res.success).toBe(true);
    expect(res.id).toBeDefined();

    const rows = await listRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: res.id,
      name: 'Birthday Bash',
      subtitle: null,
      user_id: OWNER.id,
    });
    expect(updateTag).toHaveBeenCalledWith('lists');
  });

  it('NonEmptySubtitle_PersistsSubtitle', async () => {
    const res = await actions.createList(
      makeList({ name: 'Trip', subtitle: 'Summer 2030' })
    );
    expect(res.success).toBe(true);
    const row = (await listRows()).find((l) => l.id === res.id);
    expect(row?.subtitle).toBe('Summer 2030');
  });

  it('InsertThrows_ReturnsFailedToCreateList', async () => {
    vi.spyOn(db, 'insert').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.createList(makeList());
    expect(res.error).toBe('Failed to create list');
  });
});

describe('updateList', () => {
  it('NonExistent_ReturnsNotFound', async () => {
    const res = await actions.updateList('nope', { name: 'New Name' });
    expect(res.error).toBe('Not found');
  });

  it('NonOwner_ReturnsUnauthorized', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    asOther();
    const res = await actions.updateList('L', { name: 'New Name' });
    expect(res.error).toBe('Unauthorized');
  });

  it('PartialUpdate_WritesProvidedFields-ReturnsId-CallsUpdateTagLists', async () => {
    await seedList(db, {
      id: 'L',
      user_id: OWNER.id,
      name: 'Old',
      subtitle: 'keep me',
    });
    const res = await actions.updateList('L', { name: 'New Name' });
    expect(res.success).toBe(true);
    expect(res.id).toBe('L');

    const row = (await listRows()).find((l) => l.id === 'L');
    expect(row).toMatchObject({ name: 'New Name', subtitle: 'keep me' });
    expect(updateTag).toHaveBeenCalledWith('lists');
  });

  it('AllFields_WritesSubtitleOccasionDate', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id, name: 'Old' });
    const date = new Date('2031-03-03T00:00:00.000Z');
    const res = await actions.updateList('L', {
      subtitle: 'New Sub',
      occasion: 'wedding',
      date,
    });
    expect(res.success).toBe(true);
    const row = (await listRows()).find((l) => l.id === 'L');
    expect(row).toMatchObject({ subtitle: 'New Sub', occasion: 'wedding' });
    expect(row?.date.toISOString()).toBe(date.toISOString());
  });

  it('InvalidData_ReturnsValidationErrors', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    const res = await actions.updateList('L', { name: 'ab' });
    expect(res.success).toBe(false);
    expect(res.errors?.name).toBeDefined();
  });

  describe('AuthGuards', () => {
    it('NoSession_ReturnsUnauthorized', async () => {
      noSession();
      const res = await actions.updateList('L', { name: 'New Name' });
      expect(res.error).toBe('Unauthorized');
    });

    it('UnknownEmail_ReturnsUnauthorized', async () => {
      asGhost();
      const res = await actions.updateList('L', { name: 'New Name' });
      expect(res.error).toBe('Unauthorized');
    });
  });

  it('UpdateThrows_ReturnsFailedToUpdateList', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.updateList('L', { name: 'New Name' });
    expect(res.error).toBe('Failed to update list');
  });
});

describe('deleteList', () => {
  it('Owner_RemovesRow-CallsUpdateTagLists', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    const res = await actions.deleteList('L');
    expect(res.success).toBe(true);
    expect(await listRows()).toHaveLength(0);
    expect(updateTag).toHaveBeenCalledWith('lists');
  });

  it('NonExistent_ReturnsNotFound', async () => {
    const res = await actions.deleteList('nope');
    expect(res.error).toBe('Not found');
  });

  it('NonOwner_ReturnsUnauthorized-RowPersists', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    asOther();
    const res = await actions.deleteList('L');
    expect(res.error).toBe('Unauthorized');
    expect(await listRows()).toHaveLength(1);
  });

  describe('AuthGuards', () => {
    it('NoSession_ReturnsUnauthorized', async () => {
      noSession();
      const res = await actions.deleteList('L');
      expect(res.error).toBe('Unauthorized');
    });

    it('UnknownEmail_ReturnsUnauthorized', async () => {
      asGhost();
      const res = await actions.deleteList('L');
      expect(res.error).toBe('Unauthorized');
    });
  });

  it('DeleteThrows_ReturnsFailedToDeleteList', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.deleteList('L');
    expect(res.error).toBe('Failed to delete list');
  });
});

describe('setListVisibility', () => {
  // dev code never reads `shared`, and `shared_at` is only observable in the
  // row — so transitions and the dual-write are asserted by reading 'L' back.
  const findL = async () => (await listRows()).find((l) => l.id === 'L');

  describe('AuthGuards', () => {
    it('NoSession_ReturnsUnauthorized-RowUnchanged', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });
      noSession();

      const res = await actions.setListVisibility('L', 'public');

      expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
      const row = await findL();
      expect(row?.visibility).toBe('private');
      expect(row?.shared).toBe(false);
      expect(row?.shared_at).toBeNull();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('UnknownEmail_ReturnsUnauthorized-RowUnchanged', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });
      asGhost();

      const res = await actions.setListVisibility('L', 'public');

      expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
      expect((await findL())?.visibility).toBe('private');
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('NonOwner_ReturnsForbidden-RowUnchanged', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });
      asOther();

      const res = await actions.setListVisibility('L', 'public');

      expect(res).toMatchObject({ success: false, error: 'Forbidden' });
      const row = await findL();
      expect(row?.visibility).toBe('private');
      expect(row?.shared).toBe(false);
      expect(row?.shared_at).toBeNull();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('NonExistentId_ReturnsNotFound', async () => {
      const res = await actions.setListVisibility('nope', 'public');

      expect(res).toMatchObject({ success: false, error: 'Not found' });
      expect(updateTag).not.toHaveBeenCalled();
    });
  });

  describe('FailClosedValidation', () => {
    it('OutOfEnumValue_ReturnsValidation-RowUnchanged', async () => {
      const T = new Date('2020-01-01T00:00:00.000Z');
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'unlisted',
        shared: true,
        shared_at: T,
      });

      // 'owner' is a future-canonical string the action must still reject in
      // Stage 1 — the typed signature is erased at the server-action boundary.
      const res = await actions.setListVisibility(
        'L',
        'owner' as unknown as ListVisibility
      );

      expect(res).toMatchObject({ success: false, error: 'Validation' });
      const row = await findL();
      expect(row?.visibility).toBe('unlisted');
      expect(row?.shared).toBe(true);
      expect(row?.shared_at?.toISOString()).toBe(T.toISOString());
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('EmptyStringValue_ReturnsValidation', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });

      const res = await actions.setListVisibility(
        'L',
        '' as unknown as ListVisibility
      );

      expect(res).toMatchObject({ success: false, error: 'Validation' });
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('InvalidValueAndUnknownId_ReturnsValidation-NotNotFound', async () => {
      const res = await actions.setListVisibility(
        'nope',
        'admin' as unknown as ListVisibility
      );

      // Validation fails closed before the existence lookup, so the unknown id
      // never surfaces as 'Not found'.
      expect(res).toMatchObject({ success: false, error: 'Validation' });
      expect(updateTag).not.toHaveBeenCalled();
    });
  });

  describe('SharedAtTransitions', () => {
    it('PrivateToUnlisted_SetsSharedAtFresh-SharedTrue', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });

      const before = Date.now();
      const res = await actions.setListVisibility('L', 'unlisted');
      const after = Date.now();

      expect(res.success).toBe(true);
      const row = await findL();
      expect(row?.visibility).toBe('unlisted');
      expect(row?.shared).toBe(true);
      const t = row?.shared_at?.getTime();
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(after);
    });

    it('PrivateToPublic_SetsSharedAtFresh-SharedTrue', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });

      const before = Date.now();
      const res = await actions.setListVisibility('L', 'public');
      const after = Date.now();

      expect(res.success).toBe(true);
      const row = await findL();
      expect(row?.visibility).toBe('public');
      expect(row?.shared).toBe(true);
      const t = row?.shared_at?.getTime();
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(after);
    });

    it('UnlistedToPublic_PreservesSharedAt-SharedTrue', async () => {
      const T = new Date('2021-06-15T00:00:00.000Z');
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'unlisted',
        shared: true,
        shared_at: T,
      });

      const res = await actions.setListVisibility('L', 'public');

      expect(res.success).toBe(true);
      const row = await findL();
      expect(row?.visibility).toBe('public');
      expect(row?.shared).toBe(true);
      expect(row?.shared_at?.toISOString()).toBe(T.toISOString());
    });

    it('PublicToUnlisted_PreservesSharedAt-SharedTrue', async () => {
      const T = new Date('2021-06-15T00:00:00.000Z');
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'public',
        shared: true,
        shared_at: T,
      });

      const res = await actions.setListVisibility('L', 'unlisted');

      expect(res.success).toBe(true);
      const row = await findL();
      expect(row?.visibility).toBe('unlisted');
      expect(row?.shared).toBe(true);
      expect(row?.shared_at?.toISOString()).toBe(T.toISOString());
    });

    it('PublicToPrivate_ClearsSharedAt-SharedFalse', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'public',
        shared: true,
        shared_at: new Date('2020-01-01'),
      });

      const res = await actions.setListVisibility('L', 'private');

      expect(res.success).toBe(true);
      const row = await findL();
      expect(row?.visibility).toBe('private');
      expect(row?.shared).toBe(false);
      expect(row?.shared_at).toBeNull();
    });

    it('UnlistedToPrivate_ClearsSharedAt-SharedFalse', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'unlisted',
        shared: true,
        shared_at: new Date('2020-01-01'),
      });

      const res = await actions.setListVisibility('L', 'private');

      expect(res.success).toBe(true);
      const row = await findL();
      expect(row?.visibility).toBe('private');
      expect(row?.shared).toBe(false);
      expect(row?.shared_at).toBeNull();
    });

    it('PublicPrivatePublicCycle_SecondSharedAtIsFresh', async () => {
      const T1 = new Date('2020-01-01T00:00:00.000Z');
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'public',
        shared: true,
        shared_at: T1,
      });

      await actions.setListVisibility('L', 'private');
      expect((await findL())?.shared_at).toBeNull();

      const before = Date.now();
      await actions.setListVisibility('L', 'public');
      const after = Date.now();

      const row = await findL();
      expect(row?.visibility).toBe('public');
      const t = row?.shared_at?.getTime();
      expect(t).toBeGreaterThan(T1.getTime());
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(after);
    });

    it('PrivateToPrivate_NoSpuriousSharedAt', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });

      const res = await actions.setListVisibility('L', 'private');

      expect(res.success).toBe(true);
      const row = await findL();
      expect(row?.visibility).toBe('private');
      expect(row?.shared).toBe(false);
      expect(row?.shared_at).toBeNull();
    });
  });

  describe('SuccessShapeAndRevalidation', () => {
    it('ValidTransition_ReturnsVisibilityUpdated', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });

      const res = await actions.setListVisibility('L', 'public');

      expect(res).toEqual({ success: true, message: 'Visibility updated' });
    });

    it('ValidTransition_CallsUpdateTagListsOnce', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });

      await actions.setListVisibility('L', 'public');

      expect(updateTag.mock.calls).toEqual([['lists']]);
    });

    it('UpdateThrows_ReturnsFailed-NoUpdateTag', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'private',
        shared: false,
        shared_at: null,
      });
      vi.spyOn(db, 'update').mockImplementation(() => {
        throw new Error('boom');
      });

      const res = await actions.setListVisibility('L', 'public');

      expect(res).toMatchObject({
        success: false,
        error: 'Failed to update visibility',
      });
      const row = await findL();
      expect(row?.visibility).toBe('private');
      expect(row?.shared_at).toBeNull();
      expect(updateTag).not.toHaveBeenCalled();
    });
  });
});

describe('bookmarkList', () => {
  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.bookmarkList('L');
    expect(res.error).toBe('Unauthorized');
  });

  it('UnknownEmail_ReturnsUnauthorized', async () => {
    asGhost();
    const res = await actions.bookmarkList('L');
    expect(res.error).toBe('Unauthorized');
  });

  it('OtherOwnerPrivateList_ReturnsListNotViewable', async () => {
    await seedList(db, { id: 'L', user_id: OTHER.id, visibility: 'private' });
    const res = await actions.bookmarkList('L');
    expect(res.error).toBe('List not viewable');
  });

  it('OwnList_InsertsVisitWithFavoritedAt-CallsUpdateTagListVisits', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'private' });
    const res = await actions.bookmarkList('L');
    expect(res.success).toBe(true);
    const rows = await visitRows(OWNER.id);
    expect(rows).toEqual([
      expect.objectContaining({ list_id: 'L', favorited_at: expect.any(Date) }),
    ]);
    expect(updateTag).toHaveBeenCalledWith('list_visits');
  });

  it('OtherOwnerPublicList_InsertsVisit', async () => {
    await seedList(db, { id: 'L', user_id: OTHER.id, visibility: 'public' });
    const res = await actions.bookmarkList('L');
    expect(res.success).toBe(true);
    expect(await visitRows(OWNER.id)).toHaveLength(1);
  });

  it('ExistingVisit_OnConflictSetsFavoritedAt', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedListVisit(db, {
      user_id: OWNER.id,
      list_id: 'L',
      favorited_at: null,
    });
    const res = await actions.bookmarkList('L');
    expect(res.success).toBe(true);
    const rows = await visitRows(OWNER.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].favorited_at).toBeInstanceOf(Date);
  });

  it('InsertThrows_ReturnsFailed', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    vi.spyOn(db, 'insert').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.bookmarkList('L');
    expect(res.error).toBe('Failed');
  });
});

describe('unbookmarkList', () => {
  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.unbookmarkList('L');
    expect(res.error).toBe('Unauthorized');
  });

  it('Bookmarked_NullsFavoritedAt-CallsUpdateTagListVisits', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedListVisit(db, {
      user_id: OWNER.id,
      list_id: 'L',
      favorited_at: new Date('2020-01-01'),
    });
    const res = await actions.unbookmarkList('L');
    expect(res.success).toBe(true);
    const rows = await visitRows(OWNER.id);
    expect(rows[0].favorited_at).toBeNull();
    expect(updateTag).toHaveBeenCalledWith('list_visits');
  });

  it('UpdateThrows_ReturnsFailed', async () => {
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.unbookmarkList('L');
    expect(res.error).toBe('Failed');
  });
});

describe('clearVisitHistory', () => {
  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.clearVisitHistory({ includeBookmarked: true });
    expect(res.error).toBe('Unauthorized');
  });

  it('IncludeBookmarked_DeletesAllRows-CallsUpdateTagListVisits', async () => {
    await seedList(db, { id: 'L1', user_id: OWNER.id });
    await seedList(db, { id: 'L2', user_id: OWNER.id });
    await seedListVisit(db, {
      user_id: OWNER.id,
      list_id: 'L1',
      favorited_at: new Date(),
    });
    await seedListVisit(db, { user_id: OWNER.id, list_id: 'L2' });
    const res = await actions.clearVisitHistory({ includeBookmarked: true });
    expect(res.success).toBe(true);
    expect(await visitRows(OWNER.id)).toHaveLength(0);
    expect(updateTag).toHaveBeenCalledWith('list_visits');
  });

  it('ExcludeBookmarked_DeletesNonBookmarked-NullsBookmarkedLastVisited', async () => {
    await seedList(db, { id: 'L1', user_id: OWNER.id });
    await seedList(db, { id: 'L2', user_id: OWNER.id });
    await seedListVisit(db, {
      user_id: OWNER.id,
      list_id: 'L1',
      favorited_at: new Date(),
      last_visited_at: new Date(),
    });
    await seedListVisit(db, {
      user_id: OWNER.id,
      list_id: 'L2',
      favorited_at: null,
    });
    const res = await actions.clearVisitHistory({ includeBookmarked: false });
    expect(res.success).toBe(true);
    const rows = await visitRows(OWNER.id);
    expect(rows).toEqual([
      expect.objectContaining({ list_id: 'L1', last_visited_at: null }),
    ]);
  });

  it('DeleteThrows_ReturnsFailed', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.clearVisitHistory({ includeBookmarked: true });
    expect(res.error).toBe('Failed');
  });
});

describe('removeVisit', () => {
  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.removeVisit('L');
    expect(res.error).toBe('Unauthorized');
  });

  it('NoRow_ReturnsNoHistoryRow', async () => {
    const res = await actions.removeVisit('L');
    expect(res.message).toBe('No history row');
  });

  it('Bookmarked_NullsLastVisited-RowSurvives-CallsUpdateTagListVisits', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedListVisit(db, {
      user_id: OWNER.id,
      list_id: 'L',
      favorited_at: new Date('2020-01-01'),
      last_visited_at: new Date(),
    });
    const res = await actions.removeVisit('L');
    expect(res.success).toBe(true);
    const rows = await visitRows(OWNER.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].last_visited_at).toBeNull();
    expect(updateTag).toHaveBeenCalledWith('list_visits');
  });

  it('NonBookmarked_DeletesRow', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedListVisit(db, {
      user_id: OWNER.id,
      list_id: 'L',
      favorited_at: null,
    });
    const res = await actions.removeVisit('L');
    expect(res.success).toBe(true);
    expect(await visitRows(OWNER.id)).toHaveLength(0);
  });

  it('UpdateThrows_ReturnsFailed', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedListVisit(db, {
      user_id: OWNER.id,
      list_id: 'L',
      favorited_at: new Date('2020-01-01'),
    });
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.removeVisit('L');
    expect(res.error).toBe('Failed');
  });
});

describe('setListItems', () => {
  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.setListItems('L', ['I']);
    expect(res.error).toBe('Unauthorized');
  });

  it('MissingList_ReturnsNotFound', async () => {
    const res = await actions.setListItems('nope', ['I']);
    expect(res.error).toBe('Not found');
  });

  it('NonOwner_ReturnsForbidden', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    asOther();
    const res = await actions.setListItems('L', ['I']);
    expect(res.error).toBe('Forbidden');
  });

  it('UnknownEmail_ReturnsForbidden', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    asGhost();
    const res = await actions.setListItems('L', ['I']);
    expect(res.error).toBe('Forbidden');
  });

  it('EmptyItemId_ReturnsInvalidInput', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    const res = await actions.setListItems('L', ['']);
    expect(res.error).toBe('Invalid input');
  });

  it('NoChanges_ReturnsNoChanges', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
    const res = await actions.setListItems('L', ['I']);
    expect(res.message).toBe('No changes');
  });

  it('MixedAddRemove_WritesDiff-PlacesInsertsAtMaxPlus65536-ReportsCounts', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'B', user_id: OWNER.id });
    await seedItem(db, { id: 'C', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    await seedListItem(db, { list_id: 'L', item_id: 'B', position: 131072 });

    const res = await actions.setListItems('L', ['A', 'C']);
    expect(res.success).toBe(true);
    expect(res.message).toBe('Added 1, removed 1');

    const rows = await listItemRows('L');
    const byItem = Object.fromEntries(rows.map((r) => [r.item_id, r.position]));
    expect(byItem).toEqual({ A: 65536, C: 131072 });
    expect(updateTag).toHaveBeenCalledWith('items');
    expect(updateTag).toHaveBeenCalledWith('lists');
  });

  it('PureAdd_PlacesAtMaxPlus65536-ReportsAddedOnly', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'B', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });

    const res = await actions.setListItems('L', ['A', 'B']);
    expect(res.success).toBe(true);
    expect(res.message).toBe('Added 1');
    const byItem = Object.fromEntries(
      (await listItemRows('L')).map((r) => [r.item_id, r.position])
    );
    expect(byItem).toEqual({ A: 65536, B: 131072 });
  });

  it('PureRemove_ReportsRemovedOnly', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    await seedItem(db, { id: 'B', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    await seedListItem(db, { list_id: 'L', item_id: 'B', position: 131072 });

    const res = await actions.setListItems('L', ['A']);
    expect(res.success).toBe(true);
    expect(res.message).toBe('removed 1');
    expect((await listItemRows('L')).map((r) => r.item_id)).toEqual(['A']);
  });

  it('SelectThrows_ReturnsFailedToSaveItems', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    await seedItem(db, { id: 'A', user_id: OWNER.id });
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    await seedListItem(db, { list_id: 'L', item_id: 'A', position: 65536 });
    const res = await actions.setListItems('L', ['A', 'nonexistent']);
    expect(res.error).toBe('Failed to save items');
  });
});

describe('updatePriority', () => {
  async function seedListWith(positions: Record<string, number>) {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    for (const itemId of Object.keys(positions)) {
      await seedItem(db, { id: itemId, user_id: OWNER.id });
      await seedListItem(db, {
        list_id: 'L',
        item_id: itemId,
        position: positions[itemId],
      });
    }
  }

  async function positionOf(itemId: string) {
    const rows = await listItemRows('L');
    return rows.find((r) => r.item_id === itemId)?.position;
  }

  describe('HappyPaths', () => {
    it('MoveDownToMidpoint_SetsFloorMidpointBetweenTargetAndLowerNeighbor', async () => {
      await seedListWith({ A: 65536, B: 131072, C: 196608 });
      const res = await actions.updatePriority('C', 'B', 'L');
      expect(res.success).toBe(true);
      expect(await positionOf('C')).toBe(Math.floor((65536 + 131072) / 2));
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('MoveUpToMidpoint_SetsFloorMidpointBetweenTargetAndHigherNeighbor', async () => {
      await seedListWith({ A: 65536, B: 131072, C: 196608 });
      const res = await actions.updatePriority('A', 'B', 'L');
      expect(res.success).toBe(true);
      expect(await positionOf('A')).toBe(Math.floor((196608 + 131072) / 2));
    });

    it('MoveToFrontEdge_SetsFloorHalfTargetPosition', async () => {
      await seedListWith({ A: 65536, B: 131072, C: 196608 });
      const res = await actions.updatePriority('C', 'A', 'L');
      expect(res.success).toBe(true);
      expect(await positionOf('C')).toBe(Math.floor(65536 / 2));
    });

    it('MoveToBackEdge_SetsTargetPlusBaseSpacing', async () => {
      await seedListWith({ A: 65536, B: 131072, C: 196608 });
      const res = await actions.updatePriority('A', 'C', 'L');
      expect(res.success).toBe(true);
      expect(await positionOf('A')).toBe(196608 + 65536);
    });
  });

  it('CollisionBelowMinGap_RebalancesAllToBaseSpacing-PreservesOrder', async () => {
    // A and B share the top position; moving D up to C produces a midpoint
    // that leaves the two highest rows tied, tripping checkListBalance.
    await seedListWith({ D: 32768, C: 65536, A: 131072, B: 131072 });
    const res = await actions.updatePriority('D', 'C', 'L');
    expect(res.success).toBe(true);

    const rows = await listItemRows('L');
    const positions = rows.map((r) => r.position).sort((a, b) => a - b);
    expect(positions).toEqual([65536, 131072, 196608, 262144]);
    expect(await positionOf('C')).toBe(65536);
    expect(await positionOf('D')).toBe(131072);
    expect([await positionOf('A'), await positionOf('B')].sort()).toEqual([
      196608, 262144,
    ]);
  });

  describe('Guards', () => {
    it('NonOwner_ReturnsUnauthorized-NoWrite', async () => {
      await seedListWith({ A: 65536, B: 131072 });
      asOther();
      const res = await actions.updatePriority('A', 'B', 'L');
      expect(res.error).toBe('Unauthorized');
      expect(await positionOf('A')).toBe(65536);
    });

    it('NoSession_ReturnsUnauthorized', async () => {
      await seedListWith({ A: 65536, B: 131072 });
      noSession();
      const res = await actions.updatePriority('A', 'B', 'L');
      expect(res.error).toBe('Unauthorized');
    });

    it('TargetNotMember_ReturnsItemOrTargetNotFound', async () => {
      await seedListWith({ A: 65536 });
      const res = await actions.updatePriority('A', 'ghost', 'L');
      expect(res.error).toBe('Item or target not found on this list');
    });

    it('SameItemAndTarget_ReturnsAlreadyAtTargetPosition-NoWrite', async () => {
      await seedListWith({ A: 65536, B: 131072 });
      const res = await actions.updatePriority('A', 'A', 'L');
      expect(res.error).toBe('Item is already at the target position');
      expect(await positionOf('A')).toBe(65536);
    });
  });

  it('UpdateThrows_ReturnsFailedToUpdateItemPriority', async () => {
    await seedListWith({ A: 65536, B: 131072, C: 196608 });
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.updatePriority('C', 'B', 'L');
    expect(res.error).toBe('Failed to update item priority');
  });
});
