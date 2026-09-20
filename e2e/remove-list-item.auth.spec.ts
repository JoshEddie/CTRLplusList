import { expect, test } from '@playwright/test';
import { createListWithFirstItem } from '../test/helpers/e2e/utils';

// Flow: the owner takes an item off a list from the card's own menu, on the
// ordinary list surface, and the write commits as it is made. Build-own-state:
// create a list, attach one library item, remove it, then prove the unlink
// touched only the association — a reload shows the empty-list CTA while the
// item still exists in /items.
test('ListPage_OwnerRemovesItemViaItemMenu_ItemOffListButInLibrary', async ({
  page,
}) => {
  const chosenItemName = await createListWithFirstItem(
    page,
    `E2E Remove ${Date.now()}`
  );
  const listUrl = page.url();
  const card = page.locator('.item-container', { hasText: chosenItemName });
  await expect(card).toBeVisible();

  const write = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().startsWith(listUrl)
  );
  await card.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Remove from list' }).click();

  // The card holds its place at 0 — the same control that took the item off
  // is what puts it back, so nothing moves out from under the owner.
  await expect(card.getByRole('spinbutton')).toHaveValue('0');

  // Off the list once the surface is re-read: the only attached item is gone,
  // so the empty-list CTA renders behind a fresh server read. The removal is
  // awaited first — the reload's whole point is the server read, which must
  // not race the write.
  await write;
  await page.goto(listUrl);
  // A list holding nothing opens on All items, so the band's own count states
  // the removal before its empty-list door is reached.
  const inListTab = page.getByRole('tab', { name: /^In this list/ });
  await expect(inListTab).toHaveText('In this list · 0');
  await inListTab.click();
  await expect(
    page.getByRole('heading', { name: 'No items on this list yet' })
  ).toBeVisible();

  // Still in the library: the removal deleted the list_items row only.
  await page.goto('/items');
  // 200+ seeded items: search rather than trust the default page's slice.
  await page
    .getByRole('searchbox', { name: 'Search items' })
    .fill(chosenItemName);
  await expect(
    page.locator('.item-container', { hasText: chosenItemName }).first()
  ).toBeVisible();
});
