import { type Page } from '@playwright/test';

// Drives the hero's Spoilers tile: open the popover and pick a tier row by its
// menu title ("Keep it a surprise", "Show overall progress", "Show what's
// claimed"). The tile's accessible name starts
// "Spoilers: "; its menu is labelled "Spoilers" and each tier is a
// `menuitemradio`. Scoped to the open menu so the sticky-strip kebab's twin
// rows (rendered only while it is open) can never be the match.
export async function raiseSpoilerTier(
  page: Page,
  rowLabel: string
): Promise<void> {
  await page.getByRole('button', { name: /^Spoilers:/ }).click();
  await page
    .getByRole('menu', { name: 'Spoilers' })
    .getByRole('menuitemradio', { name: rowLabel })
    .click();
}
