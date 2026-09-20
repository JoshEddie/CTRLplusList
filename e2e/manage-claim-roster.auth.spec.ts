import { expect, test, type Page } from '@playwright/test';

// Issue #410: Manage claim's other-claims count opens the same sheet onto the
// full roster, and URL-carried view survives a reload and a back gesture.
// dev-list-owned-wishlist-item-1 is seeded quantity 3 with one unit already
// held by Alice, so the viewer claiming it leaves room and produces exactly
// the "own row + 1 other claim" shape the issue describes. The claim made
// here is removed at the end so claim-roster.auth.spec and
// profile-switch.auth.spec still see Alice's lone seeded claim on item 1.
const LIST = '/lists/dev-list-owned-wishlist';
const ITEM_ID = 'dev-list-owned-wishlist-item-1';

const sheet = (page: Page) => page.locator('.claim-modal');

// The seed derives item names from a hash of the list id, so no spec can name
// item 1 up front (same trick as claim-roster.auth.spec's openRosterById).
async function nameOfSeededItem(page: Page, itemId: string): Promise<string> {
  await page.goto(`${LIST}?purchaseItem=${itemId}&purchaseView=roster`);
  const heading = sheet(page).getByRole('heading');
  await expect(heading).toBeVisible();
  return (await heading.innerText()).trim();
}

test('ManageClaim_OpensOtherClaimRoster_ReloadAndBackKeepTheRightView', async ({
  page,
}) => {
  const itemName = await nameOfSeededItem(page, ITEM_ID);
  await page.goto(LIST);
  const card = page.locator('.item-container', { hasText: itemName });

  try {
    await card.getByRole('button', { name: 'Claim', exact: true }).click();
    await page.getByRole('button', { name: 'Claim this gift' }).click();
    await expect(
      card.getByRole('button', { name: 'Manage claim' })
    ).toBeVisible();

    await card.getByRole('button', { name: 'Manage claim' }).click();
    await expect(page).toHaveURL(/purchaseItem=/);
    await expect(page).not.toHaveURL(/purchaseView/);
    await expect(sheet(page)).toContainText('Test Viewer (you)');
    await expect(
      sheet(page).getByRole('button', {
        name: 'Remove your claim',
        exact: true,
      })
    ).toBeVisible();

    const otherCount = sheet(page).getByRole('button', {
      name: '1 other claim',
    });
    await expect(otherCount).toBeVisible();
    await otherCount.click();
    await expect(page).toHaveURL(/purchaseView=roster/);
    await expect(sheet(page)).toContainText('Alice Example');

    await page.reload();
    await expect(page).toHaveURL(/purchaseView=roster/);
    await expect(sheet(page)).toContainText('Alice Example');

    await page.goBack();
    await expect(page).toHaveURL(/purchaseItem=/);
    await expect(page).not.toHaveURL(/purchaseView/);
    await expect(sheet(page)).toContainText('Test Viewer (you)');
  } finally {
    await page.goto(`${LIST}?purchaseItem=${ITEM_ID}`);
    const removeOwn = page.getByRole('button', {
      name: 'Remove your claim',
      exact: true,
    });
    if (await removeOwn.isVisible().catch(() => false)) {
      await removeOwn.click();
      await expect(removeOwn).toHaveCount(0);
    }
  }
});
