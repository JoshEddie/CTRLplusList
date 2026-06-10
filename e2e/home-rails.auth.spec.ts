import { expect, test } from '@playwright/test';

// Flow: per-rail content signal on the home page as the seeded viewer. Each
// rail renders inside its own <Suspense> boundary, so a crashed or silently
// empty rail read (getListsByUser, getFollowingFeedUsers,
// getBookmarkedListsByUser, getVisitHistoryByUser) would pass any whole-page
// assertion — these tests pin each rail individually.
//
// Assertions are region-scoped and order-independent by design: at least one
// rendered card and no empty-state text, never specific names, positions, or
// the 5-item cap. Earlier specs' writes (created lists, toggled follows and
// bookmarks, bumped visits) displace rail contents but never empty a rail, so
// this file passes anywhere in the run order.
const RAILS = [
  {
    token: 'MyLists',
    section: 'section.rail-my-lists',
    title: 'My Lists',
    card: '.list-card',
    emptyText: 'No lists yet. Create your first one.',
  },
  {
    token: 'Following',
    section: 'section.rail-following',
    title: 'Following',
    card: '.user-card',
    emptyText: 'Not following anyone yet.',
  },
  {
    token: 'Bookmarks',
    section: 'section.rail-bookmarks',
    title: 'Bookmarks',
    card: '.list-card',
    emptyText: 'No bookmarks yet.',
  },
  {
    token: 'RecentlyVisited',
    section: 'section.rail-recently-visited',
    title: 'Recently visited',
    card: '.list-card',
    emptyText: 'No visits yet.',
  },
] as const;

for (const rail of RAILS) {
  test(`HomeRails_LoadHome_${rail.token}RailShowsCardsNotEmptyState`, async ({
    page,
  }) => {
    await page.goto('/');
    const region = page.locator(rail.section);
    await expect(
      region.getByRole('heading', { name: rail.title, exact: true })
    ).toBeVisible();
    await expect(region.locator(rail.card).first()).toBeVisible();
    await expect(region.getByText(rail.emptyText)).toHaveCount(0);
  });
}
