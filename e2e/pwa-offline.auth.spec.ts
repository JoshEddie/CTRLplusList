import { expect, test } from '@playwright/test';
import { awaitServiceWorkerActive } from '../test/helpers/e2e/utils';

// The never-cache-HTML pin. "Offline list view" for this app deliberately
// means the list view is NOT available offline: viewer-scoped pages (claims,
// spoiler hiding) must never be served by a client cache that doesn't see the
// server's revalidateTag discipline. Precached non-HTML assets, by contrast,
// must keep serving without network.

const LIST = '/lists/dev-list-viewer-birthday';

// Self-evidencing order (design Decision 4): the page is visited first so a
// cached copy WOULD exist if the SW cached HTML; the failed HTML fetch then
// proves the network is down through the SW-controlled client BEFORE the
// precache assertions credit the cache; the failed re-navigation is the
// list-view pin itself. The fetch/precache steps run before the navigation
// because a failed navigation commits an error page that is no longer
// SW-controlled.
test('PwaOffline_ReloadVisitedList_DoesNotServeHtmlFromCache', async ({
  page,
  context,
}) => {
  await page.goto(LIST);
  await expect(
    page.getByRole('heading', { name: "Test Viewer's Birthday" }).first()
  ).toBeVisible();
  await awaitServiceWorkerActive(page);

  await context.setOffline(true);

  // Network-down evidence: an HTML fetch from the SW-controlled client fails.
  const htmlFetchRejected = await page.evaluate(async () => {
    try {
      await fetch(location.href);
      return false;
    } catch {
      return true;
    }
  });
  expect(htmlFetchRejected).toBe(true);

  // With the network provably down, the precached assets still serve.
  for (const asset of ['/icons/icon-192.png', '/manifest.webmanifest']) {
    const result = await page.evaluate(async (url) => {
      const res = await fetch(url);
      return { ok: res.ok, status: res.status };
    }, asset);
    expect(result).toEqual({ ok: true, status: 200 });
  }

  // The pin: re-navigating to the just-visited list page fails outright — no
  // stale HTML is rendered from any client cache.
  await expect(page.goto(LIST)).rejects.toThrow(
    /ERR_INTERNET_DISCONNECTED|ERR_FAILED/
  );

  await context.setOffline(false);
});

// Network-independent mechanism pin: whatever the SW cached while navigating,
// none of it is HTML. Assertions key on content-type and the two stable
// additionalPrecacheEntries URLs — never on content-hashed bundle filenames.
test('PwaOffline_EnumerateCaches_HoldsNoHtmlResponses', async ({ page }) => {
  await page.goto(LIST);
  await awaitServiceWorkerActive(page);
  await page.waitForFunction(async () => (await caches.keys()).length > 0);

  const cached = await page.evaluate(async () => {
    const entries: { url: string; contentType: string }[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        entries.push({
          url: new URL(request.url).pathname,
          contentType: response?.headers.get('content-type') ?? '',
        });
      }
    }
    return entries;
  });

  expect(cached.length).toBeGreaterThan(0);
  const htmlEntries = cached.filter((entry) =>
    entry.contentType.includes('text/html')
  );
  expect(htmlEntries).toEqual([]);

  const cachedUrls = cached.map((entry) => entry.url);
  expect(cachedUrls).toContain('/manifest.webmanifest');
  expect(cachedUrls).toContain('/icons/icon-192.png');
  expect(cachedUrls).toContain('/icons/icon-512.png');
});
