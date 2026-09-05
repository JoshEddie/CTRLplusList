import { expect, test } from '@playwright/test';
import { createListWithFirstItem } from '../test/helpers/e2e/utils';

// Reorder inside edit mode is staged: the drag marks the row, nothing is
// written until Save, and the saved order is what the list page renders.
test('EditMode_OwnerReordersByKeyboardAndSaves_ListRendersTheStagedOrder', async ({
  page,
}) => {
  const listName = `Reorder ${Date.now()}`;
  const firstItem = await createListWithFirstItem(page, listName);
  const listId = page.url().match(/\/lists\/([^/?]+)$/)?.[1];
  expect(listId).toBeTruthy();

  await page.goto(`/lists/${listId}?edit=1`);
  const inList = page.getByRole('region', { name: /^In this list/ });
  const notInList = page.getByRole('region', { name: /^Not in this list/ });
  await expect(inList.getByRole('heading')).toHaveText('In this list · 1');

  // A second item crosses the divider at the end of the list.
  const secondRow = notInList.locator('li.edit-mode-item').first();
  const secondItem = (
    await secondRow.locator('.edit-mode-row-name-static').innerText()
  ).trim();
  await secondRow.getByRole('button', { name: 'Increase' }).click();
  await expect(inList.getByRole('heading')).toHaveText('In this list · 2');
  await expect(inList.locator('.edit-mode-row-name-static')).toHaveText([
    firstItem,
    secondItem,
  ]);

  // Drag the first row down with the keyboard: only it carries the dot.
  const handles = inList.getByRole('button', { name: 'Drag to reorder' });
  await handles.first().focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(inList.locator('.edit-mode-row-name-static')).toHaveText([
    secondItem,
    firstItem,
  ]);
  await expect(
    inList
      .locator('li.edit-mode-item')
      .filter({ hasText: firstItem })
      .getByRole('img', { name: 'Unsaved change' })
  ).toBeVisible();

  // A search suspends reorder without dropping the handle.
  await page.getByRole('searchbox', { name: 'Search items' }).fill(firstItem);
  await expect(inList.getByText('Clear search to reorder')).toBeVisible();
  await expect(handles.first()).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('searchbox', { name: 'Search items' }).fill('');
  await expect(inList.getByText('Clear search to reorder')).toHaveCount(0);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(new RegExp(`/lists/${listId}$`));
  await expect(page.locator('.sortable-item .itemName')).toHaveText([
    secondItem,
    firstItem,
  ]);
});
