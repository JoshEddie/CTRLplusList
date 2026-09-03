import { expect, test, type Locator, type Page } from '@playwright/test';

import { pinActingProfile } from './helpers/activeProfile';

// Soft removal: taking a CLAIMED item off a list keeps the entry alive for the
// people holding claims, and the owner's own view of that ghost is gated by
// their spoiler tier (ADR-0015).
//
// The seat is `dev-profile-owned`, the one profile the viewer owns whose
// membership sits at `claims`. Its list carries one claim of each shape the
// tiers render differently, and this flow needs three rows off it: a claim by
// Alice, which the viewer does not hold; one of the viewer's own; and an
// unclaimed item, which is what the parity assertion measures the other two
// against.
//
// RESIDUE (contained): restoring lands an entry at the END of the list, so the
// order of `dev-list-owned-wishlist` changes. Nothing asserts that order — the
// specs reading this seat name the list, never its items — and every run
// reseeds from scratch (`scripts/test-e2e.sh`). No claim, quantity, or
// membership is lost: a restore rewrites neither.
const ACTING_AS = 'dev-profile-owned';
const OWNED_LIST = '/lists/dev-list-owned-wishlist';
const OWNER_GHOST_NOTE = 'Removed — kept because it carries claims';

test.beforeEach(async ({ context, baseURL }) => {
  await pinActingProfile(context, ACTING_AS, baseURL as string);
});

// The owner's own view of a claimed row: `purchased` is the spoiler treatment
// their tier grants, `has-my-claim` marks the ones they hold. The three
// selectors together name a claim the viewer holds, one they do not, and a row
// carrying none — without the spec hard-coding which seeded item is which.
const claimedByAnother = (page: Page) =>
  page.locator('.item-container.purchased:not(.has-my-claim)').first();
const claimedByViewer = (page: Page) =>
  page.locator('.item-container.purchased.has-my-claim').first();
const unclaimed = (page: Page) =>
  page.locator('.item-container:not(.purchased)').first();

const nameOf = async (card: Locator) =>
  (await card.locator('.itemName').innerText()).trim();

const rowNamed = (page: Page, name: string) =>
  page
    .locator('.sortable-item')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });

async function removeFromList(page: Page, name: string) {
  const row = rowNamed(page, name);
  await row.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Remove from list' }).click();
  await page
    .locator('.confirm-dialog-content')
    .getByRole('button', { name: 'Remove' })
    .click();
  await expect(page.getByText('Removed from list')).toBeVisible();
}

async function putBackOnList(page: Page, names: string[]) {
  await page.goto(`${OWNED_LIST}/choose-items`);
  for (const name of names) {
    await page
      .locator('ul.choose-items-list li')
      .filter({ has: page.getByRole('heading', { name, exact: true }) })
      .getByRole('checkbox')
      .check();
  }
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(new RegExp(`${OWNED_LIST}$`));
  // The rows are what the next assertion reads, and a URL match is not their
  // settle signal: wait for one of them before touching the DOM.
  await expect(rowNamed(page, names[0])).toHaveCount(1);
}

test('OwnedList_OwnerRemovesTwoClaimedItems_GhostsSurviveAndRestoreAtTheEnd', async ({
  page,
}) => {
  await page.goto(OWNED_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  const theirs = await nameOf(claimedByAnother(page));
  const mine = await nameOf(claimedByViewer(page));

  await removeFromList(page, theirs);
  await removeFromList(page, mine);

  // Both survive, both say why, and neither takes a new claim: the owner has
  // dropped the item, so the affordance that would create one is withdrawn.
  await page.reload();
  for (const name of [theirs, mine]) {
    const row = rowNamed(page, name);
    await expect(row.getByText(OWNER_GHOST_NOTE)).toBeVisible();
    await expect(
      row.getByRole('button', { name: 'Add Claim', exact: true })
    ).toHaveCount(0);
  }

  // Restoring lands them at the END of the list — no position survives a
  // removal — and the ghost note goes with the removal it explained. Which of
  // the two lands first is the picker's order, not this spec's business.
  await putBackOnList(page, [theirs, mine]);
  await expect(page.getByText(OWNER_GHOST_NOTE)).toHaveCount(0);
  const order = await page.locator('.sortable-item .itemName').allInnerTexts();
  expect(
    order
      .slice(-2)
      .map((n) => n.trim())
      .sort()
  ).toEqual([theirs, mine].sort());
});

test('OwnedList_OwnerDropsToTheProtectedTier_ClaimedRemovalLooksLikeAnUnclaimedOne', async ({
  page,
}) => {
  await page.goto(OWNED_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  const theirs = await nameOf(claimedByAnother(page));
  const mine = await nameOf(claimedByViewer(page));
  const bare = await nameOf(unclaimed(page));

  // The unclaimed row is the control: its removal is a hard delete, and what
  // the protected owner must see of Alice's claimed one is exactly this.
  await removeFromList(page, bare);
  await removeFromList(page, theirs);
  await removeFromList(page, mine);

  // The protected tier, as a delta on the URL rather than a stored setting.
  await page.goto(`${OWNED_LIST}?spoiler=surprise`);

  // The settle signal. Both absences below are gated on the items read
  // resolving, and the surviving ghost is the one element that same read
  // produces — so it is what separates "withheld" from "not rendered yet". It
  // survives because the viewer holds its claim, which no tier withholds from
  // them.
  await expect(rowNamed(page, mine).getByText(OWNER_GHOST_NOTE)).toBeVisible();
  await expect(rowNamed(page, theirs)).toHaveCount(0);
  await expect(rowNamed(page, bare)).toHaveCount(0);

  await putBackOnList(page, [bare, theirs, mine]);
});
