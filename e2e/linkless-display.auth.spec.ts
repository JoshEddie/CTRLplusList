import { expect, test, type Locator } from '@playwright/test';

// Display states of the two linkless store shapes (#256/#257), seen by an
// authenticated NON-owner — the perspective that makes the missing store
// actions meaningful (a guest is never offered Buy & Claim at all).
//
// Capabilities and scenarios verified:
//   item-store-links — "PRICED item shows a bare price" (price line renders as
//     `$X.XX` with no `· {store name}`; BARE renders no price line at all).
//   item-actions — "Priced-but-linkless item never offers Buy & Claim" (both
//     Buy & Claim ↗ and View item ↗ key on a navigable link, so a linkless
//     card falls to Add Claim alone).
//
// Read-only: no claim is recorded and no item is edited, so sharing
// dev-list-alice-wedding with signed-in-claim.auth.spec (which mutates it) is
// safe — the seeded linkless extras sit at the end of the list and are excluded
// from the seed's purchase fan-out, so they are never the "first claimable"
// card those specs claim.
const LIST = '/lists/dev-list-alice-wedding';
const LIST_HEADING = "Alice's Wedding Registry";

// The seeded linkless extras (LOCALDEV.md § non-link states).
const PRICED_ITEM = 'Spa day gift card';
const BARE_ITEM = 'A homemade dinner for two';

const BUY_CLAIM = 'Buy & Claim — opens in new tab';
const VIEW_ITEM = 'View item — opens in new tab';

// "Add Claim SHALL render full width": purchase.css spans a lone action across
// the whole action grid, and only demotes it to a half-width `grid-column: 2`
// when it shares the two-up row with View item. The variant is no signal —
// ItemActions renders Add Claim `primary` in every state, two-up included.
async function expectFullWidth(action: Locator) {
  await expect(action).toBeVisible();
  await expect(action).toHaveCSS('grid-column-end', '-1');
}

test('PricedItem_NonOwnerViewsCard_ShowsBarePriceAndAddClaimOnly', async ({
  page,
}) => {
  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_HEADING }).first()
  ).toBeVisible();

  const card = page.locator('.item-container', { hasText: PRICED_ITEM });
  // The price line renders the seeded $50.00 with no trailing store name —
  // a PRICED store has a price and nothing else.
  await expect(card.getByText('$50.00')).toBeVisible();
  await expect(card.locator('.item-store-metadata')).toHaveCount(0);

  // No navigable link, so the store-going actions are both absent and the
  // claim action stands alone across the full width.
  await expectFullWidth(card.getByRole('button', { name: 'Add Claim' }));
  await expect(card.getByRole('link', { name: BUY_CLAIM })).toHaveCount(0);
  await expect(card.getByRole('link', { name: VIEW_ITEM })).toHaveCount(0);
});

test('BareItem_NonOwnerViewsCard_ShowsNoPriceLineAndAddClaimOnly', async ({
  page,
}) => {
  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_HEADING }).first()
  ).toBeVisible();

  const card = page.locator('.item-container', { hasText: BARE_ITEM });
  await expectFullWidth(card.getByRole('button', { name: 'Add Claim' }));

  // No valid store at all: no price line, and neither store-going action.
  await expect(card.locator('.item-price-row')).toHaveCount(0);
  await expect(card.getByRole('link', { name: BUY_CLAIM })).toHaveCount(0);
  await expect(card.getByRole('link', { name: VIEW_ITEM })).toHaveCount(0);
});
