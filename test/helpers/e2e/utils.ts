import { expect, type Locator, type Page } from '@playwright/test';

// Locates the first item card a non-owner viewer can freshly claim on the
// current list page. The card:
//   - exposes an enabled "Add Claim" affordance (so it is not already
//     fully claimed), and
//   - is a single-unit entry — no claim counter is rendered (the entry's
//     `quantity` is 1), so claiming it fully claims the entry and surfaces the
//     claimer's name ("Claimed by …" for a guest, "You claimed this" for the
//     viewer), and
//   - the viewer has not already claimed it ("You claimed this" absent), so a
//     fresh claim is always accepted.
//
// The `.item-container` / `.item-entry-line` class hooks select the FIXTURE; the
// specs' assertions target user-visible text, per the suite's "drive real
// affordances" rule.
export function firstClaimableSingleItem(page: Page): Locator {
  return page
    .locator('.item-container')
    .filter({ has: page.getByRole('button', { name: 'Add Claim' }) })
    .filter({ hasNot: page.locator('.item-entry-line') })
    .filter({ hasNotText: 'You claimed this' })
    .first();
}

// Removes an item a spec created, through the affordances a user has: the
// card's kebab → Edit → the edit Preview's Delete → the confirm dialog. Scope
// the confirm click to the dialog — the Preview's own delete button carries the
// same name. Specs that create items call this so a run leaves zero residue.
export async function deleteItem(page: Page, name: string): Promise<void> {
  const card = page.locator('.item-container:not(.preview)', { hasText: name });
  await card.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page
    .locator('.confirm-dialog-content')
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(card).toHaveCount(0);
}

// Creates a list through the real flow and attaches the first library item the
// choose-items step offers, returning that item's name. The seeded library is
// stable, so two calls in one spec land on the same item — which is what lets a
// spec assert that two entries of one item are independent. Leaves the list
// behind: there is no delete-list affordance to clean up with.
export async function createListWithFirstItem(
  page: Page,
  listName: string
): Promise<string> {
  await page.goto('/lists');
  await page.getByRole('button', { name: 'New List' }).first().click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(listName);
  await page
    .getByRole('textbox', { name: 'Date', exact: true })
    .fill('2030-06-01');
  await page.getByRole('button', { name: 'Create List' }).click();

  await expect(page).toHaveURL(/\/lists\/[^/]+\/choose-items\?new=1$/);
  const row = page.locator('ul.choose-items-list li').first();
  await row.getByRole('checkbox').check();
  const itemName = (await row.locator('.itemName').innerText()).trim();
  await page.getByRole('button', { name: /Add 1 item to list/ }).click();
  await expect(page).toHaveURL(/\/lists\/[^/]+$/);
  return itemName;
}

// Waits until the service worker registered by the current page is active AND
// controlling it, returning the registration scope. `app/sw.ts` sets
// `clientsClaim`, so the first visit is claimed without a reload; both waits
// are observable conditions, never sleeps.
export async function awaitServiceWorkerActive(page: Page): Promise<string> {
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  return scope;
}
