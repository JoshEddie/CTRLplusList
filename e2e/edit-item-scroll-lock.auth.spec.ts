import { expect, test } from '@playwright/test';

// Regression: the edit-item modal is its own route (`/items/[id]`), so closing
// it pops history — and the App Router keeps the route you left mounted but
// hidden. A scroll lock written as `html:has(.modal-overlay-scrim)` therefore
// stayed matched by the cached-and-invisible modal, and the library behind it
// never scrolled again. Browser-only: jsdom has no hidden-segment cache, so
// nothing below this line is reachable from a component test.
//
// Read-only against the seed: opens the first seeded item's editor and closes
// it without submitting, so the arc leaves no residue.
test('EditItemModal_OwnerOpensFromKebabThenCloses_LibraryScrollsAgain', async ({
  page,
}) => {
  await page.goto('/items');
  const scrollY = () => page.evaluate(() => window.scrollY);
  // Re-wheels on every poll: a wheel is a one-shot, and hydration restores the
  // scroll position, so a single tick landing before the route hydrates is
  // silently undone and never retried.
  const wheelThenScrollY = async () => {
    await page.mouse.wheel(0, 400);
    return scrollY();
  };

  await expect.poll(wheelThenScrollY).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.getByRole('button', { name: 'Item actions' }).first().click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const close = page.getByRole('button', { name: 'Close' });
  await expect(close).toBeVisible();

  // The open modal owns the screen: the document under it must not move.
  await page.mouse.wheel(0, 400);
  await expect.poll(scrollY).toBe(0);

  await close.click();
  await expect(page).toHaveURL(/\/items$/);

  await expect.poll(wheelThenScrollY).toBeGreaterThan(0);
});
