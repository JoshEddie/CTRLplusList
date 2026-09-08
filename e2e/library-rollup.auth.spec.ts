import { expect, test } from '@playwright/test';
import { deleteItem } from '../test/helpers/e2e/utils';

// The library card is read through no entry, so its banner totals every entry
// the item has. Build-own-state, for two reasons the seed cannot satisfy: the
// pool repeats an item name once per list it sits on, so nothing seeded can be
// located by name at all; and only an item this spec created has a list count
// no other spec can move under it. A uniquely named item makes every number
// here absolute rather than a delta.
//
// It is also the invalidation proof. The rollup comes from a `'use cache'`
// read keyed on the profile, while a quantity write fires only the list's own
// membership tag — so a stale banner is the read failing to name that tag,
// not the write failing to land.
//
// Read at `?spoiler=claims` throughout: the parameter only ever raises, so the
// tier is the same whatever baseline an earlier spec left on this profile. The
// withheld wording below that tier is a copy branch, covered in unit tests.
test('ItemLibrary_FreshItemJoinsOneListThenGainsUnits_RollupBannerFollows', async ({
  page,
}) => {
  const stamp = Date.now();
  const name = `E2E Rollup ${stamp}`;

  // The linkless door is the shortest create there is: no fetch, no store
  // step, and the price may stay blank.
  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await page
    .getByRole('button', { name: 'No link? Cash, gift cards & more' })
    .click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Item name').fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();

  const card = page.locator('.item-container:not(.preview)', { hasText: name });
  await expect(card).toBeVisible();
  // On no list: nothing to total, so nothing the banner could state.
  await expect(card.locator('.purchased-banner')).toHaveCount(0);

  const banner = async (): Promise<void> => {
    await page.goto('/items?spoiler=claims');
    await page.getByRole('searchbox', { name: 'Search items' }).fill(name);
    await expect(card).toBeVisible();
  };

  await page.goto('/lists');
  await page.getByRole('button', { name: 'New List' }).first().click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await page
    .getByRole('textbox', { name: 'Date', exact: true })
    .fill('2030-06-01');
  await page.getByRole('button', { name: 'Create List' }).click();
  await expect(page).toHaveURL(/\/lists\/[^/?]+$/);
  const listId = page.url().match(/\/lists\/([^/?]+)$/)?.[1];
  expect(listId).toBeTruthy();

  // The card's number is the optimistic mirror, so every step below awaits the
  // action's own round trip: each read that follows is a fresh server read and
  // must not race the write's tag bump.
  const listUrl = page.url();
  const committed = async (act: () => Promise<void>) => {
    const write = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().startsWith(listUrl)
    );
    await act();
    await write;
  };

  // Three units on the one entry the item has, committed as they are pressed.
  const libraryCard = page.locator('.item-container', { hasText: name });
  const increase = libraryCard.getByRole('button', { name: 'Increase' });
  for (const value of ['1', '2', '3']) {
    await committed(async () => {
      await increase.click();
      await expect(libraryCard.getByRole('spinbutton')).toHaveValue(value);
    });
  }
  await expect(page.getByRole('tab', { name: /^In this list/ })).toHaveText(
    'In this list · 1'
  );

  await banner();
  await expect(card.locator('.purchased-banner')).toHaveText(
    '0 / 3 Claimed on 1 list'
  );

  // The same entry, two units larger: the total follows the write and the list
  // count does not move, which is what separates a rollup from a recount.
  await page.goto(listUrl);
  const listCard = page.locator('.item-container', { hasText: name });
  await committed(async () => {
    await listCard.getByRole('spinbutton').fill('5');
    await expect(listCard.getByRole('spinbutton')).toHaveValue('5');
  });

  await page.goto(`/lists/${listId}?spoiler=claims`);
  await expect(card.locator('.purchased-banner')).toHaveText('0 / 5 Claimed');

  await banner();
  await expect(card.locator('.purchased-banner')).toHaveText(
    '0 / 5 Claimed on 1 list'
  );

  // The list stays behind — there is no delete-list affordance — but the item
  // does not.
  await page.goto('/items');
  await deleteItem(page, name);
});
