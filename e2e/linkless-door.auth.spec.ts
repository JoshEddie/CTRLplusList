import { expect, test } from '@playwright/test';
import { deleteItem } from '../test/helpers/e2e/utils';

// The linkless add-door journey (#258): the owner enters the deck without a
// product link and creates a BARE item end to end.
//
// Capabilities and scenarios verified:
//   product-link-prefill — "The linkless door enters the deck directly" (the
//     URL entry state's ghost door opens the deck seeded from blankItem(), no
//     fetch, no intro card).
//   item-decision-deck — "A linkless entry has no store step", the zero-image
//     photo card ("the first placeholder thumb SHALL be pre-selected"), "Door
//     item saves without a price as BARE", and the linkless lock hiding the
//     Preview's Store row.
//   item-store-links — the created BARE item renders no price line.
//
// /api/product-fetch is routed to count calls and abort: the door seeds the
// deck from blankItem() and sends no fetch, so any request here is itself a
// failure of the door contract. The created item is deleted — zero residue.
test('LinklessDoor_DeckWithoutStoreStepOrPrice_CreatesBareItem', async ({
  page,
}) => {
  const name = `E2E Door ${Date.now()}`;
  let fetchCalls = 0;
  await page.route('**/api/product-fetch', (route) => {
    fetchCalls += 1;
    return route.abort();
  });

  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await page
    .getByRole('button', { name: 'No link? Cash, gift cards & more' })
    .click();

  // The door lands straight on the photo card — no intro (nothing was
  // fetched), and the strip is placeholder art only, with the first thumb
  // pre-selected so the stage is never empty.
  await expect(page.getByRole('heading', { name: 'Pick some art' })).toBeVisible();
  await expect(page.getByRole('button', { name: "Let's go" })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Use artwork/ })).toHaveCount(4);
  await expect(
    page.getByRole('button', { name: 'Use artwork 1' })
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Use image/ })).toHaveCount(0);
  // The deck was seeded locally: nothing was fetched to open it.
  expect(fetchCalls).toBe(0);

  // The tracker carries Photo · Name · Price and no store step at all.
  await expect(page.getByRole('button', { name: /The Price|Price step/ })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /The Store|Store step/ })
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Give it a clear name')).toBeVisible();
  await page.getByLabel('Item name').fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();

  // The price card states the linkless rule and lets an empty price through —
  // the fetch path's "no skipping this one" gate does not apply.
  await expect(page.getByText('What does it cost?')).toBeVisible();
  await expect(
    page.getByText('Add a price if it has one — this one can stay blank.')
  ).toBeVisible();
  await expect(page.getByLabel('Price', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Preview offers no Store entry (the linkless lock) and saves without a price.
  await expect(page.getByText('Last look')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Store / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();

  // The saved item is BARE: no store row means no price line and no store
  // navigation on the card.
  const card = page.locator('.item-container:not(.preview)', { hasText: name });
  await expect(card).toBeVisible();
  await expect(card.locator('.item-price-row')).toHaveCount(0);
  await expect(
    card.getByRole('link', { name: 'View item — opens in new tab' })
  ).toHaveCount(0);

  await deleteItem(page, name);
});
