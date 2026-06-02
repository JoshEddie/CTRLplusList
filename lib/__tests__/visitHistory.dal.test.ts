import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
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

const VIEWER = { id: 'viewer', email: 'viewer@test.local' };
const OTHER = { id: 'other', email: 'other@test.local' };

let db: TestDb;
let dal: typeof import('@/lib/dal');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/dal');
});

beforeEach(async () => {
  // db is shared across tests now: restore per-test `db.query` spies, reset
  // rows, and reseed so each case starts from a clean, freshly seeded database.
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [
    { id: VIEWER.id, name: 'Viewer', email: VIEWER.email },
    { id: OTHER.id, name: 'Olivia Owner', email: OTHER.email },
  ]);
});

describe('getBookmarkedListsByUser', () => {
  it('FavoritedRowsOnly_ReturnsBookmarkedListsForUser', async () => {
    await seedList(db, { id: 'fav', user_id: OTHER.id });
    await seedList(db, { id: 'visited-only', user_id: OTHER.id });
    await seedList(db, { id: 'others-fav', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'fav',
      favorited_at: new Date('2021-01-01'),
    });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'visited-only',
      favorited_at: null,
    });
    await seedVisit(db, {
      user_id: OTHER.id,
      list_id: 'others-fav',
      favorited_at: new Date('2021-01-01'),
    });

    const rows = await dal.getBookmarkedListsByUser(VIEWER.id);
    expect(rows.map((r) => r.list_id)).toEqual(['fav']);
  });

  it('MultipleBookmarks_OrdersByFavoritedAtDesc', async () => {
    await seedList(db, { id: 'older', user_id: OTHER.id });
    await seedList(db, { id: 'newer', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'older',
      favorited_at: new Date('2020-01-01'),
    });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'newer',
      favorited_at: new Date('2022-01-01'),
    });

    const rows = await dal.getBookmarkedListsByUser(VIEWER.id);
    expect(rows.map((r) => r.list_id)).toEqual(['newer', 'older']);
  });

  it('Result_IncludesJoinedOwnerName', async () => {
    await seedList(db, { id: 'fav', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'fav',
      favorited_at: new Date('2021-01-01'),
    });

    const rows = await dal.getBookmarkedListsByUser(VIEWER.id);
    expect(rows[0].list.user.name).toBe('Olivia Owner');
  });

  it('NullLastVisitedButFavorited_StillReturned', async () => {
    await seedList(db, { id: 'removed-but-bookmarked', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'removed-but-bookmarked',
      last_visited_at: null,
      favorited_at: new Date('2021-01-01'),
    });

    const rows = await dal.getBookmarkedListsByUser(VIEWER.id);
    expect(rows.map((r) => r.list_id)).toEqual(['removed-but-bookmarked']);
  });
});

describe('getBookmarkStatus', () => {
  it('FavoritedRowExists_ReturnsTrue', async () => {
    await seedList(db, { id: 'fav', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'fav',
      favorited_at: new Date('2021-01-01'),
    });

    expect(await dal.getBookmarkStatus('fav', VIEWER.id)).toBe(true);
  });

  it('RowWithNullFavoritedAt_ReturnsFalse', async () => {
    await seedList(db, { id: 'visited-only', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'visited-only',
      favorited_at: null,
    });

    expect(await dal.getBookmarkStatus('visited-only', VIEWER.id)).toBe(false);
  });

  it('NoRow_ReturnsFalse', async () => {
    await seedList(db, { id: 'untouched', user_id: OTHER.id });
    expect(await dal.getBookmarkStatus('untouched', VIEWER.id)).toBe(false);
  });
});

describe('getVisitHistoryByUser', () => {
  it('LastVisitedRowsOnly_ReturnsVisitedListsForUser', async () => {
    await seedList(db, { id: 'visited', user_id: OTHER.id });
    await seedList(db, { id: 'removed', user_id: OTHER.id });
    await seedList(db, { id: 'others-visit', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'visited',
      last_visited_at: new Date('2021-01-01'),
    });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'removed',
      last_visited_at: null,
      favorited_at: new Date('2021-01-01'),
    });
    await seedVisit(db, {
      user_id: OTHER.id,
      list_id: 'others-visit',
      last_visited_at: new Date('2021-01-01'),
    });

    const rows = await dal.getVisitHistoryByUser(VIEWER.id);
    expect(rows.map((r) => r.list_id)).toEqual(['visited']);
  });

  it('MultipleVisits_OrdersByLastVisitedAtDesc', async () => {
    await seedList(db, { id: 'older', user_id: OTHER.id });
    await seedList(db, { id: 'newer', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'older',
      last_visited_at: new Date('2020-01-01'),
    });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'newer',
      last_visited_at: new Date('2022-01-01'),
    });

    const rows = await dal.getVisitHistoryByUser(VIEWER.id);
    expect(rows.map((r) => r.list_id)).toEqual(['newer', 'older']);
  });

  it('NullLastVisitedButFavorited_Excluded', async () => {
    await seedList(db, { id: 'removed-but-bookmarked', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'removed-but-bookmarked',
      last_visited_at: null,
      favorited_at: new Date('2021-01-01'),
    });

    const rows = await dal.getVisitHistoryByUser(VIEWER.id);
    expect(rows).toEqual([]);
  });

  it('LimitAndOffset_PaginatesResult', async () => {
    await seedList(db, { id: 'a', user_id: OTHER.id });
    await seedList(db, { id: 'b', user_id: OTHER.id });
    await seedList(db, { id: 'c', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'a',
      last_visited_at: new Date('2023-01-01'),
    });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'b',
      last_visited_at: new Date('2022-01-01'),
    });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'c',
      last_visited_at: new Date('2021-01-01'),
    });

    const page = await dal.getVisitHistoryByUser(VIEWER.id, {
      limit: 1,
      offset: 1,
    });
    expect(page.map((r) => r.list_id)).toEqual(['b']);
  });

  it('Result_IncludesJoinedOwnerName', async () => {
    await seedList(db, { id: 'visited', user_id: OTHER.id });
    await seedVisit(db, {
      user_id: VIEWER.id,
      list_id: 'visited',
      last_visited_at: new Date('2021-01-01'),
    });

    const rows = await dal.getVisitHistoryByUser(VIEWER.id);
    expect(rows[0].list.user.name).toBe('Olivia Owner');
  });
});

describe('ReadErrorPaths', () => {
  it('BookmarkedQueryThrows_RejectsWithFetchError', async () => {
    vi.spyOn(db.query.list_visits, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getBookmarkedListsByUser(VIEWER.id)).rejects.toThrow(
      'Failed to fetch bookmarked lists'
    );
  });

  it('StatusQueryThrows_RejectsWithFetchError', async () => {
    vi.spyOn(db.query.list_visits, 'findFirst').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getBookmarkStatus('fav', VIEWER.id)).rejects.toThrow(
      'Failed to fetch bookmark status'
    );
  });

  it('HistoryQueryThrows_RejectsWithFetchError', async () => {
    vi.spyOn(db.query.list_visits, 'findMany').mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(dal.getVisitHistoryByUser(VIEWER.id)).rejects.toThrow(
      'Failed to fetch visit history'
    );
  });
});
