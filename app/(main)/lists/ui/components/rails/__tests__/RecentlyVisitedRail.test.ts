import { beforeEach, describe, expect, it, vi } from 'vitest';

import MoreCard from '@/app/ui/components/MoreCard';
import HistoryCard from '@/app/(main)/lists/history/HistoryCard';
import { list_visits, lists } from '@/db/schema';
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

mockNextCache();
// HistoryCard → HistoryActions → @/app/actions/lists → @/lib/auth → next-auth.
// Mock the auth boundary so the transitive next-auth import does not load
// (NextAuth network-boundary allowance); this rail test never exercises auth.
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let dal: typeof import('@/lib/dal');
let RecentlyVisitedRail: typeof import('../RecentlyVisitedRail').default;

beforeEach(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  dal = await import('@/lib/dal');
  RecentlyVisitedRail = (await import('../RecentlyVisitedRail')).default;
  await seedUsers(db, [{ id: 'viewer' }, { id: 'owner', name: 'Olive' }]);
});

async function seedVisit(listId: string, lastVisitedAt: Date): Promise<void> {
  await db.insert(lists).values({
    id: listId,
    name: `Name ${listId}`,
    occasion: 'birthday',
    user_id: 'owner',
  });
  await db.insert(list_visits).values({
    user_id: 'viewer',
    list_id: listId,
    last_visited_at: lastVisitedAt,
  });
}

type El = { type: unknown; props: Record<string, unknown> };

function rowItems(tree: El): El[] {
  return (tree.props.children as unknown[]).flat().filter(
    (c): c is El => !!c && typeof c === 'object' && 'props' in c
  );
}

function childTypeOf(item: El): unknown {
  return (item.props.children as El | undefined)?.type;
}

function historyCardItems(tree: El): El[] {
  return rowItems(tree).filter((c) => childTypeOf(c) === HistoryCard);
}

describe('RecentlyVisitedRail', () => {
  it('NoVisits_RendersEmptyState', async () => {
    const tree = (await RecentlyVisitedRail({ userId: 'viewer' })) as unknown as El;
    expect(tree.type).toBe('div');
    expect(tree.props.className).toBe('list-card-row-empty');
    expect(tree.props.children).toBe('No visits yet.');
  });

  it('OverFiveVisits_CapsCardsAtFiveAndRendersMoreCard', async () => {
    for (let i = 0; i < 7; i++) {
      await seedVisit(`l${i}`, new Date(2021, 0, i + 1));
    }

    const tree = (await RecentlyVisitedRail({ userId: 'viewer' })) as unknown as El;
    expect(historyCardItems(tree)).toHaveLength(5);

    const moreCard = rowItems(tree).at(-1)!.props.children as El;
    expect(moreCard.type).toBe(MoreCard);
    expect((moreCard.props as { href: string }).href).toBe('/lists/history');
  });

  it('FiveOrFewer_NoMoreCard', async () => {
    for (let i = 0; i < 3; i++) {
      await seedVisit(`l${i}`, new Date(2021, 0, i + 1));
    }

    const tree = (await RecentlyVisitedRail({ userId: 'viewer' })) as unknown as El;
    expect(historyCardItems(tree)).toHaveLength(3);
    const hasMoreCard = rowItems(tree).some((c) => childTypeOf(c) === MoreCard);
    expect(hasMoreCard).toBe(false);
  });

  it('AnyViewer_RequestsFiftyMostRecentVisits', async () => {
    const spy = vi.spyOn(dal, 'getVisitHistoryByUser');
    await seedVisit('l0', new Date(2021, 0, 1));

    await RecentlyVisitedRail({ userId: 'viewer' });
    expect(spy).toHaveBeenCalledWith('viewer', { limit: 50 });
  });

  it('HistoryCard_ReceivesRowProp', async () => {
    await seedVisit('l0', new Date(2021, 0, 1));

    const tree = (await RecentlyVisitedRail({ userId: 'viewer' })) as unknown as El;
    const card = historyCardItems(tree)[0].props.children as El;
    expect((card.props as { row: { list_id: string } }).row.list_id).toBe('l0');
  });
});
