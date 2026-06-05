import { expect, test } from '@playwright/test';
import { firstClaimableSingleItem } from '../test/helpers/e2e/utils';

// Flow: "guest (logged-out) claims an item on a public list" — REQUIRED.
// Regression pin: an unauthenticated caller must be able to view a public
// ("Shared", visibility = 'public') list by URL and claim an item through the
// modal's guest path. Runs under the guest project, so no session is injected
// (auth() resolves to null) and the resulting purchase is recorded with no
// user. A future change that re-blocks unauthenticated claims on public lists
// fails here.
test('GuestClaim_PublicList_RecordsGuestPurchase', async ({ page }) => {
  // A guest reaches the friend-owned Shared list by URL, no sign-in required.
  await page.goto('/lists/dev-list-grace-birthday');
  await expect(
    page.getByRole('heading', { name: "Grace's Birthday" }).first()
  ).toBeVisible();
  await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible();

  // Open the purchase modal on a claimable item and take the "continue as
  // guest" branch. A per-run-unique name makes the recorded claim
  // unambiguous on reload.
  const guestName = `GuestE2E${Date.now()}`;
  await firstClaimableSingleItem(page)
    .getByRole('button', { name: 'Claim this item' })
    .click();
  await page.getByLabel('Your name').fill(guestName);
  await page.getByRole('button', { name: 'Purchase as Guest' }).click();

  // The single-claim item is now fully claimed and names the guest.
  await expect(page.getByText(`Claimed by ${guestName}`)).toBeVisible();

  // The guest's claim persists across a fresh server render.
  await page.reload();
  await expect(page.getByText(`Claimed by ${guestName}`)).toBeVisible();
});
