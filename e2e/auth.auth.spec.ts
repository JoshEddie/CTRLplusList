import { expect, test } from '@playwright/test';

// Flow: "sign-in (with bypass)" — the authenticated half. Under the local-mode
// session bypass (USE_PG_DRIVER=1, identity selector unset) a protected page
// renders for the seeded viewer with no sign-in step. Opening the avatar menu
// asserts the resolved identity is "Test Viewer" end-to-end (session → DB
// name), not merely that *a* session exists.
test('SignIn_BypassEnabled_RendersProtectedPage', async ({ page }) => {
  await page.goto('/');

  // No sign-in affordance — the bypass synthesizes the seeded-viewer session.
  await expect(page.getByText('Sign In', { exact: true })).toHaveCount(0);

  // The protected home renders for the seeded viewer; the avatar popover
  // surfaces the resolved account name.
  await page.getByRole('button', { name: 'User menu' }).click();
  // Exact match: "Test Viewer" is also a substring of the "Test Viewer's
  // Birthday" list card on the home rail.
  await expect(page.getByText('Test Viewer', { exact: true })).toBeVisible();
});
