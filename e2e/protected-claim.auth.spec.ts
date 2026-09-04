import { expect, test } from '@playwright/test';

import { raiseSpoilerTier } from './helpers/spoilers';

// Critical flow 14.2: a fully protected member claims and master-unclaims
// through the reveal confirmation.
//
// `dev-test-viewer` is seeded at the fully protected baseline on their own
// self-profile, so `dev-list-viewer-birthday` discloses no claim. The claim
// affordances are ungoverned by that state — the confirmation, not their
// absence, is what stands between the member and an unasked-for reveal — so
// the whole arc runs without changing any setting the membership stores.
//
// owner-spoiler.auth.spec reads this list too but asserts only on the untouched
// "Grandma" guest claim; the master-unclaim here targets the seeded attributed
// claim ("Bob — added by Alice" on `dev-list-viewer-birthday-item-1`), so the
// two never contend for the same row.
const OWN_LIST = '/lists/dev-list-viewer-birthday';

test('ProtectedList_SurpriseBaseline_DisclosesNoClaimButStillOffersAddClaim', async ({
  page,
}) => {
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  // No passive surface names a claim, and no action label states another
  // party's. The seed gives the owner one claim of their own
  // (`dev-purchase-owner-self`), which is disclosed at every level — so
  // exactly one card offers management, and it is that one. Every other
  // claimed item is indistinguishable from an unclaimed one.
  await expect(page.getByText('Spoilers:')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Manage claims', exact: true })
  ).toHaveCount(1);
  await expect(page.getByText('Fully claimed')).toHaveCount(0);

  // The affordance renders anyway: recording a purchase never requires
  // leaving the page to flip a setting first.
  await expect(
    page.getByRole('button', { name: 'Add Claim', exact: true }).first()
  ).toBeVisible();
});

test('ProtectedList_DeclineTheConfirmation_DisclosesNothing', async ({
  page,
}) => {
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  await page
    .getByRole('button', { name: 'Add Claim', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'This could spoil a surprise' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'This could spoil a surprise' })
  ).toHaveCount(0);
  await expect(page.getByText('Spoilers:')).toHaveCount(0);
});

test('ProtectedList_ConfirmThenSelfClaim_PersistsTheOwnersOwnClaim', async ({
  page,
}) => {
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  const item = page
    .locator('.item-container')
    .filter({
      has: page.getByRole('button', { name: 'Add Claim', exact: true }),
    })
    .first();
  const itemName = (await item.locator('.itemName').innerText()).trim();

  await item.getByRole('button', { name: 'Add Claim', exact: true }).click();
  await page.getByRole('button', { name: 'Show me', exact: true }).click();

  // The disclosure lands before the act: the CTA renders optimistically while
  // the on-demand summary is in flight, and clicking through it would send the
  // member into a claim the capacity may already refuse.
  await expect(page.locator('.claim-reveal-summary')).toBeVisible();

  // exact: the dnd-kit sortable wrapper is also a role=button whose
  // accessible name swallows the modal's text on the owner's sortable grid.
  await page
    .getByRole('button', { name: 'I bought this myself', exact: true })
    .click();
  await expect(page.getByText('Claim added successfully')).toBeVisible();

  // Asserted after a reload rather than on the closing navigation: closing the
  // modal is a `router.replace` back to a URL the client router already holds,
  // so the card there is the pre-claim payload until a fresh server render.
  //
  // The claim is the viewer's own, so it is disclosed at every level — no
  // setting was changed to make it visible.
  await page.reload();
  const claimed = page.locator('.item-container', { hasText: itemName });
  await expect(
    claimed.getByRole('button', { name: 'Manage claims', exact: true }).first()
  ).toBeVisible();
});

test('ProtectedList_ConfirmTheReveal_DisclosesTheBadgeStateAndNamesNobody', async ({
  page,
}) => {
  // The item the seed gives an attributed claim (Alice marked Bob). At this
  // level nothing on its card names it, so the reveal is the only route to its
  // state — and what it discloses is the count and the capacity, never a name.
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  await page
    .getByRole('button', { name: 'Add Claim', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Show me', exact: true }).click();

  await expect(page.locator('.claim-reveal-summary')).toBeVisible();
  // Unrevealed, the list renders only the rows that carry a name, and every
  // one of those is the viewer's own; no other party is named or attributed.
  await expect(page.locator('.claim-modal')).not.toContainText('Added by');
  for (const name of await page
    .locator('.claim-modal .claim-row-name')
    .allTextContents()) {
    expect(name).toMatch(/\(you\)$|^You$/);
  }
});

test('ProtectedList_MasterUnclaimsAnothersClaim_RemovesItAfterReload', async ({
  page,
}) => {
  // Master unclaim reaches a party the viewer is not: the row must be in the
  // payload to be removed, and the fully protected baseline strips it. Raising
  // the transient tier is what discloses it — a URL delta, not a stored
  // setting — after which the owner manages the seeded attributed claim
  // directly (no reveal confirmation once the tier already grants `claims`).
  await page.goto(OWN_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  await raiseSpoilerTier(page, "Show what's claimed");
  await expect(page).toHaveURL(/spoiler=claims/);

  // No tier names the claiming parties, so the card carries only a count and
  // the owner's manage-claims reveal is what turns it into rows. Confirming it
  // is what puts a master-unclaim control on another party's claim.
  const card = page
    .locator('.item-container', { hasText: 'claimed' })
    .filter({ has: page.getByRole('button', { name: 'Manage claims' }) })
    .first();
  await card.getByRole('button', { name: 'Manage claims' }).click();
  await page.getByRole('button', { name: 'Show me', exact: true }).click();

  const modal = page.locator('.claim-modal');
  await expect(modal).toContainText('Added by Alice');
  await modal.getByRole('button', { name: /^Remove .*'s claim$/ }).click();
  await expect(page.getByText('Claim removed successfully')).toBeVisible();

  // The removal survives a fresh server render. The modal is carried by the
  // URL, so the reload lands back in it already revealed — a deep link is the
  // same confirmed act — and it no longer names Alice as anyone's recorder.
  await page.reload();
  await expect(modal).toBeVisible();
  await expect(modal).not.toContainText('Added by Alice');
});
