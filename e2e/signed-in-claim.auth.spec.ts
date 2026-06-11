import { expect, test } from '@playwright/test';
import { firstClaimableSingleItem } from '../test/helpers/e2e/utils';

// Flow: a signed-in (authenticated) non-owner claims an item on a friend-owned
// Shared list (dev-list-alice-wedding), as the seeded viewer signed in via the
// bypass. The signed-in vs signed-out axis is the whole point: this is the
// authenticated counterpart to guest-claim.guest.spec (logged-out). The viewer
// happens to follow the owner, but the relationship is incidental — any caller
// may view/claim a non-Hidden list.
//
// The single-screen claim modal records different row shapes per path, two of
// which are covered here (the attributed-picker path lives in
// claim-attribution.auth.spec):
//   1. "I'm getting this"  — a one-tap self-claim → recorded as the viewer's
//      own claim (purchaser = viewer) → shows "You claimed this".
//   2. name fallback        — a claim for a named non-user → recorded with the
//      viewer as claimer and the typed name as guest label → the claimer's own
//      banner reads "You claimed this for <name>" (other viewers see
//      "Claimed by <name>").
//
// Self-claim assertions are scoped by item name: seeded viewer claims on OTHER
// items also read "You claimed this", so a bare match would not prove THIS claim
// landed. The fallback assertion uses a per-run-unique purchaser name, so it is
// unambiguous on its own.
const LIST = '/lists/dev-list-alice-wedding';
const LIST_HEADING = "Alice's Wedding Registry";

test('SignedInClaim_SelfClaimOneTap_ShowsOwnClaim', async ({ page }) => {
  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_HEADING }).first()
  ).toBeVisible();

  const item = firstClaimableSingleItem(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();

  // Open the claim modal; the primary CTA self-claims in one tap — no
  // confirmation screen.
  await item.getByRole('button', { name: 'Claim this item' }).click();
  await page.getByRole('button', { name: "I'm getting this" }).click();

  // The item reflects the viewer's own claim, and it persists across a fresh
  // server render.
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(claimed.getByText('You claimed this').first()).toBeVisible();

  await page.reload();
  const claimedAfter = page.locator('.item-container', { hasText: itemName });
  await expect(claimedAfter.getByText('You claimed this').first()).toBeVisible();
});

test('SignedInClaim_NameFallbackForNonUser_ShowsClaimerBannerWithName', async ({
  page,
}) => {
  const purchaser = `Buyer${Date.now()}`;

  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_HEADING }).first()
  ).toBeVisible();

  const item = firstClaimableSingleItem(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();

  // Open the claim modal and expand the "not listed" fallback for a
  // purchaser without an account.
  await item.getByRole('button', { name: 'Claim this item' }).click();
  await page
    .getByRole('button', { name: 'Someone not listed? Enter their name' })
    .click();
  await page.getByLabel('Their name').fill(purchaser);
  await page.getByRole('button', { name: `Claim for ${purchaser}` }).click();

  // The viewer asserted the claim (claimed_by), so their banner names the
  // third party; it persists on reload and never reads as a bare
  // "You claimed this" (which would mean the claim was misattributed to the
  // viewer as purchaser).
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimed.getByText(`You claimed this for ${purchaser}`).first()
  ).toBeVisible();

  await page.reload();
  const claimedAfter = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimedAfter.getByText(`You claimed this for ${purchaser}`).first()
  ).toBeVisible();
});
