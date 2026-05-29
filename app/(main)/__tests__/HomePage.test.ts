import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth';
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';
import BookmarkMigrationToast from '../lists/ui/components/BookmarkMigrationToast';
import CollapsibleRail from '../lists/ui/components/CollapsibleRail';
import BookmarksRail from '../lists/ui/components/rails/BookmarksRail';
import FollowingRail from '../lists/ui/components/rails/FollowingRail';
import MyListsRail from '../lists/ui/components/rails/MyListsRail';
import RecentlyVisitedRail from '../lists/ui/components/rails/RecentlyVisitedRail';

mockNextCache();
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

let db: TestDb;
let HomePage: typeof import('../HomePage').default;

beforeEach(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  HomePage = (await import('../HomePage')).default;
  redirectMock.mockClear();
});

type El = { type: unknown; props: Record<string, unknown> };

async function renderWithViewer(): Promise<El> {
  await seedUsers(db, [{ id: 'viewer', email: 'viewer@test.local' }]);
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  return (await HomePage()) as unknown as El;
}

function childrenOf(el: El): El[] {
  return el.props.children as El[];
}

function rails(tree: El): El[] {
  return childrenOf(tree).filter((c) => c.type === CollapsibleRail);
}

describe('HomePage', () => {
  it('NoSessionEmail_RedirectsToSignIn', async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    await expect(HomePage()).rejects.toThrow('REDIRECT:/sign-in');
    expect(redirectMock).toHaveBeenCalledWith('/sign-in');
  });

  it('EmailResolvesToNoUser_RedirectsToSignIn', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { email: 'ghost@test.local' },
    } as never);
    await expect(HomePage()).rejects.toThrow('REDIRECT:/sign-in');
    expect(redirectMock).toHaveBeenCalledWith('/sign-in');
  });

  it('ViewerResolved_RendersToastThenFourRailsInOrder', async () => {
    const tree = await renderWithViewer();
    const children = childrenOf(tree);
    expect(children[0].type).toBe(BookmarkMigrationToast);

    const railNames = rails(tree).map((c) => c.props.name);
    expect(railNames).toEqual([
      'my-lists',
      'following',
      'bookmarks',
      'recently-visited',
    ]);
  });

  it('EachRail_HasExpectedNameTitleSeeAllHref', async () => {
    const tree = await renderWithViewer();
    const got = rails(tree).map((r) => ({
      name: r.props.name,
      title: r.props.title,
      seeAllHref: r.props.seeAllHref,
    }));
    expect(got).toEqual([
      { name: 'my-lists', title: 'My Lists', seeAllHref: '/lists' },
      { name: 'following', title: 'Following', seeAllHref: '/following' },
      { name: 'bookmarks', title: 'Bookmarks', seeAllHref: '/lists/bookmarks' },
      {
        name: 'recently-visited',
        title: 'Recently visited',
        seeAllHref: '/lists/history',
      },
    ]);
  });

  it('EachRail_WrapsMatchingRailInSuspenseWithViewerId', async () => {
    const tree = await renderWithViewer();
    const railComponents = [
      MyListsRail,
      FollowingRail,
      BookmarksRail,
      RecentlyVisitedRail,
    ];
    rails(tree).forEach((rail, i) => {
      const suspense = rail.props.children as El;
      expect(suspense.type).toBe(Suspense);
      const inner = suspense.props.children as El;
      expect(inner.type).toBe(railComponents[i]);
      expect((inner.props as { userId: string }).userId).toBe('viewer');
    });
  });

  it('ThreeDividers_RenderBetweenRails', async () => {
    const tree = await renderWithViewer();
    const dividers = childrenOf(tree).filter(
      (c) =>
        c.type === 'div' &&
        (c.props as { className?: string }).className === 'home-rail-divider' &&
        (c.props as { role?: string }).role === 'separator'
    );
    expect(dividers).toHaveLength(3);
  });
});
