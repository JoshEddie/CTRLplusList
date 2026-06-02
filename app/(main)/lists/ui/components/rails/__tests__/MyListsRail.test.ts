import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import ListCardRow from '@/app/ui/components/ListCardRow';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedPublicList, seedUsers } from '@/test/helpers/seedFollowGraph';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let MyListsRail: typeof import('../MyListsRail').default;

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  MyListsRail = (await import('../MyListsRail')).default;
});

beforeEach(async () => {
  await resetDb(db);
  await seedUsers(db, [{ id: 'viewer' }]);
});

async function seedOwnedLists(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await seedPublicList(db, { id: `l${i}`, user_id: 'viewer' });
  }
}

describe('MyListsRail', () => {
  it('OverFiveLists_CapsAtFiveWithRemainder', async () => {
    await seedOwnedLists(8);

    const tree = await MyListsRail({ userId: 'viewer' });
    expect(tree.type).toBe(ListCardRow);
    expect(tree.props.lists).toHaveLength(5);
    expect(tree.props.moreCount).toBe(3);
    expect(tree.props.seeAllHref).toBe('/lists');
  });

  it('FiveOrFewer_ShowsAllZeroMore', async () => {
    await seedOwnedLists(4);

    const tree = await MyListsRail({ userId: 'viewer' });
    expect(tree.props.lists).toHaveLength(4);
    expect(tree.props.moreCount).toBe(0);
  });

  it('NoLists_PassesEmptyMessage', async () => {
    const tree = await MyListsRail({ userId: 'viewer' });
    expect(tree.props.lists).toHaveLength(0);
    expect(tree.props.emptyMessage).toBe('No lists yet. Create your first one.');
  });
});
