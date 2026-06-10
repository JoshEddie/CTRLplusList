import { expect, test } from '@playwright/test';

// Flow: the item-library management arc — create → edit → archive → delete —
// as the seeded viewer. Entirely build-own-state: zero seed dependency and
// zero residue (the arc ends with the item deleted). Per-run-unique names keep
// re-runs against the shared dev DB from colliding; the A/B suffixes keep the
// renamed name from containing the created name as a substring, so the
// "old name gone" assertions are unambiguous.
//
// Each step's assertion is a fresh server read after a `'use server'` write
// (createItem / updateItem / archiveItem / deleteItem), pinning the `items`
// cache-tag loop on the library side. Filling the store row exercises the
// item.associations.ts store-sync path. Desktop affordances throughout (icon
// buttons, not the mobile kebab).
test('ItemCrud_OwnerCreatesEditsArchivesDeletes_ItemAddedEditedArchivedDeleted', async ({
  page,
}) => {
  const stamp = Date.now();
  const createdName = `E2E Item ${stamp}A`;
  const renamedName = `E2E Item ${stamp}B`;

  // Create — "New Item" opens the ItemForm modal in place; one store row
  // exists by default. Labels render with an aria-hidden asterisk, so exact
  // accessible-name matches work. A store row is all-or-nothing server-side
  // (ItemSchema: name + link + price together), so fill all three.
  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(createdName);
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Created by the item-crud e2e spec');
  await page.getByRole('textbox', { name: 'Store', exact: true }).fill('E2E Store');
  await page.getByRole('textbox', { name: 'Price', exact: true }).fill('19.99');
  await page
    .getByRole('textbox', { name: 'Link', exact: true })
    .fill('https://example.com/e2e-item');
  await page.getByRole('button', { name: 'Create Item' }).click();

  // On /items the form modal stays open after a successful save (only the
  // success toast and a background refresh signal it), so wait for the toast,
  // close the modal, and assert against the refreshed library — the default
  // created_desc sort surfaces the new card on the first page of the Active
  // tab. Closing first also keeps the card locator off the modal's live
  // preview, which renders the same name.
  await expect(page.getByText('Item created successfully')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'Create Item' })).toHaveCount(0);
  const createdCard = page.locator('.item-container', { hasText: createdName });
  await expect(createdCard).toBeVisible();

  // Edit — the card's Edit affordance opens the form pre-filled; rename and
  // assert the library reflects the new name and no longer the old one.
  await createdCard.getByRole('button', { name: 'Edit item' }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(renamedName);
  await page.getByRole('button', { name: 'Update Item' }).click();
  await expect(page.getByText('Item updated successfully')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'Update Item' })).toHaveCount(0);
  const renamedCard = page.locator('.item-container', { hasText: renamedName });
  await expect(renamedCard).toBeVisible();
  await expect(createdCard).toHaveCount(0);

  // Archive — the icon affordance moves the item out of Active and into the
  // Archived tab.
  await renamedCard.getByRole('button', { name: 'Archive item' }).click();
  await expect(renamedCard).toHaveCount(0);
  await page.getByRole('tab', { name: /^Archived/ }).click();
  await expect(page).toHaveURL(/tab=archived/);
  await expect(renamedCard).toBeVisible();

  // Delete — permanent deletion is offered from the edit form's footer for
  // archived items, behind a confirm dialog. Scope the confirm click to the
  // dialog: the footer button behind it is also named "Delete".
  await renamedCard.getByRole('button', { name: 'Edit item' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.locator('.confirm-dialog-content');
  await expect(
    confirm.getByRole('heading', { name: 'Delete this item permanently?' })
  ).toBeVisible();
  await confirm.getByRole('button', { name: 'Delete' }).click();

  // Gone from both tabs — the flow ends at zero residue.
  await expect(renamedCard).toHaveCount(0);
  await page.getByRole('tab', { name: /^Active/ }).click();
  await expect(renamedCard).toHaveCount(0);
  await expect(createdCard).toHaveCount(0);
});
