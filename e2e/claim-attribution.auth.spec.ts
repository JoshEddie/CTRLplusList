import { expect, test } from '@playwright/test';
import { firstClaimableSingleItem } from '../test/helpers/e2e/utils';

// Critical flow 10: an attributed claim round-trips through the picker. The
// owner-side claim and master-unclaim arc that used to share this file moved to
// protected-claim.auth.spec, whose flow is the reveal confirmation rather than
// a spoiler-enabled view.
//
// Flow 10: The seeded
// viewer marks Bob — a seeded mutual of Alice (alice ↔ bob in the seed's
// follow graph) — as the purchaser of an item on Alice's list. Uses
// dev-list-alice-baby, NOT dev-list-alice-wedding, so it never races
// signed-in-claim.auth.spec (parallel workers share the seeded DB; one
// mutated list per spec file).
test('AttributedClaim_PickMutualFromPicker_PersistsBobAsPurchaser', async ({
  page,
}) => {
  await page.goto('/lists/dev-list-alice-baby');
  await expect(
    page.getByRole('heading', { name: 'Baby On The Way' }).first()
  ).toBeVisible();

  const item = firstClaimableSingleItem(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();

  // Open the purchase modal and expand the collapsed disclosure; the picker
  // lists Alice's mutuals. Search narrows the live pool; tapping a row
  // selects it and Confirm records the claim — expand-inline, no second screen.
  await item.getByRole('button', { name: 'Add Claim' }).click();
  await page
    .getByRole('button', { name: /Claiming for someone else\?/ })
    .click();
  await page.getByLabel("Search Alice's circle").fill('Bob');
  await page.getByRole('button', { name: 'Bob Example' }).click();
  await page
    .getByRole('button', { name: 'Confirm — Bob Example', exact: true })
    .click();

  // The viewer asserted the claim for Bob; the banner names the attributed
  // user (linked-account first name, not a typed guest label) and the
  // attribution survives a fresh server render.
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimed.getByText('You claimed this for Bob').first()
  ).toBeVisible();

  await page.reload();
  const claimedAfter = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimedAfter.getByText('You claimed this for Bob').first()
  ).toBeVisible();
});
