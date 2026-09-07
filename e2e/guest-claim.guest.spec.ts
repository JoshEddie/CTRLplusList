import { expect, test } from '@playwright/test';
import { firstClaimableSingleItem } from '../test/helpers/e2e/utils';

// Flow: "guest (logged-out) claims an item on a public list" — REQUIRED.
// Regression pin: an unauthenticated caller must be able to view a public
// ("Shared", visibility = 'public') list by URL and claim an item through the
// modal's guest path. Runs under the guest project, so no session is injected
// (auth() resolves to null) and the resulting purchase is recorded with no
// user. A future change that re-blocks unauthenticated claims on public lists
// fails here.
//
// Also covers `guest-claim-identity` — "Guest sees their own claim as theirs" —
// and `item-actions` — "Cookie-recognized guest gets Manage claim" — from the
// guest side of the manage state: the guest's own row is the only removable
// one, and removing it returns the card to its claimable action set. The
// cookie's own bookkeeping (pruning on removal, keying on purchase ids rather
// than the typed name) is pinned by unit tests, not observable here.
test('GuestClaim_PublicList_RecordsGuestPurchase', async ({ page }) => {
  // A guest reaches the friend-owned Shared list by URL, no sign-in required.
  await page.goto('/lists/dev-list-grace-birthday');
  await expect(
    page.getByRole('heading', { name: "Grace's Birthday" }).first()
  ).toBeVisible();
  await expect(
    page.getByText('Sign In', { exact: true }).first()
  ).toBeVisible();

  // Open the purchase modal on a claimable item and take the "continue as
  // guest" branch. A per-run-unique name makes the recorded claim
  // unambiguous on reload.
  const guestName = `GuestE2E${Date.now()}`;
  const item = firstClaimableSingleItem(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();
  await item.getByRole('button', { name: 'Claim', exact: true }).click();
  await page.getByLabel('Your name').fill(guestName);
  await page.getByRole('button', { name: 'Claim as Guest' }).click();

  // The guest_claims cookie marks the claim as the guest's own: Manage claim,
  // never the bystander's Fully claimed pill.
  const card = page.locator('.item-container', { hasText: itemName });
  await expect(
    card.getByRole('button', { name: 'Manage claim' })
  ).toBeVisible();

  // The guest's claim persists across a fresh server render.
  await page.reload();
  await expect(card.locator('.purchased-banner')).toHaveText('1 / 1 Claimed');
  await expect(
    card.getByRole('button', { name: 'Manage claim' })
  ).toBeVisible();

  // A browser without the guest_claims cookie sees the claim as someone
  // else's — a bare count, since no tier names a claiming party.
  await page.context().clearCookies();
  await page.reload();
  await expect(card.locator('.purchased-banner')).toHaveText('1 / 1 Claimed');
  await expect(card.getByText('Fully claimed')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Manage claim' })
  ).not.toBeVisible();
});

// The removal half of the guest round-trip: a guest who holds a claim opens
// Manage claim, sees their own row labelled "{name} (you)" with the only
// removal action on the item, and removes it. Removing the guest's last claim
// closes the modal and returns the card to Claim; the claim is gone on a
// fresh server render. Runs its own claim (the test above leaves its item
// fully claimed), so the two never contend for the same card.
test('GuestManageClaim_RemoveOwnRow_ReturnsCardToAddClaim', async ({
  page,
}) => {
  await page.goto('/lists/dev-list-grace-birthday');
  await expect(
    page.getByRole('heading', { name: "Grace's Birthday" }).first()
  ).toBeVisible();

  const item = firstClaimableSingleItem(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();
  const guestName = `GuestRemoveE2E${Date.now()}`;
  await item.getByRole('button', { name: 'Claim', exact: true }).click();
  await page.getByLabel('Your name').fill(guestName);
  await page.getByRole('button', { name: 'Claim as Guest' }).click();

  const card = page.locator('.item-container', { hasText: itemName });
  await expect(card.locator('.purchased-banner')).toHaveText('1 / 1 Claimed');
  const manage = card.getByRole('button', { name: 'Manage claim' });
  await expect(manage).toBeVisible();

  // The manage state lists the guest's claim as their own, with removal
  // offered on that row alone.
  await manage.click();
  await expect(page.getByText(`${guestName} (you)`)).toBeVisible();
  const remove = page.getByRole('button', {
    name: 'Remove your claim',
    exact: true,
  });
  await expect(remove).toBeVisible();
  await expect(page.locator('.claim-row')).toHaveCount(1);

  // Removing the guest's only claim closes the modal and returns the card to
  // its claimable action set.
  await remove.click();
  await expect(
    card.getByRole('button', { name: 'Claim', exact: true })
  ).toBeVisible();
  await expect(page.locator('.claim-modal')).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Manage claim' })).toHaveCount(
    0
  );

  // A fresh server render agrees: the claim is gone for the guest and for
  // anyone else — the entry's count is back to nothing spoken for.
  await page.reload();
  const cardAfter = page.locator('.item-container', { hasText: itemName });
  await expect(
    cardAfter.getByRole('button', { name: 'Claim', exact: true })
  ).toBeVisible();
  await expect(cardAfter.locator('.purchased-banner')).toHaveText(
    '0 / 1 Claimed'
  );
});
