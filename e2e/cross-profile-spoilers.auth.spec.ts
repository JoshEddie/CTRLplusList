import { expect, test } from '@playwright/test';

import { pinActingProfile } from './helpers/activeProfile';

// Management flow 10: claim visibility crosses the acting-profile boundary.
//
// This is the exposure the redesign exists to close. An account acting as
// profile A, opening a list owned by profile B it also runs, was
// indistinguishable from a stranger — so its own household's claims rendered.
// Protection now resolves from the membership on the OWNING profile, whatever
// the request acts as, and only a browser holding a real selection cookie can
// prove it: every layer beneath resolves the same either way.
//
// Seed baseline: `dev-test-viewer` holds `owner` on `dev-profile-owned` and
// `manager` on `dev-profile-visibility`, whose list carries a seeded claim by
// Alice. That membership sits at the fully protected baseline.
//
// The context is pinned by the application's own selection cookie rather than
// switched through the UI, because the starting acting profile is the fixture
// here; pinning is a read path and writes neither a selection nor a stamp, so
// nothing the flow touches survives it.
const ACTING_AS = 'dev-profile-owned';
const OTHER_PROFILES_LIST = '/lists/dev-list-visibility-wishlist';

test.beforeEach(async ({ context, baseURL }) => {
  await pinActingProfile(context, ACTING_AS, baseURL as string);
});

test('CrossProfile_MemberActingAsAnother_IsProtectedByTheirMembership', async ({
  page,
}) => {
  await page.goto(OTHER_PROFILES_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  // A stranger would resolve to the maximal projection and see Alice's claim;
  // this account is a member of the owning profile, so their baseline governs.
  await expect(page.getByText('Spoilers:')).toHaveCount(0);
  await expect(page.getByText('Claimed by')).toHaveCount(0);
  await expect(page.getByText('added by Alice')).toHaveCount(0);
});

test('CrossProfile_MemberActingAsAnother_IsOfferedTheSwitch', async ({
  page,
}) => {
  await page.goto(OTHER_PROFILES_LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();

  // Floating and non-blocking: it reports what the viewer may act as, not what
  // they may see, so it renders whatever the resolved tier is.
  const offer = page.locator('.switch-offer-card');
  await expect(offer).toBeVisible();
  await expect(offer).toContainText('Managing as Visibility Profile');
  await expect(
    offer.getByRole('button', { name: 'Switch to Visibility Profile' })
  ).toBeVisible();
});
