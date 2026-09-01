import { expect, test } from '@playwright/test';

import { raiseSpoilerTier } from './helpers/spoilers';

// Critical flow 14.1: the transient tier. A protected member raises their
// claim visibility for one page view through the hero's Spoilers tile, sees a
// claim their baseline withheld, and — because the choice lives in the URL and
// nothing is written against the membership — lands back on the protected view
// once they navigate away and return.
//
// `dev-test-viewer` holds a self membership on their own self-profile with no
// stored tier, so it resolves to the fully protected `surprise` baseline and
// `dev-list-viewer-birthday` discloses no other party's claim. The seed's
// legacy guest row ("Grandma" on `dev-list-viewer-birthday-item-3`) is the
// withheld claim this flow reveals; protected-claim.auth.spec mutates other
// claims on this list but never removes Grandma, so the assertion holds
// whichever spec runs first.
const OWN_LIST = '/lists/dev-list-viewer-birthday';

test('ListHero_MemberRaisesTierViaSpoilerTile_RevealsWithheldClaim', async ({
  page,
}) => {
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  // The baseline view: the owner-side spoiler banner names no claim at all.
  await expect(page.locator('.purchased-banner--spoiler')).toHaveCount(0);

  await raiseSpoilerTier(page, 'Show who claimed what');

  // The raised tier is carried by the URL, and the withheld claim — a guest's,
  // which the baseline stripped from the payload — is now named.
  await expect(page).toHaveURL(/spoiler=identity/);
  await expect(
    page.locator('.purchased-banner--spoiler', { hasText: 'Grandma' }).first()
  ).toBeVisible();
});

test('ListHero_MemberLeavesAndReturns_RestoresProtectedView', async ({
  page,
}) => {
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  await raiseSpoilerTier(page, 'Show who claimed what');
  await expect(page).toHaveURL(/spoiler=identity/);
  await expect(
    page.locator('.purchased-banner--spoiler').first()
  ).toBeVisible();

  // A reload keeps it — the adjustment is in the URL, not in memory.
  await page.reload();
  await expect(page).toHaveURL(/spoiler=identity/);
  await expect(
    page.locator('.purchased-banner--spoiler').first()
  ).toBeVisible();

  // Leaving and coming back does not: nothing was written against the
  // membership, so the viewer lands on their baseline again.
  await page.goto('/lists');
  await page.goto(OWN_LIST);
  await expect(page).not.toHaveURL(/spoiler=/);
  await expect(page.locator('.purchased-banner--spoiler')).toHaveCount(0);
});
