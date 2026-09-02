import { expect, test } from '@playwright/test';
import { createListWithFirstItem } from '../test/helpers/e2e/utils';

// Flow: owner removes an item from a list straight from the item card's kebab
// menu (the single-item shortcut to the choose-items bulk flow). Build-own-
// state: create a list, attach one library item, remove it via kebab →
// ConfirmDialog, then prove the unlink touched only the association — the
// list shows its empty-state CTA while the item still exists in /items.
test('ListPage_OwnerRemovesItemViaKebab_ItemOffListButInLibrary', async ({
  page,
}) => {
  const chosenItemName = await createListWithFirstItem(
    page,
    `E2E Remove ${Date.now()}`
  );
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
  // 200+ seeded items: search rather than trust the default page's slice.
  await page.getByRole('searchbox', { name: 'Search items' }).fill(chosenItemName);
  await expect(
    page.locator('.item-container', { hasText: chosenItemName }).first()
  ).toBeVisible();
});
