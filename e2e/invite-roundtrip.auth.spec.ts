import { expect, test } from '@playwright/test';

import { RECIPIENT_BASE_URL } from './helpers/constants';

// Flow: admission end to end — an owner mints a link, a different account
// redeems it and gains the role, and the same link refuses a second time. The
// two ends are necessarily two people, and the auth bypass admits one account
// per process, so the redeeming half is driven against the recipient server by
// absolute URL rather than through a second project.
//
// Seed baseline: `dev-test-viewer` holds `owner` on `dev-profile-owned`
// ("Owned Profile"); `dev-friend-bob` ("Bob") holds no membership on it and no
// block edge with the viewer, so nothing refuses the redemption but the link's
// own terms.
//
// RESIDUE (contained): Bob keeps a `manager` membership on "Owned Profile",
// and the link is spent. `npm run test:e2e` wipes and reseeds before every run,
// so both are restored; a bare `npx playwright test` re-run against the same
// database would find Bob already a member, which the flow's own
// already-a-member branch renders rather than failing on.
const OWNED_PROFILE = 'dev-profile-owned';

test('InviteRoundTrip_OwnerMintsRecipientRedeemsThenRetries_AdmittedThenRefused', async ({
  page,
  context,
}) => {
  // The minted link is never rendered as text — it lives behind the pending
  // row's copy control, which is the surface an owner actually uses.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // Mint — no switch: a profile's space authorizes on the profile the request
  // names, so the owner administers it while acting as their self-profile.
  await page.goto(`/altvatar/${OWNED_PROFILE}`);
  await page.getByRole('button', { name: 'Invite someone' }).click();
  await expect(page.getByLabel('Role')).toHaveValue('manager');
  await page.getByRole('button', { name: 'Create link' }).click();

  // The link lands in the roster as a seat nobody has taken yet. Settings is
  // the space's first panel, so the roster is reached by its tab.
  await page.getByRole('tab', { name: 'Permissions' }).click();
  const pendingRow = page.locator('.member-row--pending');
  await expect(pendingRow).toBeVisible();
  await expect(pendingRow).toContainText('Manager');
  await expect(pendingRow).toContainText('expires in 7 days');

  await pendingRow.getByRole('button', { name: 'Invite link actions' }).click();
  await page.getByRole('menuitem', { name: 'Copy link' }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  const token = url.split('/invite/')[1];
  expect(token).toBeTruthy();

  const inviteUrl = `${RECIPIENT_BASE_URL}/invite/${token}`;

  // Opening the link does not spend it: the page states what it grants and
  // waits for an explicit act.
  await page.goto(inviteUrl);
  await expect(
    page.getByRole('heading', { name: 'Owned Profile' })
  ).toBeVisible();
  await expect(page.getByText(/^as a manager —/)).toBeVisible();

  await page.getByRole('button', { name: 'Accept invite' }).click();
  await expect(page).toHaveURL(new RegExp(`/altvatar/${OWNED_PROFILE}$`));

  // The membership landed, and the recipient's own Profiles page — a cached
  // read keyed on their account — reflects it without waiting.
  await page.goto(`${RECIPIENT_BASE_URL}/altvatar`);
  await expect(
    page.locator('.profile-card').filter({ hasText: 'Owned Profile' })
  ).toBeVisible();

  // The owner's own roster is NOT asserted here. The redemption's tag
  // invalidation runs in the recipient's server process, and the two
  // `next start` processes this harness needs in order to be two accounts hold
  // separate in-memory tag stores — so the owner's cached roster is stale for
  // reasons that exist only in the harness. That a redemption drops the invite
  // from the pending set and adds the member is a single-process contract,
  // pinned in the unit coverage of `getPendingInvites` and `redeemInvite`.

  // Spent: the same link refuses, and the refusal names no reason.
  await page.goto(inviteUrl);
  await expect(
    page.getByRole('heading', { name: 'This invite link is no longer valid' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Accept invite' })
  ).toHaveCount(0);
});
