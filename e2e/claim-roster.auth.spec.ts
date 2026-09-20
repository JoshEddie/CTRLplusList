import { expect, test, type Page } from '@playwright/test';

import { pinActingProfile } from './helpers/activeProfile';

// Critical flow: the claim banner opens to a roster naming each claim.
//
// `dev-profile-owned` is the one seat carrying a raised baseline — the viewer
// holds `owner` on it at `claims` — so acting as their own self-profile they
// read `dev-list-owned-wishlist` as a member the tier discloses everything to,
// with no per-page control touched. The owner arc at the end is the same
// account switched onto the owning profile through the application's own
// selection cookie.
//
// The list's three seeded claims are one of each shape the roster renders
// differently: Alice's own (item 1), the viewer's own (item 2), and Bob's,
// recorded by Alice (item 3). Every test here is read-only — nothing claims,
// removes or moves units — so the fixture `profile-switch.auth.spec` and
// `member-baseline.auth.spec` read is left exactly as it was found.
const LIST = '/lists/dev-list-owned-wishlist';
const OWNED_PROFILE = 'dev-profile-owned';

const roster = (page: Page) => page.locator('.claim-modal');

// The seed derives item names from a hash of the list id, so no spec can name
// item 1 up front. The sheet is URL-carried, so deep-linking the id the seed
// DOES fix opens the same view the banner pushes — and its header states the
// name the card is then found by.
async function openRosterById(page: Page, itemId: string): Promise<string> {
  await page.goto(`${LIST}?purchaseItem=${itemId}&purchaseView=roster`);
  const heading = roster(page).getByRole('heading');
  await expect(heading).toBeVisible();
  return (await heading.innerText()).trim();
}

async function cardNamed(page: Page, itemName: string) {
  const card = page.locator('.item-container', { hasText: itemName });
  // One card or the assertions below are about an arbitrary one of several.
  await expect(card).toHaveCount(1);
  return card;
}

test('ClaimRoster_MemberTapsTheBanner_OpensASheetNamingTheClaimer', async ({
  page,
}) => {
  const itemName = await openRosterById(
    page,
    'dev-list-owned-wishlist-item-1'
  );
  await expect(roster(page)).toContainText('Alice Example');

  // Back on the card itself: at `claims` with a claim to show, the banner is a
  // real button that announces the dialog rather than the inert readout it is
  // everywhere else.
  await page.goto(LIST);
  const card = await cardNamed(page, itemName);
  const banner = card.locator('button.purchased-banner');
  await expect(banner).toHaveAttribute('aria-haspopup', 'dialog');

  await banner.click();
  await expect(page).toHaveURL(/purchaseView=roster/);
  await expect(roster(page)).toContainText('Alice Example');

  // Closing it drops the parameters and leaves the card as it was.
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page).not.toHaveURL(/purchaseItem/);
  await expect(banner).toBeVisible();
});

test('ClaimRoster_MemberOpensAProxyRecordedClaim_SheetSaysWhoAddedIt', async ({
  page,
}) => {
  await openRosterById(page, 'dev-list-owned-wishlist-item-3');
  await expect(roster(page)).toContainText('Bob Example');
  await expect(roster(page)).toContainText('Added by Alice');
});

test('ClaimRoster_Member_ActsOnTheirOwnRowAndReadsEveryOther', async ({
  page,
}) => {
  // Their own claim: the row says so and carries the removal, which compares
  // the self-profile and takes no owner floor.
  await openRosterById(page, 'dev-list-owned-wishlist-item-2');
  await expect(roster(page)).toContainText('Test Viewer (you)');
  await expect(
    roster(page).getByRole('button', { name: 'Remove your claim', exact: true })
  ).toBeEnabled();

  // Another party's, read whole and offered nothing: the tier disclosed the
  // claim, which is not a right to remove it.
  await openRosterById(page, 'dev-list-owned-wishlist-item-1');
  await expect(roster(page)).toContainText('Alice Example');
  await expect(roster(page).locator('.claim-row')).toHaveCount(1);
  await expect(
    roster(page).getByRole('button', { name: /^Remove/ })
  ).toHaveCount(0);
});

test('ClaimRoster_SwitchedToTheOwningProfile_EveryRowCarriesRemove', async ({
  context,
  page,
  baseURL,
}) => {
  // Master unclaim from the banner: the same sheet, opened by the profile that
  // owns the entry, puts a removal on a row it did not make — and asks nothing
  // first, because the tier the account already holds is the whole consent.
  await pinActingProfile(context, OWNED_PROFILE, baseURL as string);

  // All three seeded shapes, the viewer's own included — master unclaim reaches
  // every row, so a matcher that only caught the possessive label would miss
  // the one row whose button reads "Remove your claim".
  for (const itemId of [
    'dev-list-owned-wishlist-item-1',
    'dev-list-owned-wishlist-item-2',
    'dev-list-owned-wishlist-item-3',
  ]) {
    await openRosterById(page, itemId);
    await expect(
      page.getByRole('heading', { name: 'This could spoil a surprise' })
    ).toHaveCount(0);
    const rows = await roster(page).locator('.claim-row').count();
    await expect(
      roster(page).getByRole('button', { name: /^Remove / })
    ).toHaveCount(rows);
    await expect(
      roster(page).getByRole('button', { name: /^Remove / }).first()
    ).toBeEnabled();
  }
});
