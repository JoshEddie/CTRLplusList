import {
  clearTestCookies,
  mockNextHeaders,
  setTestCookie,
} from '@/test/helpers/next-headers';
import { Suspense } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth';
import { ACTIVE_PROFILE_COOKIE } from '@/lib/data/profile.cookie';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedManagedProfile,
  seedMembership,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';
import CollapsibleRail from '../lists/ui/components/CollapsibleRail';
import BookmarksRail from '../lists/ui/components/rails/BookmarksRail';
import FollowingRail from '../lists/ui/components/rails/FollowingRail';
import MyListsRail from '../lists/ui/components/rails/MyListsRail';
import RecentlyVisitedRail from '../lists/ui/components/rails/RecentlyVisitedRail';

mockNextCache();
mockNextHeaders();
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

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  HomePage = (await import('../HomePage')).default;
});

beforeEach(async () => {
  await resetDb(db);
  clearTestCookies();
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

  it('EachRail_WrapsMatchingRailInSuspenseWithItsViewerKey', async () => {
    const tree = await renderWithViewer();
    // My Lists is profile-scoped; the account-keyed rails (follow graph,
    // bookmarks, visit history) still take the viewer's account id.
    const expected = [
      { component: MyListsRail, props: { profileId: selfProfileOf('viewer') } },
      { component: FollowingRail, props: { userId: 'viewer' } },
      { component: BookmarksRail, props: { userId: 'viewer' } },
      { component: RecentlyVisitedRail, props: { userId: 'viewer' } },
    ];
    rails(tree).forEach((rail, i) => {
      const suspense = rail.props.children as El;
      expect(suspense.type).toBe(Suspense);
      const inner = suspense.props.children as El;
      expect(inner.type).toBe(expected[i].component);
      expect(inner.props).toEqual(expected[i].props);
    });
  });

  it('ActingAsAManagedProfile_KeysMyListsToItAndTheRestToTheAccount', async () => {
    const unswitched = await renderWithViewer();
    await seedManagedProfile(db, { id: 'kiddo', name: 'Kiddo' });
    await seedMembership(db, { user_id: 'viewer', profile_id: 'kiddo' });
    setTestCookie(ACTIVE_PROFILE_COOKIE, 'kiddo');
    const switched = (await HomePage()) as unknown as El;

    const railProps = (t: El) =>
      rails(t).map((rail) => {
        const suspense = rail.props.children as El;
        return (suspense.props.children as El).props;
      });

    expect(railProps(switched)).toEqual([
      { profileId: 'kiddo' },
      { userId: 'viewer' },
      { userId: 'viewer' },
      { userId: 'viewer' },
    ]);
    expect(railProps(unswitched)[0]).toEqual({
      profileId: selfProfileOf('viewer'),
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
