import { expect, test, type Page } from '@playwright/test';

// metadataBase makes og:image an absolute production URL; fetch its path
// against this test server instead.
async function fetchOgImage(page: Page, url: string) {
  await page.goto(url);
  const content = await page
    .locator('meta[property="og:image"]')
    .getAttribute('content');
  const { pathname, search } = new URL(content!);
  return page.request.get(pathname + search);
}

test('RootUrl_FetchOgImage_ServesPng', async ({ page }) => {
  const res = await fetchOgImage(page, '/');

  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
});
