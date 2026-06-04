import { expect, test } from '@playwright/test';

// Harness self-test for the `guest` project: USE_PG_DRIVER=1 with
// BYPASS_SESSION_USER=guest, so auth() resolves to null. A link-visibility
// list is URL-open to anyone, so the unauthenticated caller sees the list
// (the seeded `dev-list-viewer-anniversary` is VISIBILITY.LINK) while the
// signed-out "Sign In" affordance confirms no session is present. Flow
// assertions belong to 6.1, not here.
test('PublicList_GuestOpensLinkListByUrl_RendersWithoutSession', async ({
  page,
}) => {
  await page.goto('/lists/dev-list-viewer-anniversary');

  await expect(
    page.getByRole('heading', { name: 'Anniversary Picks' }).first()
  ).toBeVisible();
  await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible();
});
