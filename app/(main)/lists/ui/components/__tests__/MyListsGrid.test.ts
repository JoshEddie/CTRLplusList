import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import Empty from '@/app/ui/components/Empty';
import ListCard from '@/app/ui/components/ListCard';
import { SWITCH_PROFILE_ACTION } from '@/lib/activeProfile';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedPublicList,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let MyListsGrid: typeof import('../MyListsGrid').default;

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  MyListsGrid = (await import('../MyListsGrid')).default;
});

beforeEach(async () => {
  await resetDb(db);
  await seedUsers(db, [{ id: 'viewer' }]);
});

type El = { type: unknown; props: Record<string, unknown> };

describe('MyListsGrid', () => {
  it('OwnsLists_RendersOneListCardPerOwnedList', async () => {
    await seedPublicList(db, { id: 'l0', user_id: 'viewer' });
    await seedPublicList(db, { id: 'l1', user_id: 'viewer' });

    const tree = (await MyListsGrid({
      profileId: selfProfileOf('viewer'),
    })) as unknown as El;
    expect(tree.type).toBe('ul');
    expect(tree.props.className).toBe('list-card-grid');

    const items = tree.props.children as El[];
    expect((items[0].props.children as El).type).toBe(ListCard);
    const cardListIds = items.map(
      (li) =>
        ((li.props.children as El).props as { list: { id: string } }).list.id
    );
    expect(new Set(cardListIds)).toEqual(new Set(['l0', 'l1']));
  });

  it('NoListsSingleProfileViewer_RendersEmptyWithNoSwitchRoute', async () => {
    const tree = (await MyListsGrid({
      profileId: selfProfileOf('viewer'),
    })) as unknown as El;
    expect(tree.type).toBe(Empty);
    expect(tree.props.type).toBe('list');
    expect(tree.props.secondaryAction).toBeUndefined();
  });

  it('NoListsMultiProfileViewer_RendersEmptyWithTheProfilesRoute', async () => {
    const tree = (await MyListsGrid({
      profileId: selfProfileOf('viewer'),
      actingAs: 'Kiddo',
    })) as unknown as El;
    expect(tree.type).toBe(Empty);
    expect(tree.props.secondaryAction).toEqual(SWITCH_PROFILE_ACTION);
  });
});
