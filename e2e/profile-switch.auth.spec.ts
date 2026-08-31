import { expect, test } from '@playwright/test';

import { pinActingProfile } from './helpers/activeProfile';

// Flow: the profile switch as the seeded viewer — start un-pinned on the
// self-profile, switch through a real switching affordance, and prove the
// profile-scoped collection re-rendered as the other profile's, then switch
// back. The failure mode this covers — a call site resolving the self-profile
// where it owes the active one, or the reverse — is invisible to a unit test
// holding a mocked session, so the switch is driven through the UI rather than
// by pinning the selection cookie.
//
// Seed baseline: `dev-test-viewer` holds `self` on `self-dev-test-viewer`
// ("Test Viewer", which owns "Test Viewer's Birthday"), `owner` on
// `dev-profile-owned` ("Owned Profile", which owns "Owned Profile Wishlist"),
// and `manager` on both `dev-profile-managed` ("Managed Profile") and
// `dev-profile-workshop` ("Workshop Profile", the seat the manager flow
// writes on) — four memberships, and so four rows in the switcher.
//
// RESIDUE (contained, documented for future spec authors): a switch stamps the
// target membership's last-acted-as timestamp, and no affordance in the
// viewer's UI unsets it. The flow therefore switches only to "Owned Profile",
// whose seeded timestamp is already non-NULL — never to "Managed Profile",
// whose NULL is the never-acted-as ordering fixture `profiles-data-model`
// seeds and which stamping would consume for every later run against the same
// database. The acting profile itself is restored: the flow ends back on the
// viewer's self-profile.
//
// The last test pins "Managed Profile" by cookie rather than switching to it.
// Pinning is a read path — resolution re-verifies the membership and writes
// nothing, neither a selection nor a stamp — so the NULL fixture survives it,
// and the test performs no write while acting as that profile.
const SELF_LIST = "Test Viewer's Birthday";
const OWNED_LIST = 'Owned Profile Wishlist';

const listNamed = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('link', { name: new RegExp(name) });

test('ProfileSwitch_ViewerSwitchesFromTheAvatarDropdown_ListsRerenderAsThatProfile', async ({
  page,
}) => {
  // Un-pinned: a context carrying no selection resolves to the self-profile.
  await page.goto('/lists');
  await expect(listNamed(page, SELF_LIST).first()).toBeVisible();
  await expect(listNamed(page, OWNED_LIST)).toHaveCount(0);

  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('menuitem', { name: 'Owned Profile' }).click();

  // The switch announces itself and leaves the viewer on the route they were
  // on — no navigation, just a re-render as the new active profile.
  await expect(
    page.getByText('Profile switched to Owned Profile')
  ).toBeVisible();
  await expect(page).toHaveURL(/\/lists$/);
  await expect(listNamed(page, OWNED_LIST).first()).toBeVisible();
  await expect(listNamed(page, SELF_LIST)).toHaveCount(0);

  // Switching back restores the seed's acting profile.
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('menuitem', { name: 'Test Viewer' }).click();

  await expect(page.getByText('Profile switched to Test Viewer')).toBeVisible();
  await expect(listNamed(page, SELF_LIST).first()).toBeVisible();
  await expect(listNamed(page, OWNED_LIST)).toHaveCount(0);
});

test('ProfileSwitch_ViewerSwitchesFromAProfileCard_StaysOnProfilesWithTheMarkMoved', async ({
  page,
}) => {
  await page.goto('/altvatar');
  const ownedCard = page
    .locator('.profile-card')
    .filter({ hasText: 'Owned Profile' })
    .first();
  const selfCard = page
    .locator('.profile-card')
    .filter({ hasText: 'Test Viewer' })
    .first();
  await expect(selfCard).toHaveClass(/is-active/);

  // The card's body is the click target; the menu is excluded from it.
  await ownedCard.locator('.profile-card-counts').click();

  await expect(
    page.getByText('Profile switched to Owned Profile')
  ).toBeVisible();
  await expect(page).toHaveURL(/\/altvatar$/);
  await expect(ownedCard).toHaveClass(/is-active/);
  await expect(selfCard).not.toHaveClass(/is-active/);

  // The keyboard-reachable path back: the active profile's own card offers no
  // switch row, so the row is taken from the self-profile's card.
  await selfCard.getByRole('button', { name: 'Test Viewer actions' }).click();
  await selfCard
    .getByRole('menuitem', { name: 'Switch to Test Viewer' })
    .click();

  await expect(page.getByText('Profile switched to Test Viewer')).toBeVisible();
  await expect(selfCard).toHaveClass(/is-active/);
});

test('Lists_ActingAsAProfileWithNoLists_OffersTheProfilesRouteBesideCreate', async ({
  page,
  context,
  baseURL,
}) => {
  await pinActingProfile(context, 'dev-profile-managed', baseURL!);

  await page.goto('/lists');

  await expect(
    page.getByRole('heading', { name: 'No Lists Found' })
  ).toBeVisible();
  await expect(
    page.getByText(
      'This profile has no Lists yet — create one below, or switch profiles.'
    )
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Go to Altvatars' })
  ).toHaveAttribute('href', '/altvatar');
});

test('ProfileSpace_ViewerSwitchesWithUnsavedEdits_ConfirmsThenFollowsTheRoute', async ({
  page,
}) => {
  await page.goto('/altvatar/self-dev-test-viewer');
  // By role, not by label: after a navigation Next leaves the previous
  // segment's DOM in the document, hidden — it still carries a labelled input,
  // but no longer appears in the accessibility tree.
  const nameField = page.getByRole('textbox', { name: 'Name' });
  await nameField.fill('Test Viewer edited');

  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('menuitem', { name: 'Owned Profile' }).click();

  // Held: the edits sit in a different subtree from the dropdown, so the
  // switch is confirmed before anything is discarded.
  await expect(page.getByText('You have unsaved changes')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/altvatar\/self-dev-test-viewer$/);
  await expect(nameField).toHaveValue('Test Viewer edited');

  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('menuitem', { name: 'Owned Profile' }).click();
  await page.getByRole('button', { name: 'Switch anyway' }).click();

  // A profile's space is keyed to an id, so it follows the switch rather than
  // re-rendering the profile the viewer has left.
  await expect(
    page.getByText('Profile switched to Owned Profile')
  ).toBeVisible();
  await expect(page).toHaveURL(/\/altvatar\/dev-profile-owned$/);
  await expect(nameField).toHaveValue('Owned Profile');

  // Switching back restores the seed's acting profile. The abandoned edit is
  // still in the router's client cache at that point, which is why the
  // confirmation claims only that the edits are unsaved — a fresh load is what
  // proves nothing was written.
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('menuitem', { name: 'Test Viewer' }).click();
  await expect(page).toHaveURL(/\/altvatar\/self-dev-test-viewer$/);

  await page.reload();
  await expect(nameField).toHaveValue('Test Viewer');
});
