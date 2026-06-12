import { expect, test } from '@playwright/test';

// Flow: the paste-link prefill arc for item creation. The /api/product-fetch
// endpoint is ALWAYS stubbed via route interception — e2e never makes a real
// outbound fetch and never burns Zyte quota (ZYTE_API_KEY is unset in e2e
// regardless; the stub also keeps tier 1 off the network). The success arc
// ends with the created item deleted — zero residue.

const STUBBED_PRODUCT = {
  ok: true,
  product: {
    title: '', // per-test: set before use
    description: 'Stubbed by the paste-prefill e2e spec',
    imageUrl: '',
    price: '24.50',
    currency: 'USD',
    canonicalUrl: 'https://example.com/widget',
    store: 'Amazon',
  },
};

test('PastePrefill_FetchSucceeds_FormPrefilledAndItemCreated', async ({
  page,
}) => {
  const stamp = Date.now();
  const fetchedName = `E2E Prefill ${stamp}`;
  await page.route('**/api/product-fetch', (route) =>
    route.fulfill({
      json: {
        ...STUBBED_PRODUCT,
        product: { ...STUBBED_PRODUCT.product, title: fetchedName },
      },
    })
  );

  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();

  // URL-entry step renders before any form fields.
  await expect(
    page.getByText('Paste a product link to auto-fill details')
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Product link' })
    .fill('https://www.amazon.com/dp/B0E2ETEST');
  await page.getByRole('button', { name: 'Fetch Details' }).click();

  // Stub resolves instantly → form renders prefilled with the badge.
  await expect(page.getByText('Fetched from Amazon')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Name', exact: true })
  ).toHaveValue(fetchedName);
  await expect(
    page.getByRole('textbox', { name: 'Store', exact: true })
  ).toHaveValue('Amazon');
  await expect(
    page.getByRole('textbox', { name: 'Link', exact: true })
  ).toHaveValue('https://www.amazon.com/dp/B0E2ETEST');
  await expect(
    page.getByRole('textbox', { name: 'Price', exact: true })
  ).toHaveValue('24.50');

  // Submit through the unchanged create action; the fetched values persist.
  await page.getByRole('button', { name: 'Create Item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  const createdCard = page.locator('.item-container:not(.preview)', {
    hasText: fetchedName,
  });
  await expect(createdCard).toBeVisible();

  // Cleanup: archive then delete through the edit form footer.
  await createdCard.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await page.getByRole('tab', { name: /^Archived/ }).click();
  await createdCard.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.locator('.confirm-dialog-content');
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expect(createdCard).toHaveCount(0);
});

test('PastePrefill_FetchFails_ManualFormWithNoticeAndLinkPrefilled', async ({
  page,
}) => {
  await page.route('**/api/product-fetch', (route) =>
    route.fulfill({ json: { ok: false, error: 'timeout' } })
  );

  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await page
    .getByRole('textbox', { name: 'Product link' })
    .fill('https://www.amazon.com/dp/B0E2EFAIL');
  await page.getByRole('button', { name: 'Fetch Details' }).click();

  // Failure falls through to the manual form: notice + pasted link in the
  // store row + escape back to URL entry. No item is created — zero residue.
  await expect(
    page.getByText(/couldn't fetch that automatically/)
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Link', exact: true })
  ).toHaveValue('https://www.amazon.com/dp/B0E2EFAIL');

  await page.getByRole('button', { name: '← Use a link instead' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Product link' })
  ).toHaveValue('https://www.amazon.com/dp/B0E2EFAIL');
});
