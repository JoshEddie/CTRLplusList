import { expect, test, type Page } from '@playwright/test';

// Consolidated e2e coverage for the #234/#235/#260 surface (deferred from the
// buy-and-claim-authed change): the ItemActions matrix spot-check, Buy & Claim's
// undo popup (kept and undo paths), and the affordance-routed purchase modal
// (Add Claim → claim flow while the viewer already holds a claim; Manage claim
// → per-claim removal list). Uses dev-list-bob-holiday, which no other spec
// file mutates (one mutated list per spec file — the suite shares one seeded DB).
const LIST = '/lists/dev-list-bob-holiday';
const LIST_HEADING = "Bob's Holiday List";

const BUY_CLAIM = 'Buy & Claim — opens in new tab';
const VIEW_ITEM = 'View item — opens in new tab';

async function gotoList(page: Page) {
  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: LIST_HEADING }).first()
  ).toBeVisible();
}

// A multi-unit entry the viewer has not claimed and which has room for the TWO
// claims this spec records — the slots-remain state Add Claim routes. Capacity
// is per entry and enforced, so "has a counter" is no longer enough: a card one
// unit short would pass the first claim and then lose its Add Claim. Reading
// the remainder off the counter states the requirement instead of trusting a
// seeded position, and throws rather than timing out if the seed stops meeting
// it.
async function multiUnitWithRoomForTwo(page: Page) {
  const candidates = page
    .locator('.item-container')
    .filter({ has: page.getByRole('button', { name: 'Add Claim' }) })
    .filter({ has: page.locator('.claim-counter') })
    .filter({ hasNotText: 'You claimed this' });
  for (const card of await candidates.all()) {
    const counter = await card.locator('.claim-counter').innerText();
    const parsed = /(\d+)\/(\d+) claimed/.exec(counter);
    if (parsed && Number(parsed[2]) - Number(parsed[1]) >= 2) return card;
  }
  throw new Error('No multi-unit entry on the seeded list has two units free');
}

// A claimable linked item without a viewer claim — the Buy & Claim state.
function buyClaimable(page: Page) {
  return page
    .locator('.item-container')
    .filter({ has: page.getByRole('link', { name: BUY_CLAIM }) })
    .first();
}

// Runs first: it claims the multi-quantity item and leaves the viewer's
// self-claim on it, so the Buy & Claim tests below (which need cards WITHOUT a
// viewer claim) still find seeded single-claim linked items untouched.
test('AddClaimWhileClaimed_RoutesToClaimFlow_ManageListRemovesPerClaim', async ({
  page,
}) => {
  await gotoList(page);

  const item = await multiUnitWithRoomForTwo(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();

  // First claim: the ordinary one-tap self-claim.
  await item.getByRole('button', { name: 'Add Claim' }).click();
  await page.getByRole('button', { name: 'Claim this gift' }).click();
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(claimed.getByText('You claimed this').first()).toBeVisible();

  // Slots remain, so the card offers Manage claim (top) AND Add Claim (2-up).
  await expect(
    claimed.getByRole('button', { name: 'Manage claim' })
  ).toBeVisible();
  const addAgain = claimed.getByRole('button', { name: 'Add Claim' });
  await expect(addAgain).toBeVisible();

  // Add Claim opens the CLAIM FLOW (not the manage state), carried by the
  // purchaseView=claim param. The viewer is already the recorded purchaser, so
  // the self-claim CTA is suppressed; the disclosure is the live path.
  await addAgain.click();
  await expect(page).toHaveURL(/purchaseView=claim/);
  const disclosure = page.getByRole('button', {
    name: /Claiming for someone else\?/,
  });
  await expect(disclosure).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Claim this gift' })
  ).toHaveCount(0);

  // Record an additional claim for a named non-user via the guest fallback.
  const purchaser = `LifecycleE2E${Date.now()}`;
  await disclosure.click();
  await page.getByLabel('Someone not listed?').fill(purchaser);
  await page
    .getByRole('button', { name: `Confirm — ${purchaser}`, exact: true })
    .click();

  // The card banner enumerates both viewer-removable claims.
  await expect(
    claimed.getByText(`You claimed this, and for ${purchaser}`).first()
  ).toBeVisible();

  // Manage claim lists the viewer's own claims as rows carrying removal
  // actions; no tier names another claimant, so theirs are a bare count.
  // Removing the additional claim keeps the self-claim (and the modal) intact.
  await claimed.getByRole('button', { name: 'Manage claim' }).click();
  await expect(page).not.toHaveURL(/purchaseView=claim/);
  await expect(page.getByText('Test Viewer (you)')).toBeVisible();
  await expect(page.locator('.claims-withheld')).toBeVisible();
  await page
    .getByRole('button', { name: `Remove ${purchaser}'s claim`, exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: `Remove ${purchaser}'s claim` })
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Remove your claim', exact: true })
  ).toBeVisible();
  await page.locator('.close-button').click();

  // A fresh server render agrees: self-claim kept, additional claim gone.
  await page.reload();
  const claimedAfter = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimedAfter.getByText('You claimed this').first()
  ).toBeVisible();
  await expect(page.getByText(`for ${purchaser}`)).toHaveCount(0);
});

test('BuyClaim_MatrixSpotCheck_KeptPathPersistsClaim', async ({
  page,
  context,
}) => {
  await gotoList(page);

  // Matrix spot-check (authenticated claimable linked item): Buy & Claim ↗ is
  // the primary top slot with View item ↗ · Add Claim below it.
  const item = buyClaimable(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();
  const buy = item.getByRole('link', { name: BUY_CLAIM });
  await expect(buy).toHaveClass(/primary/);
  await expect(item.getByRole('link', { name: VIEW_ITEM })).toBeVisible();
  await expect(item.getByRole('button', { name: 'Add Claim' })).toBeVisible();

  // Activating Buy & Claim opens the store in a NEW tab (real anchor) while
  // the wishlist tab records the claim and surfaces the undo popup.
  const [storeTab] = await Promise.all([
    context.waitForEvent('page'),
    buy.click(),
  ]);
  await storeTab.close();
  await expect(
    page.getByRole('heading', { name: "You've claimed this" })
  ).toBeVisible();

  // Kept path: the claim stays, the card flips to Manage claim, and the claim
  // survives a fresh server render.
  await page.getByRole('button', { name: 'Yes, I purchased it' }).click();
  await expect(
    page.getByRole('heading', { name: "You've claimed this" })
  ).toHaveCount(0);
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimed.getByRole('button', { name: 'Manage claim' })
  ).toBeVisible();
  await expect(claimed.getByText('You claimed this').first()).toBeVisible();

  await page.reload();
  const claimedAfter = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimedAfter.getByText('You claimed this').first()
  ).toBeVisible();
});

test('BuyClaim_UndoPath_ReleasesClaim', async ({ page, context }) => {
  await gotoList(page);

  const item = buyClaimable(page);
  const itemName = (await item.locator('.itemName').innerText()).trim();
  const [storeTab] = await Promise.all([
    context.waitForEvent('page'),
    item.getByRole('link', { name: BUY_CLAIM }).click(),
  ]);
  await storeTab.close();
  await expect(
    page.getByRole('heading', { name: "You've claimed this" })
  ).toBeVisible();

  // Undo path: the just-recorded claim is released and the item returns to
  // its claimable action set.
  await page.getByRole('button', { name: 'No — undo claim' }).click();
  const card = page.locator('.item-container', { hasText: itemName });
  await expect(card.getByText('You claimed this')).toHaveCount(0);
  await expect(card.getByRole('link', { name: BUY_CLAIM })).toBeVisible();
});
