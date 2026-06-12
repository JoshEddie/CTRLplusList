import { expect, test } from '@playwright/test';

// /dev-error is the local-mode fixture route that throws during server render
// (see app/(main)/dev-error/page.tsx). Under the e2e production server it
// exercises the (main) error boundary for real — the acceptance criterion of
// issue #107: an uncaught server render error shows the app-styled boundary,
// never Next's bare default error page.
test('DevErrorRoute_ServerRenderThrows_RendersStyledBoundaryInsideAppFrame', async ({
  page,
}) => {
  await page.goto('/dev-error');

  await expect(
    page.getByRole('heading', { name: 'Something went wrong' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go home' })).toBeVisible();
  await expect(page.getByText(/Error reference: \d+/)).toBeVisible();

  // App frame chrome survives the error (boundary lives under the (main) layout).
  await expect(page.getByRole('banner')).toBeVisible();

  // Next's default error page must not appear.
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
});
