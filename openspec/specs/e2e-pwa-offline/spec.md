# e2e-pwa-offline Specification

## Purpose

TBD - created by archiving change test-e2e-pwa-offline. Update Purpose after archive.
## Requirements
### Requirement: PWA shell runtime behaviors SHALL be covered by an end-to-end test

The repository SHALL maintain Playwright end-to-end specs under `e2e/` that exercise the PWA shell in a real browser against a production-build server (the only environment where the service worker exists — Serwist is disabled in development). Each behavior SHALL be covered by at least one spec asserting an observable outcome, NOT mere execution. Removing or disabling coverage of any listed behavior SHALL be a violation of this requirement.

The covered behaviors SHALL be:

1. **Service worker registration** — visiting a route registers `/sw.js` at scope `/` and the service worker takes control of the page.
2. **Install detection (installability surface)** — the served app meets the criteria a browser checks before offering install (see the dedicated requirement below).
3. **Offline list view** — with the service worker active and the network down, HTML is never served from a client cache while precached non-HTML assets are (see the dedicated requirement below).
4. **Kill-switch** — posting `KILL_SW` to the controlling service worker clears all caches and unregisters it.
5. **Safe-area / top-bar regression set** — the regression-informed assertions enumerated in the dedicated requirement below.

#### Scenario: Visiting a route registers the service worker at root scope

- **WHEN** a spec visits any route on the production-build server and awaits service worker readiness
- **THEN** the registration's scope is the origin root `/`
- **AND** the page becomes controlled by the service worker (`navigator.serviceWorker.controller` is non-null) without any manual DevTools step

#### Scenario: Kill-switch clears caches and unregisters

- **WHEN** a spec posts `KILL_SW` to the controlling service worker
- **THEN** the spec observes (by waiting on the observable condition, not a fixed delay) that `caches.keys()` resolves to an empty array
- **AND** `navigator.serviceWorker.getRegistration()` resolves to `undefined`

#### Scenario: Dropping a behavior fails the suite

- **WHEN** a future change removes or skips the spec covering any listed behavior
- **THEN** the corresponding e2e coverage is absent and this requirement is violated

### Requirement: Offline navigation SHALL NOT be served from a client cache, while precached assets SHALL be

The offline specs SHALL pin the `pwa-shell` never-cache-HTML invariant — the property protecting viewer-scoped pages (lists, items, purchases with spoiler hiding) from being served by a client cache that does not see the server's `revalidateTag` discipline. "Offline list view" for this app deliberately means the list view is NOT available offline. The spec SHALL first visit a list page with the service worker active (so that a cached copy would exist if the service worker cached HTML), and only then assert offline behavior, in an order that makes the network emulation self-evidencing: the failed navigation proves the network is down before any assertion credits the precache.

#### Scenario: A previously-visited list page is not served offline

- **WHEN** a spec visits a seeded list page with the service worker active, takes the browser context offline, and re-navigates to that page
- **THEN** the navigation fails with a network error
- **AND** no stale copy of the page's HTML is rendered from any client cache

#### Scenario: Precached assets are served without network

- **WHEN** the same offline context (network provably down per the failed navigation) fetches `/icons/icon-192.png` and `/manifest.webmanifest` from page context
- **THEN** both responses succeed, served from the service worker precache

#### Scenario: Cache Storage holds no HTML

- **WHEN** a spec enumerates every Cache Storage entry from page context after navigating the app with the service worker active
- **THEN** no cached response has an HTML content-type

### Requirement: Install detection SHALL be asserted at the criteria level

The install-detection specs SHALL assert the criteria a browser evaluates before offering install, as served by the production server: the HTML head links `rel="manifest"`; `GET /manifest.webmanifest` returns `Content-Type: application/manifest+json` and JSON carrying the `pwa-shell` manifest contract including the install-identity fields `id: '/'` and `scope: '/'`; every icon URL declared in the manifest returns HTTP 200 with an image content-type; the Apple meta tags render (the iOS install path, including `apple-mobile-web-app-status-bar-style` `black-translucent`); and the viewport meta carries `viewport-fit=cover`. The specs SHALL NOT attempt to synthesize or await a `beforeinstallprompt` event — headless install-prompt heuristics are version-dependent and flaky by design — and SHALL NOT call any external service.

#### Scenario: Served manifest meets the install contract

- **WHEN** a spec fetches `/manifest.webmanifest` from the production server
- **THEN** the response is `application/manifest+json` whose JSON includes `id: '/'`, `scope: '/'`, `start_url: '/'`, `display: 'standalone'`, the name/short_name/description/theme/background values, and the 192/512 × any/maskable icon matrix
- **AND** every `icons[].src` URL returns HTTP 200 with an image content-type

#### Scenario: Served HTML carries the install-path metadata

- **WHEN** a spec loads any route
- **THEN** the document head links `rel="manifest"` pointing at `/manifest.webmanifest`
- **AND** the Apple meta tags render with `apple-mobile-web-app-status-bar-style` set to `black-translucent`
- **AND** the viewport meta contains `viewport-fit=cover`

#### Scenario: No install prompt synthesis

- **WHEN** the install-detection specs run
- **THEN** they assert the criteria above and stop short of synthesizing or waiting for `beforeinstallprompt`

### Requirement: The safe-area and top-bar regression set SHALL stay covered

The suite SHALL keep e2e assertions over the regression family fixed by commits `4f2225d`, `7cb308f`, `4f3a7b0`→`dae2301`, and `8b038fc` (PWA top-bar, safe-area padding, pagination). The behavioral contract for these surfaces is owned by the `pwa-shell` standalone safe-area requirement (added by this change); the layout contracts of the affected regions remain owned by `app-frame` (the nav) and `items-browser-chrome` (the pagination overlay) — this requirement adds only the obligation that the safe-area participation stays e2e-asserted. Scenarios are mechanism-neutral: the suite MAY produce a nonzero inset via browser emulation, or where the toolchain cannot, assert the served production CSS carries the inset terms.

#### Scenario: Top inset is absorbed above the content

- **WHEN** the UA reports a nonzero top safe-area inset (or the served CSS is inspected where emulation is unavailable)
- **THEN** the app-nav's height and top padding grow by that inset so the logo/menu sit below the notch
- **AND** the toast container's top offset includes that inset

#### Scenario: Bottom inset lifts pagination above the home indicator

- **WHEN** the UA reports a nonzero bottom safe-area inset on a page rendering the floating `.items-pagination` overlay (or the served CSS is inspected where emulation is unavailable)
- **THEN** the overlay's bottom padding grows by that inset so its controls clear the home-indicator zone
- **AND** the overlay box itself stays flush with the container's bottom edge per the `items-browser-chrome` layout contract

#### Scenario: Status-bar zone shows the app background

- **WHEN** a spec loads any route
- **THEN** the `html` element's computed background color is `#25194e` (the backstop visible through the translucent iOS status bar)

### Requirement: PWA/offline specs SHALL run under the foundation harness without redefining it

The specs SHALL run under the e2e execution harness established by `test-e2e-foundation`, in the **authenticated** session mode (the PWA shell is identity-independent; the authenticated server renders seeded list pages without ceremony). This capability SHALL NOT redefine harness mechanics — server configuration, DB target, build pipeline, CI — those are the foundation's contract. Specs SHALL await observable service-worker conditions (readiness, controller, cache state), never fixed delays, and SHALL assert only state their own server produced or the seed established.

#### Scenario: Specs run in the authenticated project

- **WHEN** the PWA/offline specs execute
- **THEN** they run under the authenticated session mode against the production-build server the foundation harness provides

#### Scenario: Readiness is awaited on observable conditions

- **WHEN** a spec requires an active service worker or a settled cache state
- **THEN** it waits on the observable condition (e.g. `navigator.serviceWorker.ready`, a `waitForFunction` over `caches.keys()`)
- **AND** no fixed sleep stands in for the condition
