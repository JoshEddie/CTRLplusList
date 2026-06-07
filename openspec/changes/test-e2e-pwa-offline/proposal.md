## Why

Sub-proposal 6.2 of the `test-coverage` initiative ([issue #56](https://github.com/JoshEddie/CTRLplusList/issues/56)). The carve-out is the **PWA / offline e2e specs** — Playwright coverage of PWA install detection, the offline behavior of a list view, and service worker registration. The parent `test-coverage` `tasks.md` §6.2 names this set and notes: "Recent regressions (PWA top-bar, safe-area padding, pagination) inform the test set."

Until `test-e2e-foundation` (6.0) landed, none of this was automatable: the Serwist plugin is `disable: true` in development ([next.config.ts](../../../next.config.ts)), so no service worker exists under `next dev` — every `pwa-shell` runtime scenario ("SW is registered after first visit", "HTML responses are not served from SW cache", "KILL_SW clears caches and unregisters", "SW registration in production build") was phrased against DevTools and verified by hand. The 6.0 harness runs **production `next start` servers**, where `public/sw.js` is emitted and registered — the first environment in which these scenarios can be asserted by a real browser test. The unit tier (4.12 `test-pwa-shell`) covered `app/manifest.ts` shape and the `ServiceWorkerRegistration` component contract; the compiled service worker (`app/sw.ts`) was explicitly excluded from unit coverage and deferred to this sub-proposal.

**Depends on 6.0 `test-e2e-foundation` ([issue #102](https://github.com/JoshEddie/CTRLplusList/issues/102), archived).** The execution model — local Docker DB target, production-build servers, the two-project session harness, CI tiers — is 6.0's contract. This sub-proposal authors **only the PWA/offline specs** against that harness. It SHALL NOT reshape `playwright.config.ts`'s execution-model design, choose DB targets, or define new e2e CI jobs.

Inherited constraints surfaced by spec-grep (every binding SHALL applies verbatim):

- `pwa-shell` (active) — the capability under test. Binding SHALLs pinned here: SW scope `/` serving **only non-HTML assets** ("every navigation … SHALL bypass the service worker cache and hit the network"); precache of `self.__SW_MANIFEST` entries plus `/manifest.webmanifest` and `/icons/*`; the KILL_SW message handler's clear-then-unregister sequence; the manifest field contract; the retained iOS Apple meta tags; registration via `navigator.serviceWorker.register('/sw.js', { scope: '/' })`. **Drift found:** the active spec's Apple-meta scenario still says `apple-mobile-web-app-status-bar-style` `content="default"`, but source ([app/layout.tsx](../../../app/layout.tsx)) has shipped `black-translucent` since regression fix `4f2225d`; the spec's manifest requirement omits `id: '/'`, `scope: '/'`, and `orientation: 'portrait'`, which source ships (and the 4.12 unit tests already assert) since fix `4f3a7b0` pinned the install identity to root. This change corrects the drift and elevates those latent invariants (sanctioned by the parent §6.2: "MAY elevate latent invariants to the `pwa-shell` spec").
- `testing-foundation` (active) — the 6.0 Tier-1 execution model: e2e runs against the local Docker Postgres via `USE_PG_DRIVER`, production builds via `next start`, separate authenticated/guest server processes, same-server-or-seeded-state assertion discipline; plus the assertion-substance bar, the Playwright naming convention `<PageOrFlow>_<Action>_<ExpectedOutcome>`, and seed-as-fixture (a seed edit is a breaking change to the suite).
- `e2e-critical-flows` (active, 6.1) — flow-level precedent this capability mirrors: enumerated flows SHALL stay covered; no real external authentication or rate-limited services (the PWA specs call none).
- `items-browser-chrome` (active) — owns the `.items-pagination` overlay this change's safe-area regression set touches: "positioned absolutely at the bottom of its items-browser container … sits flush against the container's actual bottom edge." Its `padding-bottom: calc(12px + env(safe-area-inset-bottom))` home-indicator clearance (fix `dae2301`) is currently latent — unspecced. The pagination *layout* stays owned by `items-browser-chrome`; this change elevates only the **safe-area participation** of that overlay, as part of the PWA standalone safe-area contract in `pwa-shell` (see Capabilities).
- `app-frame` (active) — owns the top nav whose `env(safe-area-inset-top)` absorption (fix `4f2225d`) is likewise latent; same treatment: layout stays with `app-frame`, safe-area participation is elevated into the `pwa-shell` standalone contract.

Cache-freshness note (per the proposal rule): this change adds **no server-side reads and no mutations** — it consumes no cache tag and needs no revalidation path. The specs only read seeded pages. No interactive-surface primitive is added or modified — the specs drive existing surfaces read-only.

## What Changes

- **NEW** `e2e/` Playwright specs (authenticated project — the PWA shell is identity-independent and list pages render for the seeded viewer), named per `<PageOrFlow>_<Action>_<ExpectedOutcome>`:

  - **Service worker registration** — on a production server, a page visit registers `/sw.js` at scope `/` (`navigator.serviceWorker.ready` resolves; the controller is non-null once active). Automates `pwa-shell`'s previously-manual "SW is registered after first visit" / "SW registration in production build" scenarios.

  - **PWA install detection** (installability surface) — the served HTML links `rel="manifest"`; `GET /manifest.webmanifest` returns `application/manifest+json` with the full field contract **including the install-identity pins `id: '/'` and `scope: '/'`**; every declared icon URL serves 200; the Apple meta tags render (including `black-translucent`); the viewport meta carries `viewport-fit=cover`. Together these are the criteria a browser checks before offering install — asserted at the criteria level (no `beforeinstallprompt` synthesis, which headless Chromium does not reliably fire).

  - **Offline list view** — the deliberate shape of "offline" for this app: with the SW active and the browser offline, a **previously-visited list page does NOT render from any client cache** (the navigation fails — pinning the never-cache-HTML invariant that protects viewer-scoped purchase/spoiler data from stale client copies), while **precached non-HTML assets** (`/icons/*`, `/manifest.webmanifest`) ARE served from the SW precache without network. Also asserts the cache-storage state directly: after navigation, no cache entry holds an HTML response.

  - **Kill-switch** — posting `KILL_SW` to the controller clears all caches and unregisters the SW, automating `pwa-shell`'s DevTools-manual scenario.

  - **Regression-informed safe-area / top-bar set** (from fixes `4f2225d`, `7cb308f`, `4f3a7b0`→`dae2301`, `8b038fc`): the status-bar contract (`black-translucent` meta + the `html` background backstop `#25194e`) and the safe-area participation of the app-nav (top inset), the items/list pagination overlay (bottom inset), and the toast container (top inset). Mechanism (CDP safe-area-inset override vs. served-CSS assertion) is a design decision.

- **NEW** capability spec `e2e-pwa-offline` — the durable contract for which PWA behaviors SHALL stay e2e-covered, mirroring `e2e-critical-flows`' shape (enumerated coverage + harness-consumption + no-external-services).

- **MODIFIED** `pwa-shell` — drift correction + latent-invariant elevation (details under Capabilities). Spec-only: **no production source changes** are expected; source already ships every behavior being specced.

- **NEW** `testing-foundation` carve-out bookkeeping (archive-only, Tier 2 per `test-coverage` design D13), mirroring 6.1's: records the PWA/offline specs authored against the 6.0 harness and the seed negative-case audit outcome.

- **Seed negative-case audit** (its fixtures): the specs need only (a) any route that renders for the seeded viewer (SW + install surface), (b) a seeded list page to visit-then-go-offline, and (c) a page where `.items-pagination` renders (the `/items` library with seeded items). All expected to be reachable from the existing seed via defensive selection; disposition recorded at apply time.

- **NO** `vitest.config.ts` coverage-floor changes (e2e contributes no per-file unit coverage). **NO** new dependencies (`@playwright/test` already installed). **NO** harness/CI execution-model changes.

## Capabilities

### New Capabilities

- `e2e-pwa-offline`: the PWA/offline e2e contract — service worker registration on a production server, the installability surface (manifest + icons + Apple metas + viewport), offline behavior (HTML never served from client cache; precached assets served without network), the kill-switch, and the regression-informed safe-area/top-bar assertions. References `test-e2e-foundation` for the execution model — does not redefine it.

### Modified Capabilities

- `pwa-shell`: (1) **drift correction** — the Apple-meta requirement/scenario updated from `apple-mobile-web-app-status-bar-style` `default` to the shipped `black-translucent` (regression fix `4f2225d`; the iOS top-bar shows the app gradient through a translucent status bar). (2) **Manifest identity elevation** — the manifest requirement gains `id: '/'`, `scope: '/'`, and `orientation: 'portrait'` (fix `4f3a7b0`: without `id`, the home-screen identity derives from whichever URL was open at install, landing beta installs off-root; already unit-asserted, now specced). (3) **NEW standalone safe-area requirement** — `viewportFit: 'cover'` in the root viewport export (what makes `env(safe-area-inset-*)` resolve at all), the `html` background backstop `#25194e`, and the safe-area participation of the app-nav (top), pagination overlays (bottom), and toast container (top). The owning layout capabilities (`app-frame`, `items-browser-chrome`) keep their layout contracts; `pwa-shell` owns the cross-cutting safe-area/standalone-display concern (capability ownership follows the concern, not the DOM region).
- `testing-foundation`: carve-out bookkeeping written to this sub-proposal's **archive-only** delta (Tier 2 per `test-coverage` design D13) — PWA/offline specs authored against the 6.0 harness; seed negative-case audit recorded. No change to the active spec; no roll-up into the parent accumulator (the e2e execution model rolled in via 6.0).

## Impact

- **New files:** the `e2e/*.auth.spec.ts` PWA/offline specs; the `e2e-pwa-offline`, `pwa-shell`, and `testing-foundation` deltas under this change's `specs/`.
- **Modified files:** none expected in production source — the `pwa-shell` delta corrects the spec to match shipped source, not the reverse. If an e2e spec surfaces a real defect (as 6.1's did), disposition follows the established rule: spin off a sub-proposal, or fold in by explicit owner decision.
- **Prerequisites (both archived):** 6.0 `test-e2e-foundation` (harness, production servers, Docker DB, CI tiers); 6.1 `test-e2e-critical-flows` (precedent shape for flow-level e2e capability specs).
- **No new dependencies; no schema, DAL, action, or cache-tag changes.**
- **Closes:** [issue #56](https://github.com/JoshEddie/CTRLplusList/issues/56) when `openspec archive test-e2e-pwa-offline` runs (flips parent `test-coverage` `tasks.md` §6.2).
