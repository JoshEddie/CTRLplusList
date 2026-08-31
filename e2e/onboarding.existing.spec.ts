import { expect, test } from '@playwright/test';

// Flow: the onboarding gate's existing-account arm — an account holding a
// self-profile that carries no Altvatar art, which is the state the phase-1
// backfill left every account predating this capability in. Reached as
// `dev-unonboarded-existing` (scripts/seed-dev-users.ts), its own server mode.
//
// Residue: none, by construction. Nothing here submits — writing art would
// clear the latch permanently and leave the next run with no gate to meet, so
// re-running the suite against the same database exercises this identically.
const GATE = { name: 'Pick your Altvatar' };

test('Onboarding_BackfilledAccountRequestsAPage_GateStandsInsteadOfIt', async ({
  page,
}) => {
  await page.goto('/lists/bookmarks');

  await expect(page.getByRole('dialog', { name: GATE.name })).toBeVisible();
  await expect(page).toHaveURL(/\/lists\/bookmarks$/);
  await expect(page.locator('.bookmarks-page')).toHaveCount(0);
});

test('Onboarding_ExistingArm_DoesNotAddressTheViewerAsSigningUp', async ({
  page,
}) => {
  await page.goto('/lists');
  const gate = page.getByRole('dialog', { name: GATE.name });

  // The name it already carries arrives in the field on the story's final
  // beat; the copy introduces a feature rather than describing an account
  // being created.
  await expect(gate).not.toContainText('signing up');
  await expect(gate).not.toContainText('sign-up');
  const next = gate.getByRole('button', { name: 'Next' });
  await next.click();
  await next.click();
  await gate.getByRole('button', { name: 'Choose your look' }).click();
  await page.getByRole('button', { name: 'Use this Altvatar' }).click();
  await expect(gate.getByLabel('Name')).toHaveValue('Faceless Veteran');
  await expect(gate).not.toContainText('signing up');
});

test('Onboarding_ExistingArm_AccountMenuShowsEmailAndNoSwitchRows', async ({
  page,
}) => {
  await page.goto('/lists');
  await expect(page.getByRole('dialog', { name: GATE.name })).toBeVisible();

  await page.getByRole('button', { name: 'User menu' }).click();
  const menu = page.getByRole('menu', { name: 'User menu' });
  await expect(menu).toBeVisible();

  await expect(menu.getByText('unonboarded-existing@dev.local')).toBeVisible();
  await expect(
    menu.getByRole('menuitem', { name: /sign out/i })
  ).toBeVisible();

  // No switch rows: the account holds one profile and app-frame offers a
  // single-profile viewer no switching.
  const items = menu.getByRole('menuitem');
  await expect(items).toHaveCount(3); // Altvatars, Connections, Sign out
});

test('Onboarding_ExistingArm_NavPillChangesAddressAndGateStands', async ({
  page,
}) => {
  await page.goto('/lists');
  await expect(page.getByRole('dialog', { name: GATE.name })).toBeVisible();

  await page.getByRole('link', { name: 'Items' }).click();
  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByRole('dialog', { name: GATE.name })).toBeVisible();
});

test('Onboarding_ReloadBackdropAndEscape_LeaveTheGateStanding', async ({
  page,
}) => {
  await page.goto('/lists');
  const gate = page.getByRole('dialog', { name: GATE.name });
  await expect(gate).toBeVisible();

  await expect(page.getByRole('button', { name: /close/i })).toHaveCount(0);

  await page.getByTestId('onboarding-backdrop').click({ position: { x: 4, y: 4 } });
  await expect(gate).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(gate).toBeVisible();

  await page.reload();
  await expect(page.getByRole('dialog', { name: GATE.name })).toBeVisible();
});
