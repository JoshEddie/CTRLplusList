import { expect, test } from '@playwright/test';
import { firstClaimableSingleItem } from '../test/helpers/e2e/utils';

// Flow: a signed-in (authenticated) non-owner claims an item on a friend-owned
// Shared list (dev-list-alice-wedding), as the seeded viewer signed in via the
// bypass. The signed-in vs signed-out axis is the whole point: this is the
// authenticated counterpart to guest-claim.guest.spec (logged-out). The viewer
// happens to follow the owner, but the relationship is incidental — any caller
// may view/claim a non-Hidden list.
//
// The authenticated purchase modal has two branches, both covered below, and
// they record DIFFERENT things:
//   1. "I purchased it"  — a self-claim → recorded as the viewer's own claim
//      (user_id = viewer) → shows "You claimed this".
//   2. "Someone else"    — a claim on behalf of a named third party → recorded
//      as that named guest (user_id NULL, guest_name = entered name) → shows
//      "Claimed by <name>", NOT "You claimed this".
//
// These pin the non-owner observer of the spoiler mechanism. The owner-side
// hiding of that same claim is the divergence pinned by owner-spoiler.auth.spec
// (the bypass fixes the identity to the viewer, so observing a claim as the
// *list owner* is a cross-user Non-Goal).
//
// Self-claim assertions are scoped by item name: seeded viewer claims on OTHER
// items also read "You claimed this", so a bare match would not prove THIS claim
// landed. The on-behalf assertion uses a per-run-unique purchaser name, so it is
// unambiguous on its own.
const LIST = '/lists/dev-list-alice-wedding';
const LIST_HEADING = "Alice's Wedding Registry";

test('SignedInClaim_SelfPurchase_ShowsOwnClaim', async ({ page }) => {
  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_HEADING }).first()
  ).toBeVisible();

  const item = firstClaimableSingleItem(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();

  // Open the purchase modal and take the "I purchased it" self-claim path.
  await item.getByRole('button', { name: 'Claim this item' }).click();
  await page.getByRole('button', { name: 'I purchased it' }).click();
  await page.getByRole('button', { name: 'Confirm Purchase' }).click();

  // The item reflects the viewer's own claim, and it persists across a fresh
  // server render.
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(claimed.getByText('You claimed this').first()).toBeVisible();

  await page.reload();
  const claimedAfter = page.locator('.item-container', { hasText: itemName });
  await expect(claimedAfter.getByText('You claimed this').first()).toBeVisible();
});

test('SignedInClaim_OnBehalfOfOther_ShowsNamedClaim', async ({ page }) => {
  const purchaser = `Buyer${Date.now()}`;

  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_HEADING }).first()
  ).toBeVisible();

  const item = firstClaimableSingleItem(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();

  // Open the purchase modal and take the "Someone else" on-behalf path: it
  // routes through the distinct "Who purchased this item?" step with a
  // purchaser-name field.
  await item.getByRole('button', { name: 'Claim this item' }).click();
  await page.getByRole('button', { name: 'Someone else' }).click();
  await expect(page.getByText('Who purchased this item?')).toBeVisible();
  await page.getByLabel("Purchaser's name").fill(purchaser);
  await page.getByRole('button', { name: 'Confirm Purchase' }).click();

  // The claim is attributed to the NAMED third party, not the viewer, and
  // persists on reload. Scoping to the item also confirms it does NOT read
  // "You claimed this" (the bug this pins would have misattributed it).
  await expect(page.getByText(`Claimed by ${purchaser}`)).toBeVisible();

  await page.reload();
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(claimed.getByText(`Claimed by ${purchaser}`)).toBeVisible();
  await expect(claimed.getByText('You claimed this')).toHaveCount(0);
});
