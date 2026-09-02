import { expect, test } from '@playwright/test';

import { raiseSpoilerTier } from './helpers/spoilers';

// Critical flow 14.1: the transient tier. A protected member raises their
// claim visibility for one page view through the hero's Spoilers tile, sees a
// claim count their baseline withheld, and — because the choice lives in the URL and
// nothing is written against the membership — lands back on the protected view
// once they navigate away and return.
//
// `dev-test-viewer` holds a self membership on their own self-profile with no
// stored tier, so it resolves to the fully protected `surprise` baseline and
// `dev-list-viewer-birthday` discloses no other party's claim. The seed's
// legacy guest row ("Grandma" on `dev-list-viewer-birthday-item-3`) is the
// withheld claim this flow reveals as a count; protected-claim.auth.spec
// mutates other claims on this list but never removes Grandma, so the
// assertion holds whichever spec runs first. No tier names her — that is the
// owner's manage-claims reveal, which protected-claim.auth.spec covers.
const OWN_LIST = '/lists/dev-list-viewer-birthday';

test('ListHero_MemberRaisesTierViaSpoilerTile_RevealsWithheldClaim', async ({
  page,
}) => {
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  // The baseline view: the owner-side spoiler banner names no claim at all.
  await expect(page.locator('.purchased-banner--spoiler')).toHaveCount(0);

  await raiseSpoilerTier(page, "Show what's claimed");

  // The raised tier is carried by the URL, and the withheld claim — a guest's,
  // which the baseline stripped from the payload — is now counted.
  await expect(page).toHaveURL(/spoiler=claims/);
  await expect(
    page.locator('.purchased-banner--spoiler', { hasText: 'claimed' }).first()
  ).toBeVisible();
  await expect(
    page.locator('.purchased-banner--spoiler', { hasText: 'Grandma' })
  ).toHaveCount(0);
});

test('ListHero_MemberLeavesAndReturns_RestoresProtectedView', async ({
  page,
}) => {
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  await raiseSpoilerTier(page, "Show what's claimed");
  await expect(page).toHaveURL(/spoiler=claims/);
  await expect(
    page.locator('.purchased-banner--spoiler').first()
  ).toBeVisible();

  // A reload keeps it — the adjustment is in the URL, not in memory.
  await page.reload();
  await expect(page).toHaveURL(/spoiler=claims/);
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

// A viewer list no other spec reads: this case CLAIMS, and the birthday list's
// claim set is pinned by protected-claim.auth.spec ("exactly one card offers
// management"). Same self-profile, so the same `surprise` baseline. The claim
// it leaves is never cleaned up, so a non-reseeded DB loses one unclaimed card
// per run — the seed gives this list 18, and `npm run test:e2e` reseeds.
const PROGRESS_LIST = '/lists/dev-list-viewer-holiday-2026';

// `progress` discloses exactly one thing — the hero's claimed count — so a
// claim that does not move it leaves the tier silently wrong. Claiming and
// re-reading in one server process is what proves the count is invalidated
// rather than merely cached under tags nothing fires.
test('ListHero_MemberClaimsAtProgressTier_MovesTheHeroClaimedCount', async ({
  page,
}) => {
  await page.goto(PROGRESS_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  // The count is item-distinct, so it only moves for an item nothing has
  // claimed yet — and `progress` is exactly the tier that cannot tell one
  // apart. `claims` names the unclaimed card; the flow proper runs below it.
  // The tile's own face is the settle signal: the tier is a server render
  // reached by a router push, so a card read before it lands is still the
  // surprise-tier payload — one that discloses no claim on ANY card.
  const tileFace = (label: string) =>
    page.getByRole('button', { name: new RegExp(`^Spoilers: ${label}`) });

  await raiseSpoilerTier(page, "Show what's claimed");
  await expect(tileFace('Claims shown')).toBeVisible();
  const unclaimed = page
    .locator('.item-container')
    .filter({
      has: page.getByRole('button', { name: 'Add Claim', exact: true }),
    })
    .filter({ hasNotText: 'claimed' })
    .first();
  const itemName = (await unclaimed.locator('.itemName').innerText()).trim();

  await raiseSpoilerTier(page, 'Show overall progress');
  await expect(page).toHaveURL(/spoiler=progress/);
  await expect(tileFace('Progress only')).toBeVisible();
  const label = page.locator('.list-hero-progress-label');
  const [, before, total] = /(\d+) \/ (\d+) claimed/.exec(
    await label.innerText()
  )!;

  // The owner's own claim, through the count-only reveal `progress` still
  // gates (the confirmation stands between the member and the disclosure, not
  // the tier).
  const card = page.locator('.item-container', { hasText: itemName });
  await card.getByRole('button', { name: 'Add Claim', exact: true }).click();
  await page.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.locator('.claim-reveal-summary')).toBeVisible();
  await page
    .getByRole('button', { name: 'I bought this myself', exact: true })
    .click();
  await expect(page.getByText('Claim added successfully')).toBeVisible();

  // A fresh server render at the same tier: the claim landed, so the hero
  // count landed with it.
  await page.goto(`${PROGRESS_LIST}?spoiler=progress`);
  await expect(label).toHaveText(`${Number(before) + 1} / ${total} claimed`);
});
