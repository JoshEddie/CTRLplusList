import { expect, test } from '@playwright/test';

// Flow: the item-library management arc — create → edit → archive → delete — as
// the seeded viewer, through the Decision Deck's Preview-centered editor
// (item-decision-deck). Build-own-state: zero seed dependency and zero residue
// (the arc ends with the item deleted). Per-run-unique A/B names keep re-runs
// against the shared dev DB from colliding and keep "old name gone" assertions
// unambiguous.
//
// Manual entry opens a blank Preview; fields are edited via Triage → Focus and
// the Stores sheet (no all-fields-at-once form). Each assertion is a fresh
// server read after a `'use server'` write, pinning the `items` cache-tag loop.
test('ItemCrud_OwnerCreatesEditsArchivesDeletes_ItemAddedEditedArchivedDeleted', async ({
  page,
}) => {
  const stamp = Date.now();
  const createdName = `E2E Item ${stamp}A`;
  const renamedName = `E2E Item ${stamp}B`;

  // Create — "New Item" opens the URL-entry step; "manually" drops to a blank
  // Preview. Set the name via Triage → the Name focus editor, and the store via
  // the Stores sheet (all-or-nothing: name + link + price together).
  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await page.getByRole('button', { name: 'Fill in details manually →' }).click();
  await expect(page.getByText('Last look')).toBeVisible();

  await page.getByRole('button', { name: /Need to change something/ }).click();
  await page.getByRole('button', { name: /Item name/ }).click();
  await page.getByLabel('Item name').fill(createdName);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: /Back to preview/ }).click();

  await page.getByRole('button', { name: /Store links/ }).click();
  await page.getByLabel('Store name').fill('E2E Store');
  await page.getByLabel('Link').fill('https://example.com/e2e-item');
  await page.getByLabel('Price').fill('19.99');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  const createdCard = page.locator('.item-container:not(.preview)', {
    hasText: createdName,
  });
  await expect(createdCard).toBeVisible();

  // Edit — the kebab's Edit entry navigates to /items/[id] with returnTo and
  // opens Preview seeded from the item; rename via Triage → Name focus, save.
  await createdCard.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/items\/[^/?]+\?returnTo=/);
  await expect(page.getByText('Editing')).toBeVisible();
  await page.getByRole('button', { name: /Need to change something/ }).click();
  await page.getByRole('button', { name: /Item name/ }).click();
  await page.getByLabel('Item name').fill(renamedName);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: /Back to preview/ }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Item updated successfully')).toBeVisible();
  await expect(page).toHaveURL(/\/items(\?|$)/);
  const renamedCard = page.locator('.item-container:not(.preview)', {
    hasText: renamedName,
  });
  await expect(renamedCard).toBeVisible();
  await expect(createdCard).toHaveCount(0);

  // Archive — the kebab's Archive entry moves the item to the Archived tab.
  await renamedCard.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(renamedCard).toHaveCount(0);
  await page.getByRole('tab', { name: /^Archived/ }).click();
  await expect(page).toHaveURL(/tab=archived/);
  await expect(renamedCard).toBeVisible();

  // Delete — permanent deletion is offered from the edit Preview's delete
  // affordance for archived items, behind a confirm dialog. Scope the confirm
  // click to the dialog: the Preview's delete button is also named "Delete".
  await renamedCard.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
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
