import { expect, type Locator, type Page } from '@playwright/test';

// Locates the first item card a non-owner viewer can freshly claim on the
// current list page. The card:
//   - exposes the "Claim" affordance, and
//   - is a single-unit entry with nothing claimed on it — the progress banner
//     reads "0 / 1 Claimed", so claiming it fully claims the entry and no
//     claim of the viewer's (or anyone's) is already on it.
//
// The `.item-container` / `.purchased-banner` class hooks select the FIXTURE;
// the specs' assertions target user-visible text, per the suite's "drive real
// affordances" rule.
export function firstClaimableSingleItem(page: Page): Locator {
  return page
    .locator('.item-container')
    .filter({ has: page.getByRole('button', { name: 'Claim', exact: true }) })
    .filter({
      has: page.locator('.purchased-banner', { hasText: /^0 \/ 1 Claimed$/ }),
    })
    .first();
}

// Opens a seeded list and waits for its heading, so a spec's first assertion
// fails on the thing it is testing rather than on an unloaded page.
export async function openList(
  page: Page,
  path: string,
  heading: string
): Promise<void> {
  await page.goto(path);
  await expect(
    page.getByRole('heading', { name: heading }).first()
  ).toBeVisible();
}

// The first multi-unit entry on the current list page with at least `minFree`
// units unclaimed and no claim of the viewer's. Capacity is per entry and
// enforced, so "has a banner" is not enough — every card carries one: a card
// one unit short passes a first claim and then loses its affordance. Reading
// the remainder off the banner states the requirement instead of trusting a
// seeded position, and throws rather than timing out if the seed stops meeting
// it. A claim of the viewer's is what Manage claim marks, at every tier.
export async function multiUnitEntryWithRoom(
  page: Page,
  minFree: number
): Promise<{ card: Locator; claimed: number; quantity: number }> {
  const candidates = page
    .locator('.item-container')
    .filter({ has: page.getByRole('button', { name: 'Claim', exact: true }) })
    .filter({ hasNot: page.getByRole('button', { name: /^Manage claim/ }) });
  for (const card of await candidates.all()) {
    const counter = await card.locator('.purchased-banner').innerText();
    const parsed = /(\d+) \/ (\d+) Claimed/.exec(counter);
    if (!parsed || parsed[2] === '1') continue;
    const claimed = Number(parsed[1]);
    const quantity = Number(parsed[2]);
    if (quantity - claimed >= minFree) return { card, claimed, quantity };
  }
  throw new Error(
    `No multi-unit entry on the seeded list has ${minFree} units free`
  );
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

// Creates a list through the real flow and attaches the first library card edit
// mode's create pass-through offers, returning that item's name. The seeded
// library is stable, so two calls in one spec land on the same item — which is
// what lets a spec assert that two entries of one item are independent. Leaves the list
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

  await expect(page).toHaveURL(/\/lists\/[^/]+\?edit=1&new=1$/);
  const card = page.locator('.edit-mode-library .item').first();
  await card.getByRole('button', { name: 'Increase' }).click();
  const itemName = (await card.locator('.itemName').innerText()).trim();
  await page.getByRole('button', { name: /Add 1 item/ }).click();
  // Bulk Save confirms, in the create pass-through as anywhere else.
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\/lists\/[^/?]+$/);
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
