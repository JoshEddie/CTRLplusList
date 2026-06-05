import { expect, test } from '@playwright/test';

// Flow: "owner sees a claim" with spoiler hiding. Against a viewer-owned list
// carrying seeded claims (dev-list-viewer-birthday — every seeded viewer list
// has claimed items; defensive seeded fixture), the owner's DEFAULT view hides
// every claim (`sanitizePurchases` returns [] for an owner without spoilers),
// while `?spoilers=1` reveals the claimer's first name. Pins that owner-default
// ⇄ owner-spoiler divergence — the contract a regression would most likely
// silently break.
const LIST = '/lists/dev-list-viewer-birthday';

test('OwnerView_SpoilerToggle_HidesThenRevealsClaim', async ({ page }) => {
  // Default view: items render, but no spoiler banner leaks any claim.
  await page.goto(LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();
  await expect(page.getByText('Spoilers:')).toHaveCount(0);

  // Spoiler-enabled view: the owner now sees the claim, including a revealed
  // claimer first name after the dash.
  await page.goto(`${LIST}?spoilers=1`);
  const spoiler = page.locator('.purchased-banner--spoiler').first();
  await expect(spoiler).toBeVisible();
  await expect(spoiler).toContainText(/claimed\s*[—–-]\s*[A-Za-z]/);
});
