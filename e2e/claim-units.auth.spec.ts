import { expect, test, type Page } from '@playwright/test';
import { multiUnitEntryWithRoom, openList } from '../test/helpers/e2e/utils';

// Flow: one purchaser takes several units of an entry, then moves the count.
// Capacity is measured in units rather than in people, so a single viewer can
// fill an entry that asks for four — and correct it afterwards without
// unclaiming. Going through the real server read after each write is the point:
// the counter is a cached list read, so a number that moves means the write's
// narrow tag fired.
//
// Uses dev-list-frank-holiday, which no other spec file mutates (one mutated
// list per spec file — the suite shares one seeded DB).
const LIST = '/lists/dev-list-frank-holiday';
const LIST_HEADING = "Frank's Holiday Wishes";

const gotoList = (page: Page) => openList(page, LIST, LIST_HEADING);

test('ListPage_OneClaimerTakesEveryUnitThenLowersIt_CounterFollowsTheUnits', async ({
  page,
}) => {
  await gotoList(page);

  const { card, claimed, quantity } = await multiUnitEntryWithRoom(page, 2);
  const itemName = (await card.locator('.itemName').innerText()).trim();
  const remaining = quantity - claimed;

  // The stepper caps at what is left, so the whole remainder is claimable and
  // nothing beyond it is.
  await card.getByRole('button', { name: 'Add Claim' }).click();
  const units = page.getByRole('spinbutton');
  await expect(units).toHaveValue('1');
  await expect(units).toHaveAttribute('max', String(remaining));

  await units.fill(String(remaining));
  // The CTA states the number the stepper is holding, so it is the readback of
  // what is about to be claimed.
  await page
    .getByRole('button', { name: `Claim ${remaining} of these` })
    .click();

  // Every unit spoken for by one person: the entry reads as claimed rather than
  // still offering room.
  const claimedCard = page.locator('.item-container', { hasText: itemName });
  await expect(claimedCard.getByText('You claimed this').first()).toBeVisible();
  // The recorded claim closes the modal by dropping the query parameter;
  // reloading before that lands would reopen it over the card.
  await expect(page).not.toHaveURL(/purchaseItem/);
  await page.reload();
  const settled = page.locator('.item-container', { hasText: itemName });
  await expect(settled.getByText('You claimed this').first()).toBeVisible();
  await expect(settled.getByRole('button', { name: 'Add Claim' })).toHaveCount(
    0
  );

  // Manage claim moves the count down without destroying the claim.
  await settled.getByRole('button', { name: 'Manage claim' }).click();
  const rowUnits = page.getByRole('spinbutton');
  await expect(rowUnits).toHaveValue(String(remaining));
  await rowUnits.fill('1');
  await page.getByRole('button', { name: 'Update to 1' }).click();
  await expect(page.getByText('Claim updated')).toBeVisible();
  await page.locator('.close-button').click();

  // A fresh server render agrees: the claim survives, one unit of it, and the
  // rest of the entry is open again.
  await page.reload();
  const lowered = page.locator('.item-container', { hasText: itemName });
  await expect(lowered.getByText('You claimed this').first()).toBeVisible();
  await expect(lowered.locator('.item-entry-line')).toHaveText(
    `${claimed + 1}/${quantity} claimed`
  );
});
