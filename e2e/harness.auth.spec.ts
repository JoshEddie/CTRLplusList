import { expect, test } from '@playwright/test';

// Harness self-test for the `authenticated` project: USE_PG_DRIVER=1 with the
// identity selector unset, so zero-arg auth() synthesizes the seeded
// dev-test-viewer session. Visiting the protected home page renders the
// signed-in avatar menu (UserAvatarPopover, gated on a real session) with no
// sign-in step — end-to-end proof the bypass produces a session through the
// production `next start` server. Flow assertions belong in the dedicated flow specs, not here.
test('Home_AuthenticatedViewerVisits_RendersSignedInAvatarWithoutSignIn', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'User menu' })).toBeVisible();
  await expect(page.getByText('Sign In', { exact: true })).toHaveCount(0);
});
