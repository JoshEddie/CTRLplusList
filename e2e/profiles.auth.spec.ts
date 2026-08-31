import { expect, test } from '@playwright/test';

import { ACCENT_PRESETS } from '../lib/accent';
import { cssRgb } from '../test/helpers/contrast';

// Flow: the Altvatars arc as the seeded viewer — reach the page from the avatar
// popover, read the cards it lists, open a profile's space from a card, and
// give birth to a managed profile. Pins the `profiles` / `profile_members`
// cache-tag loop through the real `'use server'` boundary (createProfile,
// updateProfileSettings).
//
// Seed baseline: `dev-test-viewer` holds `self` on `self-dev-test-viewer`
// ("Test Viewer"), `owner` on `dev-profile-owned` ("Owned Profile"), and
// `manager` on both `dev-profile-managed` ("Managed Profile") and
// `dev-profile-workshop` ("Workshop Profile") — all three roles across four
// memberships, so four cards render here and the profile-switch flow drives
// the same switchable set.
//
// RESIDUE (documented for future spec authors): the creation test inserts a
// managed profile plus its owner membership and accent row, the edit test
// renames the owned profile's tagline, and the swatch test commits an accent
// and an Altvatar row for `dev-profile-owned`. All persist for the remainder of
// the run until the next `db:reset:dev`. No other spec asserts profile counts
// or the owned profile's tagline, so that much is invisible outside this file
// — but the swatch row is not contained: it clobbers this file's own fixture,
// the accentless `dev-profile-owned` whose rolled-suggestion branch the swatch
// test opens on. `scripts/test-e2e.sh` resets first, so `npm run test:e2e`
// never meets it; a bare `npx playwright test` re-run does, and the assertion
// keeps passing over a branch that is no longer there. Reseed with
// `npm run db:reset:dev` before trusting that leg on the iteration path.
//
// The created profile's name is unique per attempt because only
// `scripts/test-e2e.sh` reseeds, once per run: a retry after a failed creation
// would otherwise find two cards matching one name and die on a strict-mode
// violation instead of reproducing the failure it was retrying.
const sidekickName = () => `E2E Sidekick ${Date.now()}-${process.pid}`;

test('Profiles_ViewerOpensFromAvatarPopover_ListsSelfThenOwnedCards', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('menuitem', { name: 'Altvatars' }).click();

  await expect(page).toHaveURL(/\/altvatar$/);

  // Self first, then owned by name — the capability ordering the page fixes.
  const names = page.locator('.profile-card-name');
  await expect(names.first()).toHaveText('Test Viewer');
  await expect(page.locator('.profile-card-role').first()).toHaveText('You');
  await expect(names.filter({ hasText: 'Owned Profile' })).toBeVisible();
  await expect(names.filter({ hasText: 'Managed Profile' })).toBeVisible();

  // The viewer's own card is always present, so no empty state is reachable.
  await expect(page.getByText('No Altvatars Found')).toHaveCount(0);
});

test('Profiles_ViewerOpensCardMenu_NavigatesToTheProfileSpace', async ({
  page,
}) => {
  await page.goto('/altvatar');
  const card = page
    .locator('.profile-card')
    .filter({ hasText: 'Owned Profile' })
    .first();
  await expect(card).toBeVisible();

  // The card's ⋯ menu is what carries the management intent.
  await card.getByRole('button', { name: 'Owned Profile actions' }).click();
  await card.getByRole('menuitem', { name: 'Edit Owned Profile' }).click();
  await expect(page).toHaveURL(/\/altvatar\/dev-profile-owned$/);
});

test('ProfileSpace_OwnerSavesTagline_PersistsAcrossAFreshRead', async ({
  page,
}) => {
  await page.goto('/altvatar/dev-profile-owned');
  await page.getByLabel('Tagline').fill('Loves dinosaurs');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Profile updated')).toBeVisible();

  // A fresh server read proves the write round-tripped past the cache tag.
  await page.goto('/altvatar');
  await expect(
    page.locator('.profile-card').filter({ hasText: 'Owned Profile' })
  ).toContainText('Loves dinosaurs');
});

test('Profiles_ViewerCreatesManagedProfile_NavigatesToItsSpaceAndItListsAfterwards', async ({
  page,
}) => {
  const name = sidekickName();
  await page.goto('/altvatar');
  await page.getByRole('button', { name: 'New Altvatar' }).click();

  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Tagline').fill('Born in a test');
  await page.getByRole('button', { name: 'Create Altvatar' }).click();

  // Success navigates into the new profile's space and raises no toast.
  await expect(page).toHaveURL(/\/altvatar\/[^/]+$/);
  await expect(page.getByRole('heading', { name })).toBeVisible();

  await page.goto('/altvatar');
  const created = page.locator('.profile-card').filter({ hasText: name });
  await expect(created).toBeVisible();
  await expect(created.locator('.profile-card-role')).toHaveText('Owner');
  await expect(created).toContainText('Born in a test');
});

// The accent reaches the paint as `--accent-*` custom properties on each
// surface's root, so what a jsdom test can see is the variable, not the colour.
// Only a real stylesheet resolves `var(--accent-bg)` onto the band — this is
// the one place that binding is proven.
test('ProfileSpace_OwnerPicksASwatch_RepaintsTheBandFromTheAccentVariable', async ({
  page,
}) => {
  await page.goto('/altvatar/dev-profile-owned');
  const band = page.locator('.profile-space-band');

  // Owned Profile carries no accent row, so the space opens on a rolled suggestion —
  // which preset it lands on is unseeded, so only the paint is asserted here.
  await expect(band).toHaveCSS('background-image', /gradient/);

  const [name, preset] = Object.entries(ACCENT_PRESETS)[0];
  // The accent is edited inside the customizer now — one identity settled in
  // one place — so the swatch is reached through the band's own edit control.
  await page.getByRole('button', { name: 'Edit Altvatar' }).click();
  const customizer = page.getByRole('dialog', {
    name: 'Customise your Altvatar',
  });
  // The radio is `sr-only` and its own swatch covers it, so the label is the
  // hit target a user actually gets. Selected by the radio it wraps rather than
  // by its text, which the visible and screen-reader names repeat.
  await customizer
    .locator('.profile-accent-option')
    .filter({ has: page.getByRole('radio', { name, exact: true }) })
    .click();
  await customizer.getByRole('button', { name: 'Use this Altvatar' }).click();

  await expect(band).toHaveCSS(
    'background-image',
    new RegExp(
      `${cssRgb(preset.light)}.*${cssRgb(preset.dark)}`.replace(/[()]/g, '\\$&')
    )
  );
});

// One address serves members and everyone else, so an id no profile carries
// falls through to the public view — which stands the not-found page on the
// requested URL rather than redirecting. The status stays 200: the lookup runs
// inside the route's Suspense boundary, so the shell is already flushed by the
// time `notFound()` throws.
test('AltvatarSpace_ViewerRequestsUnknownProfileId_StandsTheNotFoundPage', async ({
  page,
}) => {
  await page.goto('/altvatar/no-such-profile-id');
  await expect(
    page.getByRole('heading', { name: 'Page Not Found' })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/altvatar\/no-such-profile-id$/);
});
