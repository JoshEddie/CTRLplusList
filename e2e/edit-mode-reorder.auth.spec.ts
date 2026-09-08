import { expect, test } from '@playwright/test';
import { createListWithFirstItem } from '../test/helpers/e2e/utils';

// One session through edit mode: add from the library, raise a quantity,
// reorder, remove a saved entry, then Save once. Nothing is written before
// Save, and what the list page renders afterwards is a fresh server read — so
// every value that shows up there proves the write's narrow tag fired as well
// as the write.
test('EditMode_OwnerStagesAddQuantityReorderAndRemoval_OneSavePersistsAll', async ({
  page,
}) => {
  const listName = `Session ${Date.now()}`;
  const firstItem = await createListWithFirstItem(page, listName);
  const listId = page.url().match(/\/lists\/([^/?]+)$/)?.[1];
  expect(listId).toBeTruthy();

  // The default view reorders one entry at a time through the card menu, never
  // by drag: the handle belongs to the staged session below.
  const firstCard = page.locator('.item-container', { hasText: firstItem });
  await expect(firstCard).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Drag to reorder/ })
  ).toHaveCount(0);

  // The hero carries no door into the staged session; its own URL is the way
  // in.
  await page.goto(`/lists/${listId}?edit=1`);
  const inListTab = page.getByRole('tab', { name: /^In this list/ });
  const addTab = page.getByRole('tab', { name: /^Add items/ });
  await expect(inListTab).toHaveText('In this list · 1');
  await expect(inListTab).toHaveAttribute('aria-selected', 'true');

  // The library shows the entry already on the list rather than hiding it,
  // and two more cards go on — each marked where it stands.
  await addTab.click();
  const cards = page.locator('.edit-mode-library .item');
  await expect(cards.first().locator('.item-entry-line')).toHaveText(
    'On this list'
  );
  const secondCard = cards.nth(1);
  const thirdCard = cards.nth(2);
  const secondItem = (await secondCard.locator('.itemName').innerText()).trim();
  const thirdItem = (await thirdCard.locator('.itemName').innerText()).trim();
  await secondCard.getByRole('button', { name: 'Increase' }).click();
  await thirdCard.getByRole('button', { name: 'Increase' }).click();
  await expect(secondCard.locator('.item-entry-line')).toHaveText('Added');
  await expect(inListTab).toHaveText('In this list · 3');

  // Back on the list, the new rows sit at the end; the second asks for four.
  // The jump end lands on the ceiling the schema enforces, and stepping down
  // from it proves it is a control rather than a bare number field.
  await inListTab.click();
  const inList = page.getByRole('tabpanel', { name: /^In this list/ });
  const rowNames = inList.locator('.edit-mode-row-name-static');
  await expect(rowNames).toHaveText([firstItem, secondItem, thirdItem]);
  const rowFor = (name: string) =>
    inList.locator('li.edit-mode-item').filter({ hasText: name });
  await rowFor(secondItem)
    .getByRole('button', { name: 'Set to maximum, 99' })
    .click();
  await expect(rowFor(secondItem).getByRole('spinbutton')).toHaveValue('99');
  await rowFor(secondItem).getByRole('spinbutton').fill('4');

  // Drag the third row up one with the keyboard: only it carries the dot.
  // Each key waits for dnd-kit's own announcement of the step before it: the
  // sensor reads the row's rect on the first arrow press, and that rect lands
  // a render after the handle reports itself pressed — the render that first
  // announces the row as over something (itself, to begin with).
  await rowFor(thirdItem)
    .getByRole('button', { name: 'Drag to reorder' })
    .focus();
  const dragStatus = page.locator('[id^="DndLiveRegion"]');
  await page.keyboard.press('Space');
  await expect(dragStatus).toContainText(/was moved over/);
  const pickedUp = await dragStatus.innerText();
  await page.keyboard.press('ArrowUp');
  await expect(dragStatus).not.toHaveText(pickedUp);
  await page.keyboard.press('Space');
  await expect(rowNames).toHaveText([firstItem, thirdItem, secondItem]);
  await expect(
    rowFor(firstItem).getByRole('img', { name: 'Unsaved change' })
  ).toHaveCount(0);
  await expect(
    rowFor(thirdItem).getByRole('img', { name: 'Unsaved change' })
  ).toBeVisible();

  // Zero is the removal, and the saved entry stays where it was, struck
  // through, rather than vanishing from under the finger.
  await rowFor(firstItem).getByRole('button', { name: 'Decrease' }).click();
  await expect(rowNames).toHaveText([firstItem, thirdItem, secondItem]);
  await expect(rowFor(firstItem)).toHaveClass(/is-removed/);
  await expect(rowFor(firstItem).getByText('Removed')).toBeVisible();
  await expect(inListTab).toHaveText('In this list · 2');
  await expect(page.locator('.edit-mode-count')).toHaveText('3 changes');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByText('2 added and 1 removed', { exact: false })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(new RegExp(`/lists/${listId}$`));

  // A fresh navigation reads the saved state: order, membership and quantity.
  // Read at `?spoiler=claims`, which only ever raises, so the entry's ask is
  // stated as a count whatever baseline this profile is carrying.
  await page.goto(`/lists/${listId}?spoiler=claims`);
  await expect(page.locator('.items-browser .itemName')).toHaveText([
    thirdItem,
    secondItem,
  ]);
  await expect(
    page
      .locator('.item-container', { hasText: secondItem })
      .locator('.purchased-banner')
  ).toHaveText('0 / 4 Claimed');
  await expect(
    page.locator('.item-container', { hasText: firstItem })
  ).toHaveCount(0);

  // Off the list is not out of the library: the removed item still exists.
  await page.goto('/items');
  await page.getByRole('searchbox', { name: 'Search items' }).fill(firstItem);
  await expect(
    page.locator('.item-container', { hasText: firstItem }).first()
  ).toBeVisible();
});
