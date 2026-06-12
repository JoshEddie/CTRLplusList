## 1. Apply-time probes (resolve the design's open questions before authoring assertions)

- [x] 1.1 Bring up the harness (`npm run test:e2e` once, or `setup-e2e-db.sh` + build + `npx playwright test --ui`) and confirm the production servers emit and serve `/sw.js` (Serwist active under `next start`); record the result in this file. **Result:** build logs `(serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'`; `GET /sw.js` → 200 `application/javascript` on the authenticated server.
- [x] 1.2 Probe whether `navigator.serviceWorker.controller` becomes non-null without a reload under `clientsClaim` in headless Chromium; pick the deterministic readiness protocol (plain wait vs one `page.reload()`) and note the choice (design Decision 3 / open question 3). **Result:** controller is non-null with NO reload (`clientsClaim` claims the visiting page). Protocol: `navigator.serviceWorker.ready` then `waitForFunction(() => navigator.serviceWorker.controller !== null)` — no reload, no sleeps.
- [x] 1.3 Probe the CDP safe-area-inset override in the pinned Chromium (`context.newCDPSession(page)` + the Emulation inset override): if computed styles respond, the primary mechanism is GO; otherwise adopt the served-CSS fallback (design Decision 6) and note which path the safe-area spec uses. **Result:** `Emulation.setSafeAreaInsetsOverride` works — `.app-nav` padding-top `0px → 47px` under `top: 47`; `.items-pagination` padding-bottom `46px` (= 12 + 34) under `bottom: 34`; the override persists across same-session navigations. Primary CDP mechanism is GO; served-CSS fallback not needed.
- [x] 1.4 Probe `context.setOffline(true)` against a SW-controlled page: confirm an offline navigation rejects with a net error while a precached-asset fetch succeeds (design Decision 4's self-evidencing order); record the observed error pattern for the tolerant match. **Result:** offline HTML fetch from the SW-controlled client rejects (`Failed to fetch`); `/icons/icon-192.png` and `/manifest.webmanifest` serve 200 from precache while offline; offline `goto` rejects with `net::ERR_INTERNET_DISCONNECTED`. Tolerant match: `/ERR_INTERNET_DISCONNECTED|ERR_FAILED/`.
- [x] 1.5 Inspect whether react-hot-toast renders its positioned container with zero live toasts; if not, identify the cheapest same-server toast trigger (e.g. share-copy success on a seeded list) for the toast-inset assertion, or adopt the served-CSS fallback for that one assertion. **Result:** the container div renders with zero live toasts, carrying inline `top:calc(16px + env(safe-area-inset-top))` / `right:calc(16px + env(safe-area-inset-right))` (computed top `16px` at zero inset). No toast trigger needed — assert its computed top under the CDP override.

## 2. Shared e2e helper

- [x] 2.1 Add `awaitServiceWorkerActive(page)` (readiness protocol from 1.2: awaits `navigator.serviceWorker.ready` + non-null controller via observable conditions, no sleeps) to `test/helpers/e2e/` — extracted because both `pwa-shell` and `pwa-offline` specs need it (testing-foundation extraction rule). **Added to the existing `test/helpers/e2e/utils.ts` (co-located helper home); returns the registration scope.**

## 3. `e2e/pwa-shell.auth.spec.ts` — registration, install detection, kill-switch

- [x] 3.1 Registration spec (`PwaShell_VisitAnyRoute_RegistersServiceWorkerAtRootScope` or per the 1.2 protocol): visit a route, await SW active, assert registration scope is the origin root and the page is controlled. Covers `e2e-pwa-offline` "Visiting a route registers the service worker at root scope" and automates `pwa-shell`'s "SW is registered after first visit" / "SW registration in production build".
- [x] 3.2 Install-detection specs: served HTML links `rel="manifest"`; `GET /manifest.webmanifest` returns `application/manifest+json` with the full contract including `id: '/'`, `scope: '/'`, `orientation: 'portrait'`; every declared `icons[].src` returns 200 with an image content-type. Covers "Served manifest meets the install contract".
- [x] 3.3 Install-path metadata spec: Apple metas render (`apple-mobile-web-app-capable`, `-title`, `-status-bar-style` = `black-translucent`, `format-detection`) and the viewport meta contains `viewport-fit=cover`. Covers "Served HTML carries the install-path metadata" and the `pwa-shell` Apple-meta scenario (drift-corrected value). No `beforeinstallprompt` synthesis anywhere in the file.
- [x] 3.4 Kill-switch spec: with the SW controlling, post `KILL_SW`, then `waitForFunction` until `caches.keys()` is empty AND `getRegistration()` is `undefined`. Covers "Kill-switch clears caches and unregisters" and automates `pwa-shell`'s KILL_SW scenario.

## 4. `e2e/pwa-offline.auth.spec.ts` — the never-cache-HTML pin + precache availability

- [x] 4.1 Offline list-view spec, in the self-evidencing order (design Decision 4): visit a seeded list page with SW active → `context.setOffline(true)` → re-navigate and assert the navigation rejects with a net error (tolerant pattern from 1.4) → still offline, fetch `/icons/icon-192.png` and `/manifest.webmanifest` from page context and assert both succeed. Covers "A previously-visited list page is not served offline" + "Precached assets are served without network".
- [x] 4.2 Cache-storage enumeration spec (network-independent): after navigating with SW active, enumerate every Cache Storage entry from page context and assert no cached response has an HTML content-type; key assertions on content-type and the two stable `additionalPrecacheEntries` URLs, never hashed filenames. Covers "Cache Storage holds no HTML".

## 5. `e2e/pwa-safe-area.auth.spec.ts` — regression-informed safe-area / top-bar set

- [x] 5.1 Top-inset spec (mechanism per 1.3): nonzero top inset ⇒ `.app-nav` height/top padding grow by the inset; toast container top offset includes it (trigger per 1.5 if needed). Covers "Nonzero top inset keeps nav and toasts below the notch" (regressions `4f2225d`, `8b038fc`).
- [x] 5.2 Bottom-inset spec: on `/items` (seeded items render the floating overlay), nonzero bottom inset ⇒ `.items-pagination` bottom padding grows by the inset while the overlay box stays flush with the container bottom edge (no `items-browser-chrome` layout redefinition). Covers "Nonzero bottom inset lifts pagination above the home indicator" (regressions `7cb308f`, `4f3a7b0`→`dae2301`).
- [x] 5.3 Backstop spec: `html` computed background color is `rgb(37, 25, 78)` (`#25194e`). Covers "Status-bar zone shows the app background" (regression `7cb308f`).

## 6. Seed negative-case audit (record dispositions here when done)

- [x] 6.1 Fixture (a): any route rendering for the seeded viewer (SW + install surface) — record disposition (expected: defensive selection against the existing seed). **Disposition: defensive selection** — `/` and `/items` render for the default `dev-test-viewer` session; no seed change.
- [x] 6.2 Fixture (b): a seeded list page to visit before going offline — record disposition. **Disposition: defensive selection** — `/lists/dev-list-viewer-birthday` ("Test Viewer's Birthday"), the same seeded fixture `owner-spoiler.auth.spec.ts` uses; asserted by its user-visible heading before going offline; no seed change.
- [x] 6.3 Fixture (c): a page where `.items-pagination` renders (the `/items` library with seeded items) — record disposition; if the seed volume does not render the overlay, decide build-own-state vs seed extension (any seed edit carries the seed-as-fixture review-coupling note). **Disposition: defensive selection** — the seeded item volume renders the floating `.items-pagination` overlay on `/items` (asserted visible in the spec); no seed extension.

## 7. Governance checks

- [x] 7.1 `openspec validate test-e2e-pwa-offline --strict` passes.
- [x] 7.2 Confirm the diff touches NO harness/execution-model surface: `playwright.config.ts`, `docker-compose.e2e.yml`, `scripts/*e2e*`, CI workflows, and `vitest.config.ts` are all unchanged (testing-foundation Tier-2 delta scenarios). **Verified via `git status --porcelain`: the diff is exactly `test/helpers/e2e/utils.ts` (helper), the three `e2e/pwa-*.auth.spec.ts` files, and `openspec/changes/test-e2e-pwa-offline/`.**
- [x] 7.3 Confirm no production source changed; if a spec surfaced a real defect, record the owner's disposition decision here (spin off a sub-proposal, or fold in by explicit owner decision) before proceeding. **No production source changed; every spec passed against shipped source — no defect surfaced, no disposition needed.**
- [x] 7.4 Spec-delta write timing: confirm the `pwa-shell` corrections live ONLY in this change's `specs/` delta (archive-time write per design Decision 7); the active `openspec/specs/pwa-shell/spec.md` is untouched at apply. **Confirmed — `openspec/specs/` absent from the diff.**

## 8. Pre-merge

- [x] 8.1 `npm run lint` passes with zero errors and zero warnings. **0 errors.** (2 warnings remain in `Avatar.tsx` + `seed-dev-users.ts` — verified pre-existing on the base commit via stash-run and untouched by this change; same recording precedent as 6.1 §7.1, pending the governing §7.4 gate reconciliation.)
- [x] 8.2 `npx tsc --noEmit` passes with zero errors.
- [x] 8.3 `npm run build` completes successfully. **Compiled clean; serwist bundled `/sw.js` at scope `/`; 22/22 pages generated.**
- [x] 8.4 `npm run test:coverage` passes with zero failing tests. **151 files, 1879 tests passed; no threshold failures; `vitest.config.ts` untouched by this change.**
- [x] 8.5 `npm run test:e2e` passes with zero failing tests (full suite — the new PWA specs plus the existing critical-flow specs). **18/18 passed (9 pre-existing critical-flow + 9 new PWA specs) against the reset fixture.**
