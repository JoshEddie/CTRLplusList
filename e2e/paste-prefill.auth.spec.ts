import { expect, test, type Page } from '@playwright/test';

// Flow: the post-fetch Decision Deck (item-decision-deck). /api/product-fetch is
// ALWAYS stubbed via route interception keyed on the pasted URL, so each deck
// shape is driven by a distinct fixture — e2e never makes a real outbound fetch
// and never burns Zyte quota (ZYTE_API_KEY is unset in e2e regardless). The
// success arc ends with the created item deleted — zero residue.

// Real, loadable ≥200px images (inline SVG data URIs) so the deck's fetch-time
// size pruning keeps them — fake .jpg URLs would 404 and get pruned away,
// collapsing every multi-image fixture to one.
const img = (hex: string) =>
  `data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='240'%20height='240'%20viewBox='0%200%20240%20240'%3E%3Crect%20width='240'%20height='240'%20fill='%23${hex}'/%3E%3C/svg%3E`;
const IMAGES3 = [img('1d3557'), img('457b9d'), img('a8dadc')];

type Fixture = Record<string, unknown>;

function product(over: Fixture = {}): Fixture {
  return {
    title: 'Cast Iron Skillet',
    imageUrl: IMAGES3[0],
    imageUrls: IMAGES3,
    price: '24.50',
    currency: 'USD',
    canonicalUrl: 'https://example.com/c',
    store: 'Amazon',
    ...over,
  };
}

// One fixture per deck shape, selected by a substring of the pasted URL.
const FIXTURES: Record<string, Fixture> = {
  longtitle: product({ title: 'L'.repeat(101), price: undefined }),
  warntitle: product({ title: 'W'.repeat(60) }),
  noprice: product({ price: undefined }),
  noimages: product({ imageUrl: undefined, imageUrls: [] }),
  oneimage: product({ imageUrl: IMAGES3[0], imageUrls: [IMAGES3[0]] }),
  clean: product(),
};

async function stubFetch(page: Page) {
  await page.route('**/api/product-fetch', (route) => {
    const url = String(route.request().postDataJSON().url ?? '');
    if (url.includes('fail')) {
      return route.fulfill({ json: { ok: false, error: 'timeout' } });
    }
    const key = Object.keys(FIXTURES).find((k) => url.includes(k)) ?? 'clean';
    return route.fulfill({ json: { ok: true, product: FIXTURES[key] } });
  });
}

async function openDeck(page: Page, url: string) {
  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await page.getByRole('textbox', { name: 'Product link' }).fill(url);
  await page.getByRole('button', { name: 'Fetch Details' }).click();
}

test.beforeEach(async ({ page }) => {
  await stubFetch(page);
});

test('Deck_CleanFetch_IntroPhotoNoteThenCreate', async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E Deck ${stamp}`;
  await page.unroute('**/api/product-fetch');
  await page.route('**/api/product-fetch', (route) =>
    route.fulfill({ json: { ok: true, product: product({ title: name }) } })
  );

  await openDeck(page, 'https://x.test/clean');
  await expect(page.getByText('Auto-filled from Amazon')).toBeVisible();
  await expect(page.getByText("Here's what we pulled.")).toBeVisible();
  // No global skip — only the single forward affordance.
  await expect(
    page.getByRole('button', { name: /straight to preview/i })
  ).toHaveCount(0);

  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(page.getByText('Pick the best photo')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Add a note')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Preview: quantity defaults to 1 in the subtext; create flows through the
  // unchanged action.
  await expect(page.getByText('Last look')).toBeVisible();
  await expect(page.getByText('Not on a list · Qty 1')).toBeVisible();
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  // Cleanup: edit → delete (delete affordance preserved on the edit Preview).
  const card = page.locator('.item-container:not(.preview)', { hasText: name });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.locator('.confirm-dialog-content');
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expect(card).toHaveCount(0);
});

test('Deck_LongTitle_InlineNoteNoStandaloneNoteCard-PriceRequiredNoSkip', async ({
  page,
}) => {
  await openDeck(page, 'https://x.test/longtitle');
  await page.getByRole('button', { name: "Let's go" }).click(); // photo
  await page.getByRole('button', { name: 'Continue' }).click(); // title

  await expect(page.getByText('Give it a clear name')).toBeVisible();
  // The note editor is surfaced inline on the title card.
  await expect(page.getByLabel('Description')).toBeVisible();
  // Over-100 blocks continue until trimmed.
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.getByRole('button', { name: /Tap to use/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click(); // price

  await expect(page.getByText('What does it cost?')).toBeVisible();
  await expect(page.getByRole('button', { name: /^skip/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.getByLabel('Price').fill('15.00');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Straight to Preview — no standalone note card was interposed.
  await expect(page.getByText('Last look')).toBeVisible();
  await expect(
    page.getByText(/Descriptions aren't pulled automatically/)
  ).toHaveCount(0);
});

test('Deck_WarnTitle_KeepItAnywayAdvances', async ({ page }) => {
  await openDeck(page, 'https://x.test/warntitle');
  await page.getByRole('button', { name: "Let's go" }).click(); // photo
  await page.getByRole('button', { name: 'Continue' }).click(); // title
  await expect(
    page.getByRole('button', { name: 'Keep it anyway' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Keep it anyway' }).click();
  await expect(page.getByText('Last look')).toBeVisible();
});

test('Deck_MissingPrice_PriceCardRequiresPrice', async ({ page }) => {
  await openDeck(page, 'https://x.test/noprice');
  await page.getByRole('button', { name: "Let's go" }).click(); // photo
  await page.getByRole('button', { name: 'Continue' }).click(); // price
  await expect(page.getByText('What does it cost?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
});

test('Deck_ZeroImages_ShowsPhotoErrorState', async ({ page }) => {
  await openDeck(page, 'https://x.test/noimages');
  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(page.getByText(/couldn't find any images/)).toBeVisible();
  await expect(page.getByLabel('Add an image by URL')).toBeVisible();
});

test('Deck_SingleImage_BypassesPhotoCard', async ({ page }) => {
  await openDeck(page, 'https://x.test/oneimage');
  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(page.getByText('Pick the best photo')).toHaveCount(0);
  await expect(page.getByText('Add a note')).toBeVisible();
});

test('Deck_FetchFails_TimeoutThenBuildByHandSeedsUrl', async ({ page }) => {
  await openDeck(page, 'https://x.test/fail-link');
  await expect(
    page.getByText('This is taking longer than expected')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Build it by hand' }).click();
  await expect(page.getByText('Last look')).toBeVisible();
  await page.getByRole('button', { name: /Store links/ }).click();
  await expect(page.getByLabel('Link')).toHaveValue('https://x.test/fail-link');
});

test('Deck_RateLimited_StaysOnUrlEntry', async ({ page }) => {
  await page.unroute('**/api/product-fetch');
  await page.route('**/api/product-fetch', (route) =>
    route.fulfill({ status: 429, json: { error: 'rate_limited' } })
  );
  await openDeck(page, 'https://x.test/clean');
  await expect(
    page.getByText("You've hit the fetch limit — try again in about a minute.")
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Product link' })).toHaveValue(
    'https://x.test/clean'
  );
});
