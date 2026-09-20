import { expect, test, type Page } from '@playwright/test';

// The only place this can be covered. The hero's collapse is decided by
// comparing live rects across scroll events, and jsdom has no layout — the
// unit suite can prove a navigation asked not to scroll, but only a browser
// proves the page then held still.
//
// The regression: opening the claim sheet writes a parameter onto the page
// already on screen, and Next returns a push or replace to the top of that
// page unless told otherwise. Arriving at the pin is what the hero reads as a
// reason to expand, so the reported symptom — the hero springing open — was
// the tail of a scroll the reader never asked for. Every control that writes
// the URL as this page's own state is the same defect; the two here are the
// ones a reader reaches while the hero is collapsed.
//
// Read-only against the seed: the roster is opened and the tier is raised for
// one page view, neither of which writes a row, so `dev-list-owned-wishlist`
// is left as `claim-roster.auth.spec` and `member-baseline.auth.spec` find it.

const LIST = '/lists/dev-list-owned-wishlist';
const PHONE = { width: 390, height: 844 };

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const hero = (page: Page) => page.locator('.list-hero-chrome');

// Re-wheels on every poll: a wheel is a one-shot, and hydration restores the
// scroll position, so a single tick landing before the route hydrates is
// silently undone and never retried.
//
// Returns only once the offset has stopped moving. The class flips at the
// start of the collapse, while the wheel that tipped it is still settling —
// and a menu opened on a page that is still scrolling dismisses itself on the
// next tick.
async function collapseHero(page: Page): Promise<number> {
  await expect
    .poll(async () => {
      await page.mouse.wheel(0, 240);
      return hero(page).getAttribute('class');
    })
    .toContain('is-collapsed');

  let previous = -1;
  await expect
    .poll(async () => {
      const now = await scrollY(page);
      const held = now === previous;
      previous = now;
      return held;
    })
    .toBe(true);

  expect(previous).toBeGreaterThan(0);
  return previous;
}

// The banner already on screen. Playwright scrolls a target into view before
// clicking it, which would undo the very scroll under test, so the target is
// chosen from what the collapsed hero has left visible.
async function bannerInView(page: Page) {
  const banners = page.locator('button.purchased-banner');
  const viewport = page.viewportSize() as { height: number };
  const pinned = (await hero(page).boundingBox()) as {
    y: number;
    height: number;
  };
  const floor = pinned.y + pinned.height;

  for (let i = 0; i < (await banners.count()); i++) {
    const box = await banners.nth(i).boundingBox();
    if (box && box.y > floor && box.y + box.height < viewport.height) {
      return banners.nth(i);
    }
  }
  throw new Error('no claim banner left in view below the pinned hero');
}

test('ClaimSheet_MemberOpensItBelowACollapsedHero_LeavesThePageWhereItWas', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto(LIST);
  const settled = await collapseHero(page);

  await (await bannerInView(page)).click();
  await expect(page.locator('.claim-modal')).toBeVisible();

  // Two witnesses to one scroll: the offset itself, and the class the hero
  // writes when a scroll event puts it back at the pin.
  expect(await scrollY(page)).toBe(settled);
  await expect(hero(page)).toHaveClass(/is-collapsed/);

  // Closing is the same navigation in reverse, and held the page just as badly.
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.claim-modal')).toBeHidden();

  expect(await scrollY(page)).toBe(settled);
  await expect(hero(page)).toHaveClass(/is-collapsed/);
});

test('HeroSpoilers_MemberChangesTierFromTheCollapsedKebab_LeavesThePageWhereItWas', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto(LIST);
  const settled = await collapseHero(page);

  // The kebab is the collapsed strip's own control, so it is on screen by
  // definition — the tier rows hoist into it while the hero tile is away.
  await page.getByRole('button', { name: 'List actions' }).click();
  await page.getByRole('menuitemradio', { name: 'Keep it a surprise' }).click();

  await expect(page).toHaveURL(/spoiler=surprise/);
  expect(await scrollY(page)).toBe(settled);
  await expect(hero(page)).toHaveClass(/is-collapsed/);
});
