import { expect, test } from '@playwright/test';
import { createListWithFirstItem } from '../test/helpers/e2e/utils';

// Flow: the owner sets how many of an item they want on one list, from that
// list's row kebab. Build-own-state: two fresh lists carrying the SAME library
// item, so the second list proves the number is the entry's and not the item's.
// Going through the real server read after the write is the point — the row's
// number is a cached list read, so a quantity that shows means the write's
// narrow tag fired.
test('ListPage_OwnerSetsEntryQuantityViaKebab_RowShowsItOnThatListOnly', async ({
  page,
}) => {
  const stamp = Date.now();
  const itemName = await createListWithFirstItem(page, `E2E Qty A ${stamp}`);
  const listAUrl = page.url();

  // Default: an entry created by adding an item asks for one, and a row asking
  // for one says nothing.
  const rowA = page.locator('.sortable-item', { hasText: itemName });
  await expect(rowA).toBeVisible();
  await expect(rowA.locator('.item-entry-line')).toHaveCount(0);

  await rowA.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Quantity' }).click();
  const modal = page.locator('.modal');
  await expect(
    modal.getByRole('heading', { name: 'How many do you want?' })
  ).toBeVisible();
  const field = modal.getByRole('spinbutton');
  await expect(field).toHaveValue('1');
  // The jump end lands on the ceiling the schema enforces, and stepping down
  // from it proves the row is a control rather than a bare number field.
  await modal.getByRole('button', { name: 'Set to maximum, 99' }).click();
  await expect(field).toHaveValue('99');
  await field.fill('4');
  await modal.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Quantity updated')).toBeVisible();
  await expect(rowA.locator('.item-entry-line')).toHaveText('4 wanted');

  // The same item on a second list carries its own number, untouched.
  const secondName = await createListWithFirstItem(page, `E2E Qty B ${stamp}`);
  expect(secondName).toBe(itemName);
  const rowB = page.locator('.sortable-item', { hasText: itemName });
  await expect(rowB).toBeVisible();
  await expect(rowB.locator('.item-entry-line')).toHaveCount(0);

  // ...and the first list still reads 4 after a fresh navigation.
  await page.goto(listAUrl);
  await expect(
    page
      .locator('.sortable-item', { hasText: itemName })
      .locator('.item-entry-line')
  ).toHaveText('4 wanted');
});
