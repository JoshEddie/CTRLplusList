import { expect, test, type Page } from '@playwright/test';

// Regression-informed safe-area / top-bar set (fixes 4f2225d, 7cb308f,
// 4f3a7b0→dae2301, 8b038fc): under viewport-fit=cover the app must keep its
// chrome clear of the notch and home-indicator zones. Desktop Chromium
// resolves env(safe-area-inset-*) to 0px, so each spec produces a real inset
// via the CDP Emulation.setSafeAreaInsetsOverride and asserts the computed
// styles respond — render-level, not stylesheet-text.

const TOP_INSET = 47;
const BOTTOM_INSET = 34;

async function setSafeAreaInsets(
  page: Page,
  insets: { top?: number; bottom?: number }
) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
}

function navMetrics(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector('.app-nav');
    if (!nav) throw new Error('no .app-nav');
    const style = getComputedStyle(nav);
    return {
      paddingTop: style.paddingTop,
      height: nav.getBoundingClientRect().height,
    };
  });
}

// Regressions 4f2225d (nav under the notch) + 8b038fc (toasts under the
// status bar): a nonzero top inset grows the nav's padding/height and pushes
// the toast container down by the same amount. The toast container renders
// with zero live toasts, located by its inline env() style.
test('PwaSafeArea_NonzeroTopInset_GrowsNavAndToastOffset', async ({ page }) => {
  await page.goto('/');
  const toaster = page.locator('div[style*="safe-area-inset-top"]');

  const navBefore = await navMetrics(page);
  expect(navBefore.paddingTop).toBe('0px');
  await expect(toaster).toHaveCSS('top', '16px');

  await setSafeAreaInsets(page, { top: TOP_INSET });

  const navAfter = await navMetrics(page);
  expect(navAfter.paddingTop).toBe(`${TOP_INSET}px`);
  expect(navAfter.height).toBe(navBefore.height + TOP_INSET);
  await expect(toaster).toHaveCSS('top', `${16 + TOP_INSET}px`);
});

// Regressions 7cb308f / 4f3a7b0→dae2301: the floating pagination overlay's
// bottom padding is the greater of its own 12px and the bottom inset — the
// inset already IS the clearance the home indicator needs, so adding to it
// over-pads. While the page has scroll overflow the sticky bar pins flush
// to the viewport's bottom edge — the layout contract items-browser-chrome
// owns.
const PAGINATION_PADDING_FLOOR = 12;

test('PwaSafeArea_NonzeroBottomInset_LiftsPaginationPadding', async ({
  page,
}) => {
  // Short viewport so the seeded grid overflows and the sticky bar pins.
  await page.setViewportSize({ width: 390, height: 400 });
  await page.goto('/items');
  const pagination = page.locator('.items-pagination');
  await expect(pagination).toBeVisible();

  const paddingBottom = () =>
    pagination.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));

  expect(await paddingBottom()).toBe(PAGINATION_PADDING_FLOOR);

  await setSafeAreaInsets(page, { bottom: BOTTOM_INSET });

  expect(BOTTOM_INSET).toBeGreaterThan(PAGINATION_PADDING_FLOOR);
  expect(await paddingBottom()).toBe(BOTTOM_INSET);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  expect(overflow).toBeGreaterThan(0);

  const flush = await pagination.evaluate(
    (el) => window.innerHeight - el.getBoundingClientRect().bottom
  );
  expect(Math.abs(flush)).toBeLessThan(1);
});

// The app frame has exactly one scroll container: the document. `body` used
// to be a fixed-height scroller of its own, which in iOS standalone sizes
// against a viewport that disagrees with the layout viewport — the frame
// renders too tall and the page gains phantom scroll travel. Asserted at the
// render level: the window scrolls and `body` has nothing to scroll.
test('AppFrame_ScrollLongPage_DocumentIsTheOnlyScroller', async ({ page }) => {
  // Short viewport so any seeded content overflows it — the assertion is
  // about which box owns the scroll, not about how much there is to scroll.
  await page.setViewportSize({ width: 390, height: 400 });
  await page.goto('/');
  // The rails stream in after the surface paints; the page is only long
  // enough to scroll once they have.
  await expect(page.getByRole('heading', { name: 'Bookmarks' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  expect(overflow).toBeGreaterThan(200);

  await page.evaluate(() => window.scrollBy(0, 200));
  expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(200);
  expect(await page.evaluate(() => document.body.scrollTop)).toBe(0);
  expect(
    await page.evaluate(
      () => document.body.scrollHeight - document.body.clientHeight
    )
  ).toBe(0);
  // The observable consequence: the nav pins to the viewport. It stops
  // pinning the moment any ancestor between it and the viewport becomes a
  // scroll container of its own.
  expect(
    await page.evaluate(() =>
      Math.round(document.querySelector('.app-nav')!.getBoundingClientRect().top)
    )
  ).toBe(0);
});

// iOS tap-to-top drives document.scrollingElement only, so the gesture works
// on a route iff the document owns the scroll. The two converted container
// recipes (items-library, list-collections) used to clamp to viewport height
// and scroll an inner div — these specs pin the document-flow model: window
// scrolls, the old inner scrollers own nothing, and the pinned chrome sticks
// below the nav.
const DOCUMENT_FLOW_ROUTES = [
  {
    name: 'ItemsLibrary',
    path: '/items',
    grid: '.item-grid-container',
    chrome: '.pinned-page-chrome',
  },
  {
    name: 'ListCollections',
    path: '/lists',
    grid: '.list-card-grid',
    chrome: '.list-collections-nav',
  },
];

for (const { name, path, grid, chrome } of DOCUMENT_FLOW_ROUTES) {
  test(`${name}_ScrollPage_DocumentIsTheOnlyScroller`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 400 });
    await page.goto(path);
    await expect(page.locator(grid)).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );
    expect(overflow).toBeGreaterThan(200);

    await page.evaluate(() => window.scrollBy(0, 200));
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(200);
    expect(
      await page.evaluate((selector) => {
        const el = document.querySelector(selector)!;
        return el.scrollHeight - el.clientHeight;
      }, grid)
    ).toBe(0);

    // Computed `top` resolves the sticky offset's calc()/env() chain to px,
    // and the nav is fixed at 0, so the pinned rect must land on it.
    const pinned = await page.evaluate((selector) => {
      const el = document.querySelector(selector)!;
      return {
        top: el.getBoundingClientRect().top,
        stickyTop: parseFloat(getComputedStyle(el).top),
      };
    }, chrome);
    expect(Math.abs(pinned.top - pinned.stickyTop)).toBeLessThan(1);
  });
}

// Regression 7cb308f: html paints the canvas, so it is the backstop behind
// every gutter the frame does not cover — the surface bleed, the
// home-indicator zone, and the overscroll area iOS rubber-bands into. It
// matches the manifest theme_color so the seam is invisible.
test('PwaSafeArea_LoadRoute_HtmlBackgroundMatchesThemeColor', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    'rgb(5, 21, 93)'
  );
});
