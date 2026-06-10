import { expect, test } from '@playwright/test';

// Flow: bookmark/unbookmark a seeded list and prove a visit surfaces in visit
// history — as the seeded viewer. Pins the `list_visits` cache-tag loop
// through the real `'use server'` boundary (bookmarkList / unbookmarkList) and
// the `after()` visit write fired by the list hero.
//
// Seed target: dev-list-alice-baby ("Baby On The Way") — alice is followed
// (list viewable) and the seed leaves it VISITED but NOT BOOKMARKED, so the
// bookmark arc starts from a clean negative and ends back at it.
//
// RESIDUE (benign, documented for future spec authors): opening the list
// bumps its `list_visits.last_visited_at` to "now" via the hero's `after()`
// callback. Nothing else asserts visit recency for this list, and the
// bookmark itself is removed before the spec ends — seed-equivalent state
// otherwise. This spec must NEVER navigate to a list owned by dev-friend-kim:
// the seed reserves kim as having zero `list_visits` rows.
const LIST = '/lists/dev-list-alice-baby';
const LIST_NAME = 'Baby On The Way';

test('Bookmark_ViewerBookmarksThenUnbookmarks_BookmarkSurfacesReflect', async ({
  page,
}) => {
  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_NAME }).first()
  ).toBeVisible();

  // Bookmark — the affordance flips, and the list surfaces on both bookmark
  // surfaces via fresh server reads. The flip is optimistic; the toast (a
  // role=status live region — the button's own label also reads "Bookmarked")
  // fires only after the server action commits, so wait for it before
  // navigating.
  await page.getByRole('button', { name: 'Bookmark list' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Bookmarked' })
  ).toBeVisible();

  await page.goto('/lists/bookmarks');
  await expect(
    page.locator('.list-card-name', { hasText: LIST_NAME })
  ).toBeVisible();

  // The fresh favorited_at guarantees a slot in the home Bookmarks rail's
  // recency-capped five.
  await page.goto('/');
  const bookmarksRail = page.locator('section.rail-bookmarks');
  await expect(
    bookmarksRail.locator('.list-card-name', { hasText: LIST_NAME })
  ).toBeVisible();

  // Unbookmark — back to the seeded negative; the bookmarks page drops it.
  await page.goto(LIST);
  await page.getByRole('button', { name: 'Remove bookmark' }).click();
  await expect(page.getByRole('button', { name: 'Bookmark list' })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Bookmark removed' })
  ).toBeVisible();

  await page.goto('/lists/bookmarks');
  // Anchor on a seeded bookmark first so the absence check can't pass against
  // a not-yet-rendered page.
  await expect(
    page.locator('.list-card-name', { hasText: "Alice's Wedding Registry" })
  ).toBeVisible();
  await expect(
    page.locator('.list-card-name', { hasText: LIST_NAME })
  ).toHaveCount(0);
});

test('VisitHistory_ViewerOpensSeededList_SurfacesAsMostRecentEntry', async ({
  page,
}) => {
  // The seeded visit for this list is a day old, so only the in-run `after()`
  // write can put it at the top of the history page — recency proves the
  // write→revalidate→fresh-read loop, not the seed.
  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_NAME }).first()
  ).toBeVisible();

  await page.goto('/lists/history');
  await expect(
    page.locator('.list-card-grid li').first().locator('.list-card-name')
  ).toContainText(LIST_NAME);
});
