import { expect, test } from '@playwright/test';

// Flow: the onboarding gate's signup arm — an account holding no membership at
// all, which is the state every account is in between sign-in and this gate's
// submit. Reached as `dev-unonboarded-signup` (scripts/seed-dev-users.ts), its
// own server mode because the auth bypass admits one account per process.
//
// Residue: none, by construction. Nothing here submits. Completing the gate
// would consume a fixture the seeded database holds exactly one of, so a
// second run would find no gate to meet. Minting and atomicity are covered
// over the actions in lib/data/__tests__/onboarding.actions.test.ts. Because
// this spec writes nothing, re-running the suite against the same database
// exercises it identically.
const GATE = { name: 'Finish setting up your Altvatar' };

test('Onboarding_AccountWithNoProfileRequestsAPage_GateStandsInsteadOfIt', async ({
  page,
}) => {
  await page.goto('/lists/bookmarks');

  // The gate is not a route: it replaces the requested page in the layout's
  // output, so the URL asked for is untouched and the page never renders.
  await expect(page.getByRole('dialog', { name: GATE.name })).toBeVisible();
  await expect(page).toHaveURL(/\/lists\/bookmarks$/);
  await expect(page.locator('.bookmarks-page')).toHaveCount(0);
});

test('Onboarding_SharedListLinkOwnedBySomeoneElse_IsGatedLikeEveryOtherPage', async ({
  page,
}) => {
  // No allowlist: a public list belonging to another account is gated too. An
  // un-onboarded account can claim nothing, follow nothing and bookmark
  // nothing, so every affordance on such a page is inert regardless.
  await page.goto('/lists/dev-list-grace-birthday');

  await expect(page.getByRole('dialog', { name: GATE.name })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: "Grace's Birthday" })
  ).toHaveCount(0);
});

test('Onboarding_SignupArm_NavAvatarShowsInitialsAndMenuShowsEmail', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: GATE.name })).toBeVisible();

  // The avatar shows account name initials (no profile exists yet).
  const trigger = page.getByRole('button', { name: 'User menu' });
  await expect(trigger).toBeVisible();
  await expect(trigger.locator('.altvatar-disc')).toContainText('US');

  await trigger.click();
  const menu = page.getByRole('menu', { name: 'User menu' });
  await expect(menu.getByText('unonboarded-signup@dev.local')).toBeVisible();

  // No switch rows, no profile count — no profile has been created.
  const items = menu.getByRole('menuitem');
  await expect(items).toHaveCount(3); // Altvatars, Connections, Sign out
});

test('Onboarding_ReloadBackdropAndEscape_LeaveTheGateStanding', async ({
  page,
}) => {
  await page.goto('/lists');
  const gate = page.getByRole('dialog', { name: GATE.name });
  await expect(gate).toBeVisible();

  // No close control at all — not a disabled or hidden-but-present one.
  await expect(page.getByRole('button', { name: /close/i })).toHaveCount(0);

  // The backdrop is the element the gate sits on; clicking its own corner
  // lands on it rather than on any descendant.
  await page.getByTestId('onboarding-backdrop').click({ position: { x: 4, y: 4 } });
  await expect(gate).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(gate).toBeVisible();

  await page.reload();
  await expect(page.getByRole('dialog', { name: GATE.name })).toBeVisible();
});
