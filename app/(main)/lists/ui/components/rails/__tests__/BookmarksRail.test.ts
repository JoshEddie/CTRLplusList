import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import ListCardRow from '@/app/ui/components/ListCardRow';
import { list_visits, lists } from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let BookmarksRail: typeof import('../BookmarksRail').default;

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  BookmarksRail = (await import('../BookmarksRail')).default;
});

beforeEach(async () => {
  await resetDb(db);
  await seedUsers(db, [{ id: 'viewer' }, { id: 'owner', name: 'Olive' }]);
});

async function seedBookmark(
  listId: string,
  favoritedAt: Date,
  list: { subtitle?: string | null } = {}
): Promise<void> {
  await db.insert(lists).values({
    id: listId,
    name: `Name ${listId}`,
    subtitle: list.subtitle ?? null,
    occasion: 'birthday',
    user_id: 'owner',
  });
  await db.insert(list_visits).values({
    user_id: 'viewer',
    list_id: listId,
    favorited_at: favoritedAt,
  });
}

describe('BookmarksRail', () => {
  it('OverFiveBookmarks_CapsAtFiveWithRemainder', async () => {
    for (let i = 0; i < 7; i++) {
      await seedBookmark(`l${i}`, new Date(2021, 0, i + 1));
    }

    const tree = await BookmarksRail({ userId: 'viewer' });
    expect(tree.type).toBe(ListCardRow);
    expect(tree.props.lists).toHaveLength(5);
    expect(tree.props.moreCount).toBe(2);
    expect(tree.props.seeAllHref).toBe('/lists/bookmarks');
    expect(tree.props.showOwner).toBe(true);
  });

  it('BookmarkRow_MapsToCardShape', async () => {
    await seedBookmark('l1', new Date(2021, 0, 1), { subtitle: 'Sub' });

    const tree = await BookmarksRail({ userId: 'viewer' });
    const entry = tree.props.lists[0];
    expect(entry.id).toBe('l1');
    expect(entry.name).toBe('Name l1');
    expect(entry.subtitle).toBe('Sub');
    expect(entry.occasion).toBe('birthday');
    expect(entry.date).toBeInstanceOf(Date);
    expect(entry.user).toEqual({ name: 'Olive' });
  });

  it('NoBookmarks_PassesEmptyMessage', async () => {
    const tree = await BookmarksRail({ userId: 'viewer' });
    expect(tree.props.lists).toHaveLength(0);
    expect(tree.props.emptyMessage).toBe('No bookmarks yet.');
  });
});
