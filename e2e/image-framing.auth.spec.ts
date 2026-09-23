import { expect, test, type Page } from '@playwright/test';
import {
  deleteItem,
  openItemEdit,
  routeStubImages,
  stubImageUrl,
} from '../test/helpers/e2e/utils';

// Flow: per-image framing. Each candidate keeps its own position and fit
// through create, a photo swap, and a later save that never touches the photo
// — every card read a fresh server read after a `'use server'` write. Product
// fetch and images are stubbed as in paste-prefill; the item is deleted at the
// end, leaving zero residue.

const FIRST = stubImageUrl('1d3557');
const SECOND = stubImageUrl('457b9d');

async function stubFetch(page: Page, title: string) {
  // Tall, so Fill crops it vertically in the 4:3 preview and there is
  // something to pan.
  await routeStubImages(page, { width: 240, height: 480 });
  await page.route('**/api/product-fetch', (route) =>
    route.fulfill({
      json: {
        ok: true,
        product: {
          title,
          imageUrl: FIRST,
          imageUrls: [FIRST, SECOND],
          price: '24.50',
          currency: 'USD',
          canonicalUrl: 'https://example.com/c',
          store: 'Amazon',
        },
      },
    })
  );
}

const stageImage = (page: Page) => page.locator('.deck-photo-frame img');

async function openEditTriage(page: Page, name: string) {
  await openItemEdit(page, name);
  await page.getByRole('button', { name: /Need to change something/ }).click();
}

test('ImageFraming_SwapPhotosAndSaveAgain_EachPhotoKeepsItsFraming', async ({
  page,
}) => {
  const stamp = Date.now();
  const name = `E2E Framing ${stamp}A`;
  const renamed = `E2E Framing ${stamp}B`;
  await stubFetch(page, name);
  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await page
    .getByRole('textbox', { name: 'Product link' })
    .fill('https://x.test/framing');
  await page.getByRole('button', { name: 'Fetch Details' }).click();
  await page.getByRole('button', { name: "Let's go" }).click();

  // The first photo moves down to show more of its top; the second is set to Fit.
  await page.getByRole('button', { name: /Photo position/ }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(stageImage(page)).toHaveCSS('object-position', '50% 30%');
  await page.getByRole('button', { name: 'Use image 2' }).click();
  await page.getByRole('radio', { name: 'Fit' }).click();
  await expect(stageImage(page)).toHaveCSS('object-fit', 'contain');

  await page.getByRole('button', { name: 'Continue' }).click(); // note
  await page.getByRole('button', { name: 'Continue' }).click(); // preview
  await expect(page.locator('.item-container.preview .item-image')).toHaveCSS(
    'object-fit',
    'contain'
  );
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();
  const cardImage = (cardName: string) =>
    page
      .locator('.item-container:not(.preview)', { hasText: cardName })
      .locator('.item-image');
  await expect(cardImage(name)).toHaveCSS('object-fit', 'contain');

  // Swapping back to the first photo restores its own framing.
  await openEditTriage(page, name);
  await page.getByRole('button', { name: /^Photo/ }).click();
  await page.getByRole('button', { name: 'Use image 1' }).click();
  await expect(stageImage(page)).toHaveCSS('object-position', '50% 30%');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: /Back to preview/ }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Item updated successfully')).toBeVisible();
  await expect(cardImage(name)).toHaveCSS('object-position', '50% 30%');

  // A save that never touches the photo leaves its framing in place.
  await openEditTriage(page, name);
  await page.getByRole('button', { name: /Item name/ }).click();
  await page.getByLabel('Item name').fill(renamed);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: /Back to preview/ }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Item updated successfully')).toBeVisible();
  await expect(cardImage(renamed)).toHaveCSS('object-position', '50% 30%');

  await deleteItem(page, renamed);
});
