import { expect, test } from '@playwright/test';

// Flow: the owner happy-path arc — create list → add items → set visibility →
// share — as the seeded viewer. Each step asserts its own observable result,
// and later steps build on the list the earlier steps created (build-own-state:
// zero seed dependency). A per-run-unique name keeps re-runs against the shared
// dev DB from colliding.
test('ListLifecycle_OwnerCreatesAndShares_StepsReflected', async ({ page }) => {
  const listName = `E2E Lifecycle ${Date.now()}`;

  // Create — the "New List" button on /lists opens the ListForm modal in place;
  // createList then lands on the choose-items step for the new list.
  await page.goto('/lists');
  await page.getByRole('button', { name: 'New List' }).first().click();
  // Labels render with a required-asterisk suffix ("Name *"), so match by the
  // control's accessible name rather than an exact label string.
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(listName);
  await page.getByRole('textbox', { name: 'Date', exact: true }).fill('2030-06-01');
  await page.getByRole('button', { name: 'Create List' }).click();

  await expect(page).toHaveURL(/\/lists\/[^/]+\/choose-items\?new=1$/);
  const listId = page.url().match(/\/lists\/([^/]+)\/choose-items/)?.[1];
  expect(listId).toBeTruthy();

  // Add items — select one library item and save; the arc returns to the list
  // page.
  await page.locator('ul.choose-items-list').getByRole('checkbox').first().check();
  await expect(page.getByText('1 item selected')).toBeVisible();
  await page.getByRole('button', { name: /Add 1 item to list/ }).click();

  await expect(page).toHaveURL(new RegExp(`/lists/${listId}$`));
  await expect(page.getByRole('heading', { name: listName }).first()).toBeVisible();

  // Set visibility — a new list defaults to Hidden; promote it to Shared via
  // the visibility picker and assert the trigger pill now reads "Shared".
  await page.getByRole('button', { name: /Visibility:/ }).click();
  await page.getByRole('menuitemradio', { name: 'Shared' }).click();
  await expect(
    page.getByRole('button', { name: /Visibility: Shared/ })
  ).toBeVisible();

  // Share — the share affordance is only reachable once the list is no longer
  // hidden, so its presence confirms the visibility change took effect server-
  // side. Assert reachability; do not trigger the OS share sheet.
  await expect(page.getByRole('button', { name: 'Share list' })).toBeVisible();
});
