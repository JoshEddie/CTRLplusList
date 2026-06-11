import { expect, test } from '@playwright/test';

// Flow: "owner sees a claim" with spoiler hiding. Against a viewer-owned list
// carrying seeded claims (dev-list-viewer-birthday — every seeded viewer list
// has claimed items; defensive seeded fixture), the owner's DEFAULT view hides
// every claim (`sanitizePurchases` returns [] for an owner without spoilers),
// while `?spoilers=1` reveals the claimer's first name. Pins that owner-default
// ⇄ owner-spoiler divergence — the contract a regression would most likely
// silently break.
//
// The assertion targets the seeded legacy guest claim ("Grandma" on
// dev-list-viewer-birthday-item-3): claim-attribution.auth.spec mutates other
// claims on this list in a parallel worker, but nothing removes Grandma.
const LIST = '/lists/dev-list-viewer-birthday';

test('OwnerView_SpoilerToggle_HidesThenRevealsClaim', async ({ page }) => {
  // Default view: items render, but no spoiler banner leaks any claim.
  await page.goto(LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();
  await expect(page.getByText('Spoilers:')).toHaveCount(0);

  // Spoiler-enabled view: the owner now sees the claims, including the
  // revealed claimer name on a per-claim row.
  await page.goto(`${LIST}?spoilers=1`);
  const spoiler = page
    .locator('.purchased-banner--spoiler', { hasText: 'Grandma' })
    .first();
  await expect(spoiler).toBeVisible();
  await expect(spoiler).toContainText('claimed');
});
