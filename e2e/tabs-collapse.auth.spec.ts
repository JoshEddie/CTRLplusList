import { expect, test } from '@playwright/test';

// The only place the strip's collapse can be covered. It is decided by
// measuring the rendered row against the shell, and jsdom has no layout — the
// unit suite stubs ResizeObserver and every width reads 0, so the strip never
// collapses there. These specs pin both halves of the decision: that it
// collapses when the row genuinely overflows, and that it does NOT when the row
// fits, which a hand-written breakpoint got wrong.

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 720 };

test('ListCollections_ViewerOnPhone_ShowsOnlyTheActiveTabUntilOpened', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto('/lists');

  const nav = page.getByRole('navigation', { name: 'List collections' });
  await expect(nav.getByRole('link', { name: 'My Lists' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Bookmarks' })).toBeHidden();
  await expect(nav.getByRole('link', { name: 'Following' })).toBeHidden();
});

test('ListCollections_ViewerOpensCollapsedStrip_RevealsAndNavigatesToAnotherTab', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto('/lists');

  const nav = page.getByRole('navigation', { name: 'List collections' });
  await nav.getByRole('link', { name: 'My Lists' }).click();

  const bookmarks = nav.getByRole('link', { name: 'Bookmarks' });
  await expect(bookmarks).toBeVisible();

  await bookmarks.click();

  // These pages carry no heading — the strip is the page's title — so the proof
  // of arrival is that the collapsed face became the tab that was chosen.
  await expect(page).toHaveURL(/\/lists\/bookmarks$/);
  await expect(nav.getByRole('link', { name: 'Bookmarks' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(nav.getByRole('link', { name: 'My Lists' })).toBeHidden();
});

test('ListCollections_ViewerOnDesktop_ShowsEveryTabWithoutOpening', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/lists');

  const nav = page.getByRole('navigation', { name: 'List collections' });
  for (const name of [
    'My Lists',
    'Bookmarks',
    'Recently visited',
    'Following',
  ]) {
    await expect(nav.getByRole('link', { name })).toBeVisible();
  }
});

// The regression: a two-tab strip fits a phone with room to spare, and a
// hand-picked breakpoint collapsed it anyway.
test('Items_ViewerOnPhone_KeepsBothArchiveTabsInline', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('/items');

  await expect(page.getByRole('tab', { name: /^Active/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Archived/ })).toBeVisible();
});
