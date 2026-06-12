import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { lists } from '@/db/schema';
import { auth } from '@/lib/auth';
import type { ListVisibility } from '@/lib/visibility';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

import { seedList, type TestDb } from './test-helpers';

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

type ListData = import('@/lib/data/list.actions').ListData;

let db: TestDb;
let actions: typeof import('@/lib/data/list.actions');
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

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/list.actions');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  // Restore any per-test db spies (db is shared across tests now) and reset the
  // auth mock, then start each case from a clean, freshly seeded database.
  vi.restoreAllMocks();
  await resetDb(db);
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

  describe('UpdateRecency', () => {
    const STALE = new Date('2020-01-01T00:00:00.000Z');
    const SEEDED = {
      name: 'Old',
      subtitle: 'keep me',
      occasion: 'birthday',
      date: new Date('2030-01-01T00:00:00.000Z'),
    };

    beforeEach(async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        updated_at: STALE,
        ...SEEDED,
      });
    });

    const findL = async () => (await listRows()).find((l) => l.id === 'L');

    it('IdenticalPayload_IssuesNoWrite-ReturnsSuccess-NoUpdateTag', async () => {
      const updateSpy = vi.spyOn(db, 'update');
      const res = await actions.updateList('L', { ...SEEDED });

      expect(res).toMatchObject({ success: true, id: 'L' });
      expect(updateSpy).not.toHaveBeenCalled();
      expect(updateTag).not.toHaveBeenCalled();
      expect((await findL())?.updated_at.toISOString()).toBe(
        STALE.toISOString()
      );
    });

    it('SameInstantNewDateObject_TreatedClean-NoWrite', async () => {
      const updateSpy = vi.spyOn(db, 'update');
      const res = await actions.updateList('L', {
        date: new Date(SEEDED.date.getTime()),
      });

      expect(res).toMatchObject({ success: true, id: 'L' });
      expect(updateSpy).not.toHaveBeenCalled();
      expect((await findL())?.updated_at.toISOString()).toBe(
        STALE.toISOString()
      );
    });

    it('ChangedName_BumpsUpdatedAt', async () => {
      const before = Date.now();
      const res = await actions.updateList('L', { name: 'New Name' });
      const after = Date.now();

      expect(res.success).toBe(true);
      const t = (await findL())?.updated_at.getTime();
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(after);
    });

    it('PartialPayloadUnchangedField_OmittedFieldsIgnored-NoWrite', async () => {
      const updateSpy = vi.spyOn(db, 'update');
      const res = await actions.updateList('L', { name: SEEDED.name });

      expect(res).toMatchObject({ success: true, id: 'L' });
      expect(updateSpy).not.toHaveBeenCalled();
      expect((await findL())?.updated_at.toISOString()).toBe(
        STALE.toISOString()
      );
    });
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

  it('RowDeletedBetweenOwnershipCheckAndUpdate_ReturnsNotFound', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id });
    // Under neon-http the ownership check and the update are separate
    // round-trips; a concurrent delete can land between them, leaving
    // .returning() empty.
    vi.spyOn(db, 'update').mockReturnValueOnce({
      set: () => ({ where: () => ({ returning: async () => [] }) }),
    } as never);
    const res = await actions.updateList('L', { name: 'New Name' });
    expect(res).toMatchObject({
      success: false,
      message: 'List not found',
      error: 'Not found',
    });
    expect(updateTag).not.toHaveBeenCalled();
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

  it('PrivateToPublic_LeavesUpdatedAtUnchanged', async () => {
    // Visibility is share recency (shared_at), not list news — it must not
    // advance update recency (list-update-recency).
    const STALE = new Date('2020-01-01T00:00:00.000Z');
    await seedList(db, {
      id: 'L',
      user_id: OWNER.id,
      visibility: 'private',
      shared: false,
      shared_at: null,
      updated_at: STALE,
    });

    const res = await actions.setListVisibility('L', 'public');

    expect(res.success).toBe(true);
    expect((await findL())?.updated_at.toISOString()).toBe(
      STALE.toISOString()
    );
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
