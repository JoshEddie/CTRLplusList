import { expect, test } from '@playwright/test';
import { firstClaimableSingleItem } from '../test/helpers/e2e/utils';

// Flow 10: an attributed claim round-trips through the picker. The seeded
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
  await item.getByRole('button', { name: 'Get this gift' }).click();
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

// Flow 11: owner claiming and master unclaim live entirely inside the spoiler
// view of the owner's own list (dev-list-viewer-birthday; the bypass session
// IS the owner here). owner-spoiler.auth.spec reads this list in parallel but
// only asserts on the untouched "Grandma" claim.
const OWN_LIST = '/lists/dev-list-viewer-birthday';

test('OwnerList_SpoilersOff_ShowsNoClaimOrUnclaimAffordances', async ({
  page,
}) => {
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Mark as claimed' })
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Remove .*claim/ })).toHaveCount(
    0
  );
  await expect(page.getByText('Spoilers:')).toHaveCount(0);
});

test('OwnerList_SpoilersOnSelfClaim_ShowsYouRowInSpoilerBanner', async ({
  page,
}) => {
  await page.goto(`${OWN_LIST}?spoilers=1`);
  await expect(page.locator('.item-container').first()).toBeVisible();

  // Claim affordances render only on items with remaining quantity; the modal
  // is the same one viewers get, with the owner copy variant.
  const item = page
    .locator('.item-container')
    .filter({ has: page.getByRole('button', { name: 'Mark as claimed' }) })
    .first();
  const itemName = (await item.locator('.itemName').innerText()).trim();
  await item.getByRole('button', { name: 'Mark as claimed' }).click();
  // exact: the dnd-kit sortable wrapper is also a role=button whose
  // accessible name swallows the modal's text on the owner's sortable grid.
  await page
    .getByRole('button', { name: 'I bought this myself', exact: true })
    .click();

  // The owner's own claim appears as a "You" row in the spoiler banner and
  // persists across a fresh server render.
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimed.locator('.spoiler-claim-row', { hasText: 'You' }).first()
  ).toBeVisible();

  await page.reload();
  const claimedAfter = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimedAfter.locator('.spoiler-claim-row', { hasText: 'You' }).first()
  ).toBeVisible();
});

test('OwnerList_SpoilersOnMasterUnclaim_RemovesSeededAttributedClaim', async ({
  page,
}) => {
  await page.goto(`${OWN_LIST}?spoilers=1`);

  // The seeded attributed claim (Alice marked Bob) renders with the claimer
  // identified in the spoiler banner; once any claim exists the card affordance
  // is "Manage claims", and master unclaim is dispatched from the modal's
  // claims list — the owner did not create the claim but can remove it.
  const item = page.locator('.item-container', {
    hasText: 'Bob — added by Alice',
  });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Manage claims' }).click();
  // exact: the dnd-kit sortable wrapper is also a role=button whose accessible
  // name swallows the modal's text on the owner's sortable grid.
  await page
    .getByRole('button', { name: "Remove Bob's claim", exact: true })
    .click();
  await expect(
    page.locator('.spoiler-claim-row', { hasText: 'Bob — added by Alice' })
  ).toHaveCount(0);

  // Gone for real, not just optimistically: a fresh server render agrees.
  await page.locator('.close-button').click();
  await page.reload();
  await expect(page.locator('.item-container').first()).toBeVisible();
  await expect(
    page.locator('.spoiler-claim-row', { hasText: 'Bob — added by Alice' })
  ).toHaveCount(0);
});
