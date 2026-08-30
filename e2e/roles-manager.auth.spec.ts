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
// Seed baseline: `dev-test-viewer` holds `manager` on `dev-profile-managed`
// ("Managed Profile") and `owner` on `dev-profile-owned` ("Owned Profile"), so
// both seats exist without new seed rows.
//
// RESIDUE (contained, documented for future spec authors): the permitted half
// creates a list and two items on "Managed Profile" and cannot clean them up —
// list deletion and item deletion are both owner-floor, which is precisely
// what this spec proves a manager is refused. Two consequences:
//   * `profile-switch.auth.spec.ts` asserts "Managed Profile" has NO lists.
//     The suite runs single-worker in filename order, and `roles-manager`
//     sorts after `profile-switch`, so that assertion still meets an empty
//     profile. A rename that reorders the two breaks it.
//   * A write as "Managed Profile" stamps that membership's last-acted-as,
//     consuming the NULL ordering fixture `profile-switch.auth.spec.ts`
//     documents. `npm run test:e2e` wipes and reseeds before every run, so the
//     fixture is restored each time; a bare `npx playwright test` re-run
//     against the same database is what would see it consumed.
const MANAGED_PROFILE = 'dev-profile-managed';
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
    .getByRole('button', { name: 'Create item for Managed Profile' })
    .click();
  await expect(page.getByText('Item created successfully')).toBeVisible();
}

test('RolesManager_ManagerCreatesItemsAttachesAndArchives_EachStepReflected', async ({
  page,
  context,
  baseURL,
}) => {
  await pinActingProfile(context, MANAGED_PROFILE, baseURL!);
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
  await pinActingProfile(context, MANAGED_PROFILE, baseURL!);

  // The list the permitted half left behind — this spec's own residue is the
  // fixture, so no seed row is owed for an owner-floor target.
  await page.goto('/lists');
  const listLink = page
    .getByRole('link', { name: /E2E Manager List/ })
    .first();
  await expect(listLink).toBeVisible();
  await listLink.click();

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
  await page.goto(`/altvatar/${MANAGED_PROFILE}`);

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
  // to carry one.
  await page.getByRole('tab', { name: 'Permissions' }).click();
  await page.getByRole('button', { name: 'Alice Example actions' }).click();
  await expect(
    page.getByRole('menuitemradio', { name: 'Owner' })
  ).not.toHaveAttribute('aria-disabled', 'true');
});
