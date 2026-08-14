import { expect, test, type Page } from '@playwright/test';
import { deleteItem } from '../test/helpers/e2e/utils';

// Flow: item-placeholder-art. The deck's placeholder thumbs (transient
// previews, reroll, selected-placeholder persistence) and the lazy-mint path
// (an imageless item materializes generated art on first view). Product fetch
// is stubbed as in paste-prefill — no outbound calls; created items are
// deleted so runs leave zero residue.

const NO_IMAGE_PRODUCT = {
  title: 'Placeholder E2E Item',
  price: '12.00',
  currency: 'USD',
  canonicalUrl: 'https://example.com/c',
  store: 'Amazon',
};

async function stubImagelessFetch(page: Page, title: string) {
  await page.route('**/api/product-fetch', (route) =>
    route.fulfill({
      json: { ok: true, product: { ...NO_IMAGE_PRODUCT, title } },
    })
  );
}

async function openDeck(page: Page, url: string) {
  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await page.getByRole('textbox', { name: 'Product link' }).fill(url);
  await page.getByRole('button', { name: 'Fetch Details' }).click();
}

test('Deck_SelectedPlaceholder_RerollsInPlaceAndPersistsAsActiveImage', async ({
  page,
}) => {
  const name = `Placeholder E2E ${Date.now()}`;
  await stubImagelessFetch(page, name);
  await openDeck(page, 'https://x.test/placeholder');
  await page.getByRole('button', { name: "Let's go" }).click();

  await expect(
    page.getByRole('heading', { name: 'Pick some art' })
  ).toBeVisible();
  // A zero-photo deck preselects the first placeholder, so reroll is offered.
  await expect(
    page.getByRole('button', { name: 'Reroll artwork' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Use artwork 1' }).click();
  const stage = page.locator('.deck-photo-frame img');
  await expect(stage).toHaveAttribute('src', /^data:image\/svg\+xml;base64,/);
  const before = await stage.getAttribute('src');

  await page.getByRole('button', { name: 'Reroll artwork' }).click();
  await expect(stage).not.toHaveAttribute('src', before!);
  await expect(stage).toHaveAttribute('src', /^data:image\/svg\+xml;base64,/);

  await page.getByRole('button', { name: 'Continue' }).click(); // note
  await page.getByRole('button', { name: 'Continue' }).click(); // preview
  await expect(page.getByText('Last look')).toBeVisible();
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();

  // The selected placeholder persisted as the item's active image.
  const card = page.locator('.item-container:not(.preview)', { hasText: name });
  await expect(card.locator('.item-image')).toHaveAttribute(
    'src',
    /^data:image\/svg\+xml;base64,/
  );

  await deleteItem(page, name);
});

test('ItemCard_FirstView_MintsPersistedArt', async ({ page }) => {
  const name = `Mint E2E ${Date.now()}`;
  await stubImagelessFetch(page, name);
  await openDeck(page, 'https://x.test/mint');
  await page.getByRole('button', { name: "Let's go" }).click();
  // Proceed WITHOUT selecting any art — the item saves imageless.
  await page.getByRole('button', { name: 'Continue' }).click(); // note
  await page.getByRole('button', { name: 'Continue' }).click(); // preview
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();

  // The card's empty container fires the lazy mint and swaps in generated art.
  const card = page.locator('.item-container:not(.preview)', { hasText: name });
  await expect(card.locator('.item-image')).toHaveAttribute(
    'src',
    /^data:image\/svg\+xml;base64,/
  );
  const minted = await card.locator('.item-image').getAttribute('src');

  // Mint is idempotent: a reload resolves the same persisted row.
  await page.reload();
  await expect(
    page
      .locator('.item-container:not(.preview)', { hasText: name })
      .locator('.item-image')
  ).toHaveAttribute('src', minted!);

  await deleteItem(page, name);
});
