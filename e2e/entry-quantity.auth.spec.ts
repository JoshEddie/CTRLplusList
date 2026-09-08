import { expect, test } from '@playwright/test';
import { createListWithFirstItem } from '../test/helpers/e2e/utils';

// Flow: the owner sets how many of an item they want, from the card's own
// stepper on the ordinary list surface. Build-own-state: two fresh lists
// carrying the SAME library item, so the second proves the number is the
// entry's and not the item's. Going through the real server read after the
// write is the point — the card's number is a cached list read, so a quantity
// that survives a reload means the write's narrow tag fired.
test('ListPage_OwnerSetsEntryQuantityOnCard_HoldsOnThatListOnly', async ({
  page,
}) => {
  const stamp = Date.now();
  const itemName = await createListWithFirstItem(page, `E2E Qty A ${stamp}`);
  const listAUrl = page.url();

  // Default: an entry created by adding an item asks for one.
  const stepperA = page
    .locator('.item-container', { hasText: itemName })
    .getByRole('spinbutton');
  await expect(stepperA).toHaveValue('1');

  // Typed rather than stepped: one write for the whole number, and it proves
  // the compact stepper's middle cell is a control and not a readout. The
  // number on the card is the optimistic mirror, so the action's own round
  // trip is what the reload below waits on — the point of that reload is the
  // server read, which must not race the write's tag bump.
  const write = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().startsWith(listAUrl)
  );
  await stepperA.fill('4');
  await expect(stepperA).toHaveValue('4');
  await write;

  await page.goto(listAUrl);
  await expect(
    page
      .locator('.item-container', { hasText: itemName })
      .getByRole('spinbutton')
  ).toHaveValue('4');

  // The same item on a second list carries its own number, untouched.
  const secondName = await createListWithFirstItem(page, `E2E Qty B ${stamp}`);
  expect(secondName).toBe(itemName);
  await expect(
    page
      .locator('.item-container', { hasText: itemName })
      .getByRole('spinbutton')
  ).toHaveValue('1');

  // ...and the first list still reads 4 after a fresh navigation.
  await page.goto(listAUrl);
  await expect(
    page
      .locator('.item-container', { hasText: itemName })
      .getByRole('spinbutton')
  ).toHaveValue('4');
});
