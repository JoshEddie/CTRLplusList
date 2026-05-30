import { beforeEach, describe, expect, it, vi } from 'vitest';

import UserCard from '@/app/(main)/users/ui/components/UserCard';
import MoreCard from '@/app/ui/components/MoreCard';
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedFollow,
  seedPublicList,
  seedUsers,
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
let FollowingRail: typeof import('../FollowingRail').default;

beforeEach(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  FollowingRail = (await import('../FollowingRail')).default;
  await seedUsers(db, [{ id: 'viewer' }]);
});

async function seedFollowees(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const id = `f${i}`;
    await seedUsers(db, [{ id, name: `Followee ${i}`, image: `${id}.png` }]);
    await seedFollow(db, 'viewer', id);
    await seedPublicList(db, {
      id: `l${i}`,
      user_id: id,
      visibility: 'followers',
      shared_at: new Date(2021, 0, i + 1),
    });
  }
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

function userCardItems(tree: El): El[] {
  return rowItems(tree).filter((c) => childTypeOf(c) === UserCard);
}

describe('FollowingRail', () => {
  it('NoFollowees_RendersEmptyState', async () => {
    const tree = await FollowingRail({ userId: 'viewer' });
    expect(tree.type).toBe('div');
    expect(tree.props.className).toBe('list-card-row-empty');
    expect(tree.props.children).toBe('Not following anyone yet.');
  });

  it('OverFiveFollowees_CapsCardsAtFiveAndRendersMoreCard', async () => {
    await seedFollowees(7);

    const tree = (await FollowingRail({ userId: 'viewer' })) as unknown as El;
    expect(userCardItems(tree)).toHaveLength(5);

    const last = rowItems(tree).at(-1)!;
    const moreCard = last.props.children as El;
    expect(moreCard.type).toBe(MoreCard);
    expect((moreCard.props as { moreCount: number }).moreCount).toBe(2);
    expect((moreCard.props as { href: string }).href).toBe('/following');
  });

  it('FiveOrFewer_NoMoreCard', async () => {
    await seedFollowees(3);

    const tree = (await FollowingRail({ userId: 'viewer' })) as unknown as El;
    expect(userCardItems(tree)).toHaveLength(3);
    const hasMoreCard = rowItems(tree).some((c) => childTypeOf(c) === MoreCard);
    expect(hasMoreCard).toBe(false);
  });

  it('UserCard_ReceivesIdNameImageNewCountLatestSharedCompact', async () => {
    await seedFollowees(1);

    const tree = (await FollowingRail({ userId: 'viewer' })) as unknown as El;
    const card = userCardItems(tree)[0].props.children as El;
    const props = card.props as {
      user: unknown;
      newCount: number;
      latestSharedAt: unknown;
      compact: boolean;
    };
    expect(props.user).toEqual({ id: 'f0', name: 'Followee 0', image: 'f0.png' });
    expect(props.newCount).toBe(0);
    expect(String(props.latestSharedAt)).toContain('2021');
    expect(props.compact).toBe(true);
  });
});
