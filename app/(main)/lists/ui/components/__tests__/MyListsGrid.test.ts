import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import ListCard from '@/app/ui/components/ListCard';
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

    const tree = (await MyListsGrid({ userId: 'viewer' })) as unknown as El;
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

  it('NoLists_RendersEmptyMessageParagraph', async () => {
    const tree = (await MyListsGrid({ userId: 'viewer' })) as unknown as El;
    expect(tree.type).toBe('p');
    expect(tree.props.className).toBe('my-lists-empty');
    expect(tree.props.children).toBe('No lists yet. Create your first one.');
  });
});
