import { expect, test, type Page } from '@playwright/test';
import { deleteItem } from '../test/helpers/e2e/utils';

// Flow: the post-fetch Decision Deck (item-decision-deck). /api/product-fetch is
// ALWAYS stubbed via route interception keyed on the pasted URL, so each deck
// shape is driven by a distinct fixture — e2e never makes a real outbound fetch
// and never burns Zyte quota (ZYTE_API_KEY is unset in e2e regardless). The
// success arc ends with the created item deleted — zero residue.

// Real, loadable ≥200px images served from a stubbed http host so the deck's
// fetch-time size pruning keeps them — fake .jpg URLs would 404 and get pruned
// away, and data: URIs are no longer valid candidates (server validation only
// admits the placeholder-art URI shape). stubFetch routes the host below.
const img = (hex: string) => `https://imgstub.example/${hex}.svg`;
const IMAGES3 = [img('1d3557'), img('457b9d'), img('a8dadc')];
const svgBody = (hex: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#${hex}"/></svg>`;

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
  await page.route('https://imgstub.example/**', (route) => {
    const hex = route.request().url().split('/').pop()!.replace('.svg', '');
    return route.fulfill({ contentType: 'image/svg+xml', body: svgBody(hex) });
  });
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

  // Preview: the Lists row reads the empty membership; create flows through
  // the unchanged action.
  await expect(page.getByText('Last look')).toBeVisible();
  await expect(page.getByText('Not on a list')).toBeVisible();
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText('Item created successfully')).toBeVisible();
  // The form modal closes itself on successful create.

  // The created item is on the page, then cleaned up — zero residue.
  await expect(
    page.locator('.item-container:not(.preview)', { hasText: name })
  ).toBeVisible();
  await deleteItem(page, name);
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
  await page.getByLabel('Price', { exact: true }).fill('15.00');
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

test('Deck_ZeroImages_SeedsAllPlaceholderStrip', async ({ page }) => {
  await openDeck(page, 'https://x.test/noimages');
  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(
    page.getByRole('heading', { name: 'Pick some art' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Use artwork/ })).toHaveCount(
    4
  );
  await expect(page.getByLabel('Add an image by URL')).toBeVisible();
});

test('Deck_SingleImage_StillShowsPhotoCardPreSelected', async ({ page }) => {
  await openDeck(page, 'https://x.test/oneimage');
  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(page.getByText('Pick the best photo')).toBeVisible();
  // One real thumb pre-selected plus three placeholder thumbs.
  await expect(
    page.getByRole('button', { name: 'Use image 1' })
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Use artwork/ })).toHaveCount(
    3
  );
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Add a note')).toBeVisible();
});

test('Deck_FetchFails_TimeoutThenManualEntrySeedsUrl', async ({ page }) => {
  await openDeck(page, 'https://x.test/fail-link');
  await expect(
    page.getByText('This is taking longer than expected')
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Fill in details manually →' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Add the details' })
  ).toBeVisible();
  await page.getByRole('button', { name: /^Store / }).click();
  await expect(page.getByLabel('Link')).toHaveValue('https://x.test/fail-link');
});

test('Deck_TrackerBackNav_JumpsToDoneStepWithDataIntact', async ({ page }) => {
  // Clean fetch: title and price enter done; the deck opens on photo with
  // done tracker nodes behind it.
  await openDeck(page, 'https://x.test/clean');
  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(page.getByText('Pick the best photo')).toBeVisible();
  await page.getByRole('button', { name: 'Go back to The Name' }).click();
  await expect(page.getByText('Give it a clear name')).toBeVisible();
  await expect(page.getByLabel('Item name')).toHaveValue('Cast Iron Skillet');
  // The frontier node returns to the working step.
  await page.getByRole('button', { name: 'Go to The Photo' }).click();
  await expect(page.getByText('Pick the best photo')).toBeVisible();
});

// The primary action must be reachable at every viewport — pinned footer on
// tall screens; in the <500px-height collapse the footer scrolls with the
// single root scroller, so reachable means scroll-to, not always-on-screen.
const VIEWPORTS = {
  Desktop: { width: 1280, height: 720 },
  PortraitPhone: { width: 390, height: 844 },
  ShortLandscape: { width: 932, height: 430 },
} as const;

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`${label}`, () => {
    test.use({ viewport });

    test(`Deck_${label}_ContinueAndSubmitReachable`, async ({ page }) => {
      // longtitle drives the tallest screen (error banner + trim chip +
      // inline description on the title card).
      await openDeck(page, 'https://x.test/longtitle');
      await page.getByRole('button', { name: "Let's go" }).click(); // photo
      const continueBtn = page.getByRole('button', { name: 'Continue' });
      await continueBtn.scrollIntoViewIfNeeded();
      await expect(continueBtn).toBeInViewport();
      await continueBtn.click(); // title

      await expect(page.getByText('Give it a clear name')).toBeVisible();
      // Overflowing well content is reachable by scrolling…
      await page.getByLabel('Description').scrollIntoViewIfNeeded();
      await expect(page.getByLabel('Description')).toBeInViewport();
      // …and so is the footer action.
      await continueBtn.scrollIntoViewIfNeeded();
      await expect(continueBtn).toBeInViewport();

      await page.getByRole('button', { name: /Tap to use/ }).click();
      await page.getByRole('button', { name: 'Continue' }).click(); // price
      await page.getByLabel('Price', { exact: true }).fill('15.00');
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page.getByText('Last look')).toBeVisible();
      const createBtn = page.getByRole('button', { name: 'Create item' });
      await createBtn.scrollIntoViewIfNeeded();
      await expect(createBtn).toBeInViewport();
    });
  });
}

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
