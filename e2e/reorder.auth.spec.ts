import { expect, test, type Locator, type Page } from '@playwright/test';

// Flow: the owner arranges their list on the Reorder tab. Build-own-state — a
// fresh list carrying several library items, so no seeded list's positions are
// disturbed and no other spec's fixture moves under it. The `.list-hero-chrome`
// / `.reorder-item` class hooks select the FIXTURE; every assertion about what
// the owner can do targets a real affordance.

// Short as well as narrow: the reorder surface is one row per entry, so a
// taller viewport leaves too little below the fold for the hero's own
// collapse heuristic to have anything to react to.
const PHONE = { width: 390, height: 400 };

async function createListWith(page: Page, name: string, count: number) {
  await page.goto('/lists');
  await page.getByRole('button', { name: 'New List' }).first().click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await page
    .getByRole('textbox', { name: 'Date', exact: true })
    .fill('2030-06-01');
  await page.getByRole('button', { name: 'Create List' }).click();
  await expect(page).toHaveURL(/\/lists\/[^/?]+$/);

  // A new list opens on All items, so each library card is one press from the
  // list. The write commits as it is made; the entry count on the other tab is
  // what says it landed, and waiting on it keeps the presses from racing.
  const names: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const card = page.locator('.item-container').nth(index);
    names.push((await card.locator('.itemName').innerText()).trim());
    await card.getByRole('button', { name: 'Increase' }).click();
    await expect(page.getByRole('tab', { name: /^In this list/ })).toHaveText(
      `In this list · ${index + 1}`
    );
  }
  return names;
}

const rowNames = (page: Page) =>
  page.locator('.reorder-item .reorder-row-name').allInnerTexts();

// Below the breakpoint the band's strip collapses to the selected tab, which
// is also the control that reveals the rest — so reaching another tab there is
// two presses, exactly as it is for the owner.
async function selectTab(page: Page, name: string | RegExp) {
  const tab = page.getByRole('tab', { name });
  if ((await tab.count()) === 0) {
    await page
      .locator('.list-owner-tabs [role="tab"][aria-selected="true"]')
      .click();
  }
  await tab.click();
}

const openReorder = (page: Page) => selectTab(page, 'Reorder');

const hero = (page: Page) => page.locator('.list-hero-chrome');

// The chrome collapses on sustained downward travel, so the scroll is nudged
// until it does rather than guessed at in one jump.
async function collapseHero(page: Page) {
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollBy(0, 120));
      return (await hero(page).getAttribute('class')) ?? '';
    })
    .toContain('is-collapsed');
}

// The list is built at the default size — the New List door is a desktop
// affordance — and the hero's own behaviour is then read at phone width, where
// the page is tall enough to collapse it.
async function onPhone(page: Page) {
  const listUrl = page.url();
  await page.setViewportSize(PHONE);
  await page.goto(listUrl);
  await expect(page.locator('.list-owner-tabs')).toBeVisible();
}

// dnd-kit's mouse sensor waits for 10px of travel before a drag begins, so the
// press is followed by a nudge and then the journey to the target.
async function dragOnto(page: Page, handle: Locator, target: Locator) {
  const from = await handle.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('reorder rows are not laid out');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 20);
  await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
}

test('ListReorder_OwnerDragsARowAndReloads_ShowsTheNewOrderWithNoSaveStep', async ({
  page,
}) => {
  const names = await createListWith(page, `E2E Reorder ${Date.now()}`, 3);
  const listUrl = page.url();

  await openReorder(page);
  expect(await rowNames(page)).toEqual(names);

  // The write is what the reload reads back, so the reload waits on its round
  // trip rather than on the optimistic order already on screen.
  const write = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().startsWith(listUrl)
  );
  const rows = page.locator('.reorder-item');
  await dragOnto(
    page,
    rows.nth(0).getByRole('button', { name: /^Drag / }),
    rows.nth(2)
  );
  const moved = [names[1], names[2], names[0]];
  expect(await rowNames(page)).toEqual(moved);
  await write;

  // No Save: the mode's only exit commits nothing.
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();

  await page.goto(listUrl);
  await openReorder(page);
  expect(await rowNames(page)).toEqual(moved);
});

test('ListReorder_OwnerMovesARowWithTheArrows_HoldsWithoutAGesture', async ({
  page,
}) => {
  const names = await createListWith(page, `E2E Arrows ${Date.now()}`, 3);
  const listUrl = page.url();

  await openReorder(page);
  const write = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().startsWith(listUrl)
  );
  await page.getByRole('button', { name: `Move ${names[2]} up` }).click();
  const moved = [names[0], names[2], names[1]];
  expect(await rowNames(page)).toEqual(moved);
  await write;

  await page.goto(listUrl);
  await openReorder(page);
  expect(await rowNames(page)).toEqual(moved);
});

// The tab never forces a state on the hero: it is left to the same scroll
// heuristic that runs everywhere else. Forcing it collapsed on selection would
// jump the page unprompted and leave a collapsed header sitting at scroll-top —
// a pairing the heuristic never reaches on its own, and the one thing the
// assertion below rules out on both sides of the switch.
test('ListReorder_OwnerSelectsTheTab_LeavesTheHerosStateAlone', async ({
  page,
}) => {
  await createListWith(page, `E2E Hero Tab ${Date.now()}`, 6);
  await onPhone(page);

  await expect(hero(page)).not.toHaveClass(/is-collapsed/);
  await openReorder(page);
  await expect(hero(page)).not.toHaveClass(/is-collapsed/);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  // Coming in collapsed, the header is left to the scroll it is reacting to.
  // Whether the shorter surface returns the page to the top depends on how far
  // down it was; what must never survive the switch is the pairing the tab
  // would create if it forced the state — collapsed, at scroll-top.
  await selectTab(page, /^In this list/);
  await collapseHero(page);
  await openReorder(page);
  const [collapsed, atTop] = await Promise.all([
    hero(page)
      .getAttribute('class')
      .then((c) => !!c?.includes('is-collapsed')),
    page.evaluate(() => window.scrollY === 0),
  ]);
  expect(collapsed && atTop).toBe(false);
});

// The chrome expands again after sustained upward travel, and a drag toward the
// top of the list produces exactly that through the drag library's auto-scroll.
test('ListReorder_HeroDuringADrag_HoldsTheStateItWasAlreadyIn', async ({
  page,
}) => {
  await createListWith(page, `E2E Hero Drag ${Date.now()}`, 6);
  await onPhone(page);

  await openReorder(page);
  // The rows are what make the page long enough to scroll at all.
  await expect(page.locator('.reorder-item').first()).toBeVisible();
  await collapseHero(page);

  // A handle the pointer can actually reach: the viewport is short, so most
  // rows sit below the fold and a press aimed there never lands.
  const handles = await page
    .locator('.reorder-item')
    .getByRole('button', { name: /^Drag / })
    .all();
  const boxes = await Promise.all(handles.map((h) => h.boundingBox()));
  const box = boxes.find((b) => b && b.y > 150 && b.y < 340);
  if (!box) throw new Error('no reorder handle is in view');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 20);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(hero(page)).toHaveClass(/is-collapsed/);

  await page.mouse.up();
});
