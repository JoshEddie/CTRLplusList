import { expect, test } from '@playwright/test';

// Flow: "AuthPage sign-in UI" — the logged-out half. With no session
// (BYPASS_SESSION_USER=guest ⇒ auth() resolves to null) the sign-in route
// renders the AuthPage surface: the Ctrl+List logo and the "Sign in with
// Google" affordance. Presence is asserted; the spec stops short of the OAuth
// handshake (testing-foundation: NextAuth is never invoked against real
// Google — Decision 6).
test('SignIn_BypassDisabled_RendersGoogleButton', async ({ page }) => {
  await page.goto('/sign-in');

  await expect(page.getByRole('img', { name: 'Ctrl+List' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sign in with Google' })
  ).toBeVisible();
});
