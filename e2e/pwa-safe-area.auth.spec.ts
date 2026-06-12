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
// bottom padding grows by the bottom inset (lifting its controls clear of the
// home indicator) while the overlay box itself stays flush with the
// container's bottom edge — the layout contract items-browser-chrome owns.
test('PwaSafeArea_NonzeroBottomInset_LiftsPaginationPadding', async ({
  page,
}) => {
  await page.goto('/items');
  const pagination = page.locator('.items-pagination');
  await expect(pagination).toBeVisible();

  const paddingBefore = await pagination.evaluate(
    (el) => getComputedStyle(el).paddingBottom
  );

  await setSafeAreaInsets(page, { bottom: BOTTOM_INSET });

  const paddingAfter = await pagination.evaluate(
    (el) => getComputedStyle(el).paddingBottom
  );
  expect(parseFloat(paddingAfter)).toBe(
    parseFloat(paddingBefore) + BOTTOM_INSET
  );

  const flush = await pagination.evaluate((el) => {
    const container = el.closest('.container--items-library');
    if (!container) throw new Error('no .container--items-library ancestor');
    return (
      container.getBoundingClientRect().bottom -
      el.getBoundingClientRect().bottom
    );
  });
  expect(Math.abs(flush)).toBeLessThan(1);
});

// Regression 7cb308f: the html background is the backstop visible through the
// translucent iOS status bar (and below the content in the home-indicator
// zone) even where body backdrops are clipped.
test('PwaSafeArea_LoadRoute_HtmlBackgroundIsAppGradientBase', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    'rgb(37, 25, 78)'
  );
});
