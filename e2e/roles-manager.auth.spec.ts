import { expect, test, type Page } from '@playwright/test';

import { pinActingProfile } from './helpers/activeProfile';

// Flow: the owner/manager role matrix from the manager's seat — both halves of
// it, because a spec covering only the permission proves nothing about the
// narrowing and one covering only the refusal cannot tell a working floor from
// a broken surface. The refused half reaches the action *past* its disabled
// control and then reloads, since the whole point of the change is that the
// disabled control is not the enforcement.
//
// Item ordering is not driven here. dnd-kit's mouse sensor does not arm under
// Playwright's synthetic input — the drag overlay never mounts, so `onDragStart`
// never fires — and no spec in this suite has ever driven a drag. `updatePriority`
// takes the same `member` floor as the writes below and is covered from dnd-kit's
// own `onDragEnd` in `SortItems.test.tsx`, so the manager seat loses no role
// coverage by leaving the gesture out.
//
// Seed baseline: `dev-test-viewer` holds `manager` on `dev-profile-workshop`
// ("Workshop Profile") and `owner` on `dev-profile-owned` ("Owned Profile").
//
// The manager seat is the Workshop profile rather than "Managed Profile"
// because this spec writes on it and cannot clean up after itself — list and
// item deletion are both owner-floor, which is exactly what it proves a manager
// is refused. "Managed Profile" is simultaneously the never-acted-as ordering
// fixture and the empty-lists fixture `profile-switch.auth.spec.ts` reads, and
// a single write as it consumes both. The Workshop seat exists to carry that
// residue, so no assertion anywhere depends on which file ran first.
const MANAGER_PROFILE = 'dev-profile-workshop';
const OWNED_PROFILE = 'dev-profile-owned';

// The item library's only entry door is the URL-entry step, whose manual
// affordance opens only from the failure screen — so a stubbed failing fetch
// is how an item is built without an outbound request. Mirrors
// `item-crud.auth.spec.ts`; extracted because the reorder step needs two.
async function createItem(page: Page, name: string): Promise<void> {
  await page.goto('/items');
  await page.getByRole('button', { name: 'New Item' }).click();
  await page
    .getByRole('textbox', { name: 'Product link' })
    .fill('https://example.com/e2e-roles');
  await page.getByRole('button', { name: 'Fetch Details' }).click();
  await page.getByRole('button', { name: 'Fill in details manually →' }).click();

  await page.getByRole('button', { name: /Item name/ }).click();
  await page.getByLabel('Item name').fill(name);
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: /^Store / }).click();
  await page.getByLabel('Store name').fill('E2E Store');
  await page.getByRole('button', { name: 'Done' }).click();

  await page
    .locator('.deck-triage-rows')
    .getByRole('button', { name: /^Price/ })
    .click();
  await page.getByLabel('Price', { exact: true }).fill('12.00');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: /^Photo/ }).click();
  await page.getByRole('button', { name: 'Done' }).click();

  // Acting as a managed profile the deck names the profile on its submit, so
  // the plain "Create Item" toolbar button is not the one to press.
  await page
    .getByRole('button', { name: 'Create item for Workshop Profile' })
    .click();
  await expect(page.getByText('Item created successfully')).toBeVisible();
}

test('RolesManager_ManagerCreatesItemsAttachesAndArchives_EachStepReflected', async ({
  page,
  context,
  baseURL,
}) => {
  await pinActingProfile(context, MANAGER_PROFILE, baseURL!);
  await page.route('**/api/product-fetch', (route) =>
    route.fulfill({ json: { ok: false, error: 'fetch_failed' } })
  );

  const stamp = Date.now();
  const firstItem = `E2E Manager ${stamp}A`;
  const secondItem = `E2E Manager ${stamp}B`;
  const listName = `E2E Manager List ${stamp}`;

  // Create items — `member` floor.
  await createItem(page, firstItem);
  await createItem(page, secondItem);

  // Edit one of them — `member` floor.
  const renamed = `E2E Manager ${stamp}A2`;
  await page
    .locator('.item-container:not(.preview)', { hasText: firstItem })
    .getByRole('button', { name: 'Item actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('button', { name: /Need to change something/ }).click();
  await page.getByRole('button', { name: /Item name/ }).click();
  await page.getByLabel('Item name').fill(renamed);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: /Back to preview/ }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Item updated successfully')).toBeVisible();

  // Create a list and attach both items — `member` floor on both writes.
  await page.goto('/lists');
  await page.getByRole('button', { name: 'New List' }).first().click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(listName);
  await page
    .getByRole('textbox', { name: 'Date', exact: true })
    .fill('2030-06-01');
  await page.getByRole('button', { name: 'Create List' }).click();
  await expect(page).toHaveURL(/\/lists\/[^/]+\/choose-items\?new=1$/);
  const listId = page.url().match(/\/lists\/([^/]+)\/choose-items/)?.[1];

  const rows = page.locator('ul.choose-items-list li');
  await rows.filter({ hasText: renamed }).getByRole('checkbox').check();
  await rows.filter({ hasText: secondItem }).getByRole('checkbox').check();
  await page.getByRole('button', { name: /Add 2 items to list/ }).click();
  await expect(page).toHaveURL(new RegExp(`/lists/${listId}$`));

  // The attach lands the viewer on the list page before its rows have
  // streamed in, so both are awaited before the flow moves on.
  await expect(page.locator('.sortable-item')).toHaveCount(2);

  // Archive — `member` floor: it destroys nothing and the item stays attached.
  await page.goto('/items');
  const renamedCard = page.locator('.item-container:not(.preview)', {
    hasText: renamed,
  });
  await renamedCard.getByRole('button', { name: 'Item actions' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(renamedCard).toHaveCount(0);
  await page.getByRole('tab', { name: /^Archived/ }).click();
  await expect(renamedCard).toBeVisible();
});

test('RolesManager_ManagerOpensAListTheyManage_VisibilityPillDisabledAndUnchanged', async ({
  page,
  context,
  baseURL,
}) => {
  await pinActingProfile(context, MANAGER_PROFILE, baseURL!);

  // Its own fixture rather than the previous test's residue: creating a list is
  // a `member`-floor write this seat holds, and a test that reads another
  // test's leftovers cannot be run or retried alone.
  const listName = `E2E Visibility List ${Date.now()}`;
  await page.goto('/lists');
  await page.getByRole('button', { name: 'New List' }).first().click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(listName);
  await page
    .getByRole('textbox', { name: 'Date', exact: true })
    .fill('2030-06-01');
  await page.getByRole('button', { name: 'Create List' }).click();
  await expect(page).toHaveURL(/\/lists\/[^/]+\/choose-items\?new=1$/);
  const listId = page.url().match(/\/lists\/([^/]+)\/choose-items/)?.[1];
  await page.goto(`/lists/${listId}`);

  const pill = page.getByRole('button', { name: /Visibility:/ });
  // Disabled, not omitted: the surface states the capability exists.
  await expect(pill).toBeVisible();
  await expect(pill).toBeDisabled();

  // Nothing to press: the control guards its own handler, so a browser cannot
  // reach the action past it. That the server and not the control is the
  // enforcement is pinned in the unit coverage of the gate's floor; what a
  // reload proves here is that the surface wrote nothing on the way.
  await expect(page.getByRole('menuitemradio', { name: 'Shared' })).toHaveCount(
    0
  );

  await page.reload();
  await expect(
    page.getByRole('button', { name: /Visibility: Hidden/ })
  ).toBeDisabled();
});

test('RolesManager_ManagerOpensTheProfileSpace_SettingsRenderPresentAndDisabled', async ({
  page,
}) => {
  // No pin: a profile's space authorizes on the profile the request *names*,
  // so the manager's view of it is reached without switching to it.
  await page.goto(`/altvatar/${MANAGER_PROFILE}`);

  // The invite control lives in the identity header, above the tab strip.
  await expect(
    page.getByRole('button', { name: 'Invite someone' })
  ).toHaveAttribute('aria-disabled', 'true');
  await expect(
    page.getByRole('button', { name: 'Edit Altvatar' })
  ).toBeDisabled();

  // Settings is the first panel, so its fields are already exposed.
  await expect(page.getByRole('textbox', { name: 'Name' })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Save Changes' })
  ).toBeDisabled();
});

test('RolesOwner_OwnerOpensTheEquivalentSurface_AffordancesOperable', async ({
  page,
}) => {
  await page.goto(`/altvatar/${OWNED_PROFILE}`);

  await expect(page.getByRole('button', { name: 'Edit Altvatar' })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Invite someone' })
  ).not.toHaveAttribute('aria-disabled', 'true');

  // Settings is the space's first panel, so its fields are already exposed.
  const nameField = page.getByRole('textbox', { name: 'Name' });
  await expect(nameField).toBeEnabled();
  // The submit is inert until a field is dirty, so an owner's operable state is
  // proved by editing rather than by the control's resting one. Nothing is
  // submitted, so the profile is left as the seed wrote it.
  await nameField.fill('Owned Profile edited');
  await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();

  // The roster's own controls are operable for an owner. Alice holds `manager`
  // on this profile per the seed, so a row other than the viewer's own is there
  // to carry one. At this viewport they are the row's discrete controls.
  await page.getByRole('tab', { name: 'Permissions' }).click();
  const aliceRow = page
    .locator('.member-row')
    .filter({ hasText: 'Alice Example' });
  await expect(
    aliceRow.getByRole('button', { name: 'Remove Alice Example' })
  ).toBeEnabled();
  await aliceRow.getByRole('button', { name: 'Change role' }).click();
  await expect(
    page.getByRole('menuitemradio', { name: 'Owner' })
  ).not.toHaveAttribute('aria-disabled', 'true');
});
