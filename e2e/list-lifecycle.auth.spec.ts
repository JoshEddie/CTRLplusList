import { expect, test } from '@playwright/test';

// Flow: the owner happy-path arc — create list → add items → set visibility →
// share — as the seeded viewer. Each step asserts its own observable result,
// and later steps build on the list the earlier steps created (build-own-state:
// zero seed dependency). A per-run-unique name keeps re-runs against the shared
// dev DB from colliding.
test('ListLifecycle_OwnerCreatesAndShares_StepsReflected', async ({ page }) => {
  const listName = `E2E Lifecycle ${Date.now()}`;

  // Create — the "New List" button on /lists opens the ListForm modal in place;
  // createList then lands on the new list's own page.
  await page.goto('/lists');
  await page.getByRole('button', { name: 'New List' }).first().click();
  // Labels render with a required-asterisk suffix ("Name *"), so match by the
  // control's accessible name rather than an exact label string.
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(listName);
  await page
    .getByRole('textbox', { name: 'Date', exact: true })
    .fill('2030-06-01');
  await page.getByRole('button', { name: 'Create List' }).click();

  await expect(page).toHaveURL(/\/lists\/[^/?]+$/);
  const listId = page.url().match(/\/lists\/([^/?]+)$/)?.[1];
  expect(listId).toBeTruthy();

  // Add items — an empty list opens on All items; bump one library card and the
  // entry commits as it is pressed. Capture the chosen card's item name so the
  // assertion on the other tab can prove the attach round-tripped.
  await expect(page.getByRole('tab', { name: 'All items' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  const inListTab = page.getByRole('tab', { name: /^In this list/ });
  await expect(inListTab).toHaveText('In this list · 0');
  const chosenCard = page.locator('.item-container').first();
  const chosenItemName = (
    await chosenCard.locator('.itemName').innerText()
  ).trim();
  await chosenCard.getByRole('button', { name: 'Increase' }).click();
  await expect(inListTab).toHaveText('In this list · 1');
  await expect(
    page.getByRole('heading', { name: listName }).first()
  ).toBeVisible();

  // The chosen item's name on the list's own surface proves the entry
  // persisted — the new list starts empty, so nothing else can supply it.
  await inListTab.click();
  await expect(
    page.locator('.items-browser .itemName', { hasText: chosenItemName })
  ).toBeVisible();

  // Set visibility — a new list defaults to Hidden; promote it to Shared via
  // the visibility picker and assert the trigger pill now reads "Shared". A
  // fresh navigation first: the assertion above scrolled the list, and the
  // hero's controls sit behind its collapsed face once it has.
  await page.goto(`/lists/${listId}`);
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
