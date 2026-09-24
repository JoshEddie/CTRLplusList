import { expect, test } from '@playwright/test';

// Edit opens in place over the library: while it is open the document under it
// holds still, and a clean close leaves the page where it was — same URL, same
// scroll — and scrollable again.
//
// Read-only against the seed: opens the first seeded item's editor and closes
// it without submitting, so the arc leaves no residue.
test('EditItemOverlay_OwnerOpensFromKebabThenCloses_PageStateKept-LibraryScrollsAgain', async ({
  page,
}) => {
  await page.goto('/items');
  const scrollY = () => page.evaluate(() => window.scrollY);
  // Re-wheels on every poll: a wheel is a one-shot, and hydration restores the
  // scroll position, so a single tick landing before the route hydrates is
  // silently undone and never retried.
  const wheelThenScrollY = async (dy = 400) => {
    await page.mouse.wheel(0, dy);
    return scrollY();
  };

  await expect.poll(() => wheelThenScrollY()).toBeGreaterThan(0);

  // The last card sits at or below the fold, so bringing its kebab into view
  // only scrolls further down; the position to keep is read once the menu is up.
  await page.getByRole('button', { name: 'Item actions' }).last().click();
  const url = page.url();
  const kept = await scrollY();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const close = page.getByRole('button', { name: 'Close' });
  await expect(close).toBeVisible();
  expect(page.url()).toBe(url);

  // The open overlay owns the screen: the document under it must not move.
  await page.mouse.wheel(0, 400);
  await expect.poll(scrollY).toBe(kept);

  await close.click();
  await expect(close).toBeHidden();
  expect(page.url()).toBe(url);
  expect(await scrollY()).toBe(kept);

  await expect.poll(() => wheelThenScrollY(-400)).toBeLessThan(kept);
});
