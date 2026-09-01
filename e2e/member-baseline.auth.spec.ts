import { expect, test } from '@playwright/test';

import { RECIPIENT_BASE_URL } from './helpers/constants';

// Management flow 9: an owner sets a claim-visibility baseline, and the write
// reaches the rendered list rather than only the control.
//
// Seed baseline: `dev-friend-bob` holds `owner` on `dev-profile-visibility`
// ("Visibility Profile") and `dev-test-viewer` holds `manager` there, both at
// the fully protected baseline. The profile's list carries one deterministic
// claim by Alice (`dev-purchase-visibility-other`) on an item pinned to a
// single claim, so a raised baseline flips that card's presentation
// observably. Workshop Profile cannot serve: `roles-manager.auth.spec` reads
// its list in a parallel worker and depends on the viewer's baseline staying
// at `surprise`, which is one of the two conditions the reorder layout turns
// on.
//
// Both halves run against the recipient server, as Bob. The owner-writes-
// another's-row half is asserted on the control; the write-reaches-the-read
// half is asserted on Bob's own rendered list. They are not combined into one
// cross-server assertion because the two e2e app servers are separate
// processes with separate `'use cache'` stores, so a tag fired by one cannot
// invalidate the other's cached read — an artifact of the harness, not of the
// tag loop, which is a single deployment in production.
//
// Bob's own baseline is the open control at the top of the panel; the viewer's
// is a collapsed row he administers.
//
// Resolution is what the second half actually pins: Bob views the list while
// acting as his SELF-profile, and the list is owned by Visibility Profile. A
// read resolving the spoiler state from the acting profile — or from an
// ownership comparison — would find no membership and disclose everything.
//
// RESIDUE (contained): both baselines are restored to the fully protected
// state before the flow ends, so a bare re-run finds the seeded fixture intact.
const SETTINGS = `${RECIPIENT_BASE_URL}/altvatar/dev-profile-visibility`;
const LIST = `${RECIPIENT_BASE_URL}/lists/dev-list-visibility-wishlist`;

// A member the viewer merely administers sits behind a collapsed row, so the
// control is reached by opening it; the viewer's own baseline is open already.
const OWN_CONTROL = 'What you see on this profile';

const levelControl = (page: import('@playwright/test').Page, label: string) =>
  page.getByRole('combobox', { name: label });

async function openAdministeredRow(
  page: import('@playwright/test').Page,
  member: string
) {
  await page.goto(SETTINGS);
  await page.getByRole('button', { name: new RegExp(`^${member}`) }).click();
}

async function setAdministeredLevel(
  page: import('@playwright/test').Page,
  member: string,
  level: string
) {
  await openAdministeredRow(page, member);
  await levelControl(page, `Claim visibility for ${member}`).selectOption(level);
  await expect(page.getByText('Claim visibility updated')).toBeVisible();
}

async function setOwnLevel(
  page: import('@playwright/test').Page,
  level: string
) {
  await page.goto(SETTINGS);
  await levelControl(page, OWN_CONTROL).selectOption(level);
  await expect(page.getByText('Claim visibility updated')).toBeVisible();
}

test('MemberBaseline_OwnerWritesAnothersRow_ReflectedOnReNavigation', async ({
  page,
}) => {
  await setAdministeredLevel(page, 'Test Viewer', 'identity');

  // Re-navigation shows the row holding the written value, not the optimistic
  // one the select carried — and the collapsed row summarises it with the
  // tier's own label.
  await page.goto(SETTINGS);
  await expect(
    page.getByRole('button', { name: /^Test Viewer/ })
  ).toContainText('Everything shown');
  await openAdministeredRow(page, 'Test Viewer');
  await expect(
    levelControl(page, 'Claim visibility for Test Viewer')
  ).toHaveValue('identity');

  // Restore the fixture.
  await setAdministeredLevel(page, 'Test Viewer', 'surprise');
  await page.goto(SETTINGS);
  await expect(
    page.getByRole('button', { name: /^Test Viewer/ })
  ).toContainText('Surprise me');
});

test('MemberBaseline_OwnerRaisesTheirOwn_ReachesTheirRenderedList', async ({
  page,
}) => {
  // At the fully protected baseline the seeded claim is stripped before the
  // rows leave the data layer, so the item reads as claimable.
  await page.goto(LIST);
  await expect(page.locator('.item-container').first()).toBeVisible();
  await expect(page.getByText('Fully claimed')).toHaveCount(0);

  await setOwnLevel(page, 'identity');

  // Raised, the same card discloses that it is claimed and by whom — with no
  // per-page control touched, so the baseline is what the read resolved.
  await page.goto(LIST);
  await expect(page.getByText('Fully claimed').first()).toBeVisible();
  await expect(page.getByText('Claimed by Alice').first()).toBeVisible();

  // Restore the fixture.
  await setOwnLevel(page, 'surprise');
  await page.goto(LIST);
  await expect(page.getByText('Fully claimed')).toHaveCount(0);
});
