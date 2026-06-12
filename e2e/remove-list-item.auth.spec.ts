import { expect, test } from '@playwright/test';

// Flow: owner removes an item from a list straight from the item card's kebab
// menu (the single-item shortcut to the choose-items bulk flow). Build-own-
// state: create a list, attach one library item, remove it via kebab →
// ConfirmDialog, then prove the unlink touched only the association — the
// list shows its empty-state CTA while the item still exists in /items.
test('ListPage_OwnerRemovesItemViaKebab_ItemOffListButInLibrary', async ({
  page,
}) => {
  const listName = `E2E Remove ${Date.now()}`;

  await page.goto('/lists');
  await page.getByRole('button', { name: 'New List' }).first().click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(listName);
  await page.getByRole('textbox', { name: 'Date', exact: true }).fill('2030-06-01');
  await page.getByRole('button', { name: 'Create List' }).click();

  await expect(page).toHaveURL(/\/lists\/[^/]+\/choose-items\?new=1$/);
  const listId = page.url().match(/\/lists\/([^/]+)\/choose-items/)?.[1];
  expect(listId).toBeTruthy();

  const chosenRow = page.locator('ul.choose-items-list li').first();
  await chosenRow.getByRole('checkbox').check();
  const chosenItemName = (await chosenRow.locator('.itemName').innerText()).trim();
  await page.getByRole('button', { name: /Add 1 item to list/ }).click();

  await expect(page).toHaveURL(new RegExp(`/lists/${listId}$`));
  const listRow = page.locator('.sortable-item', { hasText: chosenItemName });
  await expect(listRow).toBeVisible();

  // Remove — kebab → danger entry → ConfirmDialog. Confirm copy promises the
  // library is untouched; the assertions below hold it to that.
  await listRow.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Remove from list' }).click();
  const confirm = page.locator('.confirm-dialog-content');
  await expect(
    confirm.getByRole('heading', { name: 'Remove from this list?' })
  ).toBeVisible();
  await confirm.getByRole('button', { name: 'Remove' }).click();

  // Off the list: the only attached item is gone, so the empty-list CTA
  // renders (a fresh server read after the removeListItem write).
  await expect(listRow).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'No items on this list yet' })
  ).toBeVisible();

  // Still in the library: the unlink deleted the list_items row only.
  await page.goto('/items');
  await expect(
    page.locator('.item-container', { hasText: chosenItemName }).first()
  ).toBeVisible();
});
