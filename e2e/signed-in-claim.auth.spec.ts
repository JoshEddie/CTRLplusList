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
//   1. 'Claim this gift'  — a one-tap self-claim → recorded as the viewer's
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

  // Open the purchase modal via the card's "Add Claim" affordance; the
  // primary CTA self-claims in one tap — no confirmation screen.
  await item.getByRole('button', { name: 'Add Claim' }).click();
  await page.getByRole('button', { name: 'Claim this gift' }).click();

  // The item reflects the viewer's own claim, and it persists across a fresh
  // server render.
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(claimed.getByText('You claimed this').first()).toBeVisible();

  await page.reload();
  const claimedAfter = page.locator('.item-container', { hasText: itemName });
  await expect(claimedAfter.getByText('You claimed this').first()).toBeVisible();
});

test('SignedInClaim_ViewItemInEveryClaimState_ModalStillCarriesStoreRow', async ({
  page,
}) => {
  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_HEADING }).first()
  ).toBeVisible();

  const viewItemName = 'View item — opens in new tab';

  // A claimable card with a complete store offers View item ↗ (new tab, store
  // URL) alongside the claim affordance — the price line stays inert metadata.
  // Exclude viewer-claimed cards: they also carry a secondary "Add Claim",
  // but their modal opens in the already-claimed state (no "Claim this gift").
  const claimable = page
    .locator('.item-container')
    .filter({ has: page.getByRole('button', { name: 'Add Claim' }) })
    .filter({ hasNot: page.getByRole('button', { name: 'Manage claim' }) })
    .filter({ hasNotText: 'You claimed this' })
    .filter({ has: page.locator('.item-store-metadata') })
    .first();
  const claimableView = claimable.getByRole('link', { name: viewItemName });
  await expect(claimableView).toBeVisible();
  await expect(claimableView).toHaveAttribute('target', '_blank');
  await expect(claimableView).toHaveAttribute('href', /^https?:\/\//);

  // A fully-claimed card keeps store access: the claim affordance is replaced
  // by the Fully claimed status, but View item ↗ still renders.
  const fullyClaimed = page
    .locator('.item-container')
    .filter({ hasText: 'Fully claimed' })
    .first();
  // Two status regions can coexist on the card (the action-area pill and the
  // "Claimed by …" banner) — assert the pill specifically.
  await expect(
    fullyClaimed.getByRole('status').filter({ hasText: 'Fully claimed' })
  ).toBeVisible();
  await expect(
    fullyClaimed.getByRole('link', { name: viewItemName })
  ).toBeVisible();
  await expect(
    fullyClaimed.getByRole('button', { name: 'Add Claim' })
  ).toHaveCount(0);

  // Opening the modal still surfaces the store row (cheapest store, new tab)
  // in the same surface as the claim CTA.
  await claimable.getByRole('button', { name: 'Add Claim' }).click();
  const storeLink = page.locator('.modal-store-row').getByRole('link').first();
  await expect(storeLink).toBeVisible();
  await expect(storeLink).toHaveAttribute('target', '_blank');
  await expect(
    page.getByRole('button', { name: 'Claim this gift', exact: true })
  ).toBeVisible();
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

  // Open the purchase modal, expand the attributed-claim disclosure, and use
  // the "Someone not listed?" fallback for a purchaser without an account.
  await item.getByRole('button', { name: 'Add Claim' }).click();
  await page
    .getByRole('button', { name: /Claiming for someone else\?/ })
    .click();
  await page.getByLabel('Someone not listed?').fill(purchaser);
  await page.getByRole('button', { name: `Confirm — ${purchaser}` }).click();

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
