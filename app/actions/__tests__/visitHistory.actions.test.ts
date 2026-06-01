import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { list_visits } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';
import { seedList, seedVisit } from '@/test/helpers/seedVisitGraph';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const VIEWER = { id: 'viewer', email: 'viewer@test.local' };
const OWNER = { id: 'owner', email: 'owner@test.local' };

// Lists owned by OWNER, one per visibility DB string; plus one private list
// owned by VIEWER so the owner-can-bookmark-own-private path is reachable.
const PUBLIC_LIST = 'pub'; // VISIBILITY.FOLLOWERS
const LINK_LIST = 'link'; // VISIBILITY.LINK
const PRIVATE_LIST = 'priv'; // VISIBILITY.OWNER, owned by OWNER
const OWN_PRIVATE_LIST = 'mine-priv'; // VISIBILITY.OWNER, owned by VIEWER

let db: TestDb;
let actions: typeof import('@/app/actions/lists');
let updateTag: ReturnType<typeof vi.fn>;

function asViewer() {
  vi.mocked(auth).mockResolvedValue({ user: { email: VIEWER.email } } as never);
}
function noSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

async function visitRows() {
  return db.select().from(list_visits);
}
async function visitRow(user_id: string, list_id: string) {
  const rows = await visitRows();
  return rows.find((r) => r.user_id === user_id && r.list_id === list_id);
}

// Mirrors the visit-recording upsert inlined in ListHeroSection's `after()`
// block (out of carve-out as a FILE; its DB contract is exercised here).
async function recordVisit(user_id: string, list_id: string) {
  await db
    .insert(list_visits)
    .values({ user_id, list_id, last_visited_at: new Date(), visit_count: 1 })
    .onConflictDoUpdate({
      target: [list_visits.user_id, list_visits.list_id],
      set: {
        last_visited_at: new Date(),
        visit_count: sql`${list_visits.visit_count} + 1`,
      },
    });
}

beforeEach(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  await seedUsers(db, [VIEWER, OWNER]);
  await seedList(db, {
    id: PUBLIC_LIST,
    user_id: OWNER.id,
    visibility: 'public',
  });
  await seedList(db, { id: LINK_LIST, user_id: OWNER.id, visibility: 'unlisted' });
  await seedList(db, {
    id: PRIVATE_LIST,
    user_id: OWNER.id,
    visibility: 'private',
  });
  await seedList(db, {
    id: OWN_PRIVATE_LIST,
    user_id: VIEWER.id,
    visibility: 'private',
  });
  actions = await import('@/app/actions/lists');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
  updateTag.mockClear();
  asViewer();
});

describe('bookmarkList', () => {
  it('AuthedNonOwnerPublicList_UpsertsFavoritedAt-ReturnsSuccess', async () => {
    const res = await actions.bookmarkList(PUBLIC_LIST);
    expect(res.success).toBe(true);
    const row = await visitRow(VIEWER.id, PUBLIC_LIST);
    expect(row?.favorited_at).toBeInstanceOf(Date);
  });

  it('Success_CallsUpdateTagListVisits', async () => {
    await actions.bookmarkList(PUBLIC_LIST);
    expect(updateTag.mock.calls).toEqual([['list_visits']]);
  });

  it('NonOwnerPrivateList_ReturnsListNotViewable-NoRowInserted', async () => {
    const res = await actions.bookmarkList(PRIVATE_LIST);
    expect(res).toMatchObject({ success: false, error: 'List not viewable' });
    expect(await visitRow(VIEWER.id, PRIVATE_LIST)).toBeUndefined();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('OwnerPrivateList_UpsertsFavoritedAt-ReturnsSuccess', async () => {
    const res = await actions.bookmarkList(OWN_PRIVATE_LIST);
    expect(res.success).toBe(true);
    const row = await visitRow(VIEWER.id, OWN_PRIVATE_LIST);
    expect(row?.favorited_at).toBeInstanceOf(Date);
  });

  it('AuthedAnyUserLinkOrFollowersList_ReturnsSuccess', async () => {
    expect((await actions.bookmarkList(LINK_LIST)).success).toBe(true);
    expect((await actions.bookmarkList(PUBLIC_LIST)).success).toBe(true);
    expect(await visitRow(VIEWER.id, LINK_LIST)).toMatchObject({
      favorited_at: expect.any(Date),
    });
    expect(await visitRow(VIEWER.id, PUBLIC_LIST)).toMatchObject({
      favorited_at: expect.any(Date),
    });
  });

  it('Unauthenticated_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.bookmarkList(PUBLIC_LIST);
    expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(await visitRows()).toHaveLength(0);
  });

  it('BookmarkBeforeAnyVisit_CreatesRowWithFavoritedAt', async () => {
    await actions.bookmarkList(PUBLIC_LIST);
    const row = await visitRow(VIEWER.id, PUBLIC_LIST);
    expect(row).toMatchObject({
      favorited_at: expect.any(Date),
      last_visited_at: expect.any(Date),
      visit_count: 1,
    });
  });

  it('AuthedEmailNoUserRow_ReturnsUnauthorized', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { email: 'ghost@test.local' },
    } as never);
    const res = await actions.bookmarkList(PUBLIC_LIST);
    expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(await visitRows()).toHaveLength(0);
  });

  it('InsertThrows_ReturnsFailed-NoUpdateTag', async () => {
    vi.spyOn(db, 'insert').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.bookmarkList(PUBLIC_LIST);
    expect(res).toMatchObject({ success: false, error: 'Failed' });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('unbookmarkList', () => {
  it('Bookmarked_NullsFavoritedAt-PreservesVisitFields', async () => {
    const lastVisited = new Date('2021-05-01');
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: PUBLIC_LIST,
      last_visited_at: lastVisited,
      visit_count: 5,
      favorited_at: new Date('2021-06-01'),
    });

    const res = await actions.unbookmarkList(PUBLIC_LIST);
    expect(res.success).toBe(true);
    const row = await visitRow(VIEWER.id, PUBLIC_LIST);
    expect(row).toMatchObject({
      favorited_at: null,
      last_visited_at: lastVisited,
      visit_count: 5,
    });
  });

  it('Unauthenticated_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.unbookmarkList(PUBLIC_LIST);
    expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
  });

  it('UpdateThrows_ReturnsFailed-NoUpdateTag', async () => {
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.unbookmarkList(PUBLIC_LIST);
    expect(res).toMatchObject({ success: false, error: 'Failed' });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('clearVisitHistory', () => {
  it('IncludeBookmarkedFalse_DeletesNonBookmarked-NullsLastVisitedOnBookmarked', async () => {
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: PUBLIC_LIST,
      last_visited_at: new Date('2021-01-01'),
      favorited_at: null,
    });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: LINK_LIST,
      last_visited_at: new Date('2021-02-01'),
      favorited_at: new Date('2021-03-01'),
    });

    const res = await actions.clearVisitHistory({ includeBookmarked: false });
    expect(res.success).toBe(true);
    expect(await visitRow(VIEWER.id, PUBLIC_LIST)).toBeUndefined();
    expect(await visitRow(VIEWER.id, LINK_LIST)).toMatchObject({
      last_visited_at: null,
      favorited_at: expect.any(Date),
    });
  });

  it('IncludeBookmarkedTrue_DeletesAllRowsForUser', async () => {
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: PUBLIC_LIST,
      favorited_at: null,
    });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: LINK_LIST,
      favorited_at: new Date('2021-03-01'),
    });
    await seedVisit(db, {
      user_id: OWNER.id,
      list_id: PUBLIC_LIST,
      favorited_at: new Date('2021-03-01'),
    });

    const res = await actions.clearVisitHistory({ includeBookmarked: true });
    expect(res.success).toBe(true);
    const rows = await visitRows();
    expect(rows).toEqual([
      expect.objectContaining({ user_id: OWNER.id, list_id: PUBLIC_LIST }),
    ]);
  });

  it('Unauthenticated_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.clearVisitHistory({ includeBookmarked: false });
    expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
  });

  it('DeleteThrows_ReturnsFailed-NoUpdateTag', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.clearVisitHistory({ includeBookmarked: true });
    expect(res).toMatchObject({ success: false, error: 'Failed' });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('removeVisit', () => {
  it('NonBookmarkedRow_DeletedOutright', async () => {
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: PUBLIC_LIST,
      last_visited_at: new Date('2021-01-01'),
      favorited_at: null,
    });

    const res = await actions.removeVisit(PUBLIC_LIST);
    expect(res.success).toBe(true);
    expect(await visitRow(VIEWER.id, PUBLIC_LIST)).toBeUndefined();
  });

  it('BookmarkedRow_NullsLastVisited-PreservesRowAndFavoritedAt', async () => {
    const favoritedAt = new Date('2021-03-01');
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: PUBLIC_LIST,
      last_visited_at: new Date('2021-01-01'),
      favorited_at: favoritedAt,
    });

    const res = await actions.removeVisit(PUBLIC_LIST);
    expect(res.success).toBe(true);
    expect(await visitRow(VIEWER.id, PUBLIC_LIST)).toMatchObject({
      last_visited_at: null,
      favorited_at: favoritedAt,
    });
  });

  it('NoMatchingRow_ReturnsSuccessNoHistoryRow', async () => {
    const res = await actions.removeVisit(PUBLIC_LIST);
    expect(res).toMatchObject({ success: true, message: 'No history row' });
  });

  it('Unauthenticated_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.removeVisit(PUBLIC_LIST);
    expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
  });

  it('UpdateThrows_ReturnsFailed-NoUpdateTag', async () => {
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: PUBLIC_LIST,
      favorited_at: new Date('2021-03-01'),
    });
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.removeVisit(PUBLIC_LIST);
    expect(res).toMatchObject({ success: false, error: 'Failed' });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('recordVisitUpsert', () => {
  it('FirstUpsert_CreatesRowVisitCountOne', async () => {
    await recordVisit(VIEWER.id, PUBLIC_LIST);
    const row = await visitRow(VIEWER.id, PUBLIC_LIST);
    expect(row).toMatchObject({
      visit_count: 1,
      last_visited_at: expect.any(Date),
      favorited_at: null,
    });
  });

  it('RepeatUpsert_IncrementsVisitCount-AdvancesLastVisited-PreservesFavoritedAt', async () => {
    const favoritedAt = new Date('2021-03-01');
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: PUBLIC_LIST,
      last_visited_at: new Date('2020-01-01'),
      visit_count: 1,
      favorited_at: favoritedAt,
    });

    await recordVisit(VIEWER.id, PUBLIC_LIST);
    const row = await visitRow(VIEWER.id, PUBLIC_LIST);
    expect(row?.visit_count).toBe(2);
    expect(row?.favorited_at).toEqual(favoritedAt);
    expect(row?.last_visited_at?.getTime()).toBeGreaterThan(
      new Date('2020-01-01').getTime()
    );
  });

  it('ConcurrentUpserts_ConvergeToOneRow-NoUniqueViolation', async () => {
    const settled = await Promise.allSettled([
      recordVisit(VIEWER.id, PUBLIC_LIST),
      recordVisit(VIEWER.id, PUBLIC_LIST),
    ]);

    expect(settled.every((r) => r.status === 'fulfilled')).toBe(true);
    const rows = (await visitRows()).filter(
      (r) => r.user_id === VIEWER.id && r.list_id === PUBLIC_LIST
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].visit_count).toBe(2);
  });
});
