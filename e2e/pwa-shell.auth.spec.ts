import { expect, test } from '@playwright/test';
import { awaitServiceWorkerActive } from '../test/helpers/e2e/utils';

// PWA shell: service worker registration, the install-detection surface, and
// the kill-switch. Runs only against the production-build server — Serwist is
// disabled in development.

// Flow: visiting any route registers /sw.js at the origin root and the page
// becomes controlled without a reload (clientsClaim).
test('PwaShell_VisitAnyRoute_RegistersServiceWorkerAtRootScope', async ({
  page,
}) => {
  await page.goto('/');
  const scope = await awaitServiceWorkerActive(page);
  expect(scope).toBe(new URL('/', page.url()).href);
});

// The shape of the manifest TypeScript module is unit-tested
// (app/__tests__/manifest.test.ts); this spec asserts what the unit tier
// cannot see — the served endpoint, its content-type, and that every declared
// icon URL actually resolves on the production server.
test('PwaShell_FetchManifest_MeetsInstallContract', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/manifest+json');

  const manifest = (await res.json()) as {
    name: string;
    short_name: string;
    description: string;
    id: string;
    scope: string;
    start_url: string;
    display: string;
    orientation: string;
    background_color: string;
    theme_color: string;
    icons: { src: string; sizes: string; type: string; purpose: string }[];
  };

  expect(manifest.name).toBe('Ctrl+List');
  expect(manifest.short_name).toBe('Ctrl+List');
  expect(manifest.description).toBe(
    'Create and share your lists with friends and family'
  );
  // Install-identity pin (regression 4f3a7b0): without id, the home-screen
  // identity derives from whichever URL was open at install time.
  expect(manifest.id).toBe('/');
  expect(manifest.scope).toBe('/');
  expect(manifest.start_url).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.orientation).toBe('portrait');
  expect(manifest.background_color).toBe('#25194e');
  expect(manifest.theme_color).toBe('#25194e');

  for (const size of ['192', '512']) {
    for (const purpose of ['any', 'maskable']) {
      expect(manifest.icons).toContainEqual({
        src: `/icons/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose,
      });
    }
  }

  for (const icon of manifest.icons) {
    const iconRes = await request.get(icon.src);
    expect(iconRes.status()).toBe(200);
    expect(iconRes.headers()['content-type']).toContain('image/');
  }
});

// The iOS install path: Apple metas (status-bar-style black-translucent so
// the app gradient shows through — regression 4f2225d) plus the manifest link
// and viewport-fit=cover. Criteria-level only: no beforeinstallprompt
// synthesis (headless prompt heuristics are version-dependent flake).
test('PwaShell_LoadRoute_CarriesInstallPathMetadata', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('head link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest'
  );

  const meta = (name: string) => page.locator(`head meta[name="${name}"]`);
  await expect(meta('apple-mobile-web-app-capable')).toHaveAttribute(
    'content',
    'yes'
  );
  await expect(meta('apple-mobile-web-app-title')).toHaveAttribute(
    'content',
    'Ctrl+List'
  );
  await expect(meta('apple-mobile-web-app-status-bar-style')).toHaveAttribute(
    'content',
    'black-translucent'
  );
  await expect(meta('format-detection')).toHaveAttribute(
    'content',
    'telephone=no'
  );
  await expect(meta('viewport')).toHaveAttribute(
    'content',
    /viewport-fit=cover/
  );
});

// Kill-switch (pwa-shell): posting KILL_SW clears every cache and unregisters,
// so a future SW deploy can self-disable across the user base. The waits are
// on the observable end state — the handler runs under event.waitUntil, so no
// fixed tick is assumed.
test('PwaShell_PostKillSwitch_ClearsCachesAndUnregisters', async ({ page }) => {
  await page.goto('/');
  await awaitServiceWorkerActive(page);

  // Precondition: the precache exists, so the clear below is observable.
  await page.waitForFunction(async () => (await caches.keys()).length > 0);

  await page.evaluate(() => {
    navigator.serviceWorker.controller?.postMessage('KILL_SW');
  });

  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    const registration = await navigator.serviceWorker.getRegistration();
    return keys.length === 0 && registration === undefined;
  });

  expect(await page.evaluate(async () => caches.keys())).toEqual([]);
  expect(
    await page.evaluate(async () =>
      String(await navigator.serviceWorker.getRegistration())
    )
  ).toBe('undefined');
});
