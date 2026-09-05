import { expect, test } from '@playwright/test';

// Flow: the item-library management arc — create → edit → archive → delete — as
// the seeded viewer, through the Decision Deck's Preview-centered editor
// (item-decision-deck). Build-own-state: zero seed dependency and zero residue
// (the arc ends with the item deleted). Per-run-unique A/B names keep re-runs
// against the shared dev DB from colliding and keep "old name gone" assertions
// unambiguous.
//
// Manual entry is failure-screen-only: a stubbed failing fetch routes to the
// failure screen, whose manual affordance opens the Fill-manually shell with
// the pasted URL seeded as the store link. Fields are filled via its rows
// (Focus editors and the grouped Store editor), and the shell advances to
// Preview once no row is in error and every warn row has been visited. Each
// assertion is a fresh server read after a `'use server'` write, pinning the
// `items` cache-tag loop.
test('ItemCrud_OwnerCreatesEditsArchivesDeletes_ItemAddedEditedArchivedDeleted', async ({
  page,
}) => {
  const stamp = Date.now();
  const createdName = `E2E Item ${stamp}A`;
  const renamedName = `E2E Item ${stamp}B`;

  // Create — "New Item" opens the URL-entry step (no manual affordance);
  // a failed fetch surfaces the failure screen's manual door. Name via its
  // row's focus editor, store name via the grouped Store editor (the link is
  // pre-seeded from the pasted URL), price via its own row, then a photo-row
  // visit completes the advance rule and the shell advances to Preview.
  await page.route('**/api/product-fetch', (route) =>
    route.fulfill({ json: { ok: false, error: 'fetch_failed' } })
  );
  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await expect(
    page.getByRole('button', { name: 'Fill in details manually →' })
  ).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Product link' })
    .fill('https://example.com/e2e-item');
  await page.getByRole('button', { name: 'Fetch Details' }).click();
  await expect(page.getByText("We couldn't load that link")).toBeVisible();
  await page
    .getByRole('button', { name: 'Fill in details manually →' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Add the details' })
  ).toBeVisible();

  await page.getByRole('button', { name: /Item name/ }).click();
  await page.getByLabel('Item name').fill(createdName);
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: /^Store / }).click();
  await page.getByLabel('Store name').fill('E2E Store');
  await expect(page.getByLabel('Link')).toHaveValue(
    'https://example.com/e2e-item'
  );
  await page.getByRole('button', { name: 'Done' }).click();

  // Scoped to the shell's rows: the items-page toolbar behind the modal also
  // carries a "Price" filter button.
  await page
    .locator('.deck-triage-rows')
    .getByRole('button', { name: /^Price/ })
    .click();
  await page.getByLabel('Price', { exact: true }).fill('19.99');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: /^Photo/ }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Last look')).toBeVisible();

  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();
  // The form modal closes itself on successful create.
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
