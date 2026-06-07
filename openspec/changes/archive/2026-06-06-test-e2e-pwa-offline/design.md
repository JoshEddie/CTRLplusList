## Context

Sub-proposal 6.2 of `test-coverage`. The 6.0 harness (archived) provides everything this change runs on: production `next start` servers (Serwist active, `public/sw.js` emitted by the `npm run build` in [scripts/test-e2e.sh](../../../scripts/test-e2e.sh)), the local Docker DB, the two Playwright projects, `workers: 1` / `fullyParallel: false`, and CI. 6.1 (archived) established the flow-spec shape (`e2e-critical-flows`) and the `test/helpers/e2e/` helper home.

What exists for `pwa-shell` today:

- **Unit tier (4.12):** [app/__tests__/manifest.test.ts](../../../app/__tests__/manifest.test.ts) asserts the `manifest()` return shape (already including `id`/`scope`/`orientation`, which the active spec omits); [ServiceWorkerRegistration.test.tsx](../../../app/ui/components/__tests__/ServiceWorkerRegistration.test.tsx) asserts the register-call contract. `app/sw.ts` is excluded from unit coverage by design.
- **Runtime scenarios:** every browser-level `pwa-shell` scenario is phrased against DevTools and has only ever been verified by hand, because `next dev` disables the SW entirely.

The regression history that informs the test set (parent §6.2): `4f2225d` (iOS status bar `black-translucent` + `viewportFit: 'cover'` + app-nav absorbs `env(safe-area-inset-top)`), `7cb308f` (html background `#25194e` backstop), `4f3a7b0` → `dae2301` (pagination overlay `padding-bottom: calc(12px + env(safe-area-inset-bottom))`; manifest `id`/`scope` pin the install identity to `/`), `8b038fc` (toast container offset by top/right insets).

Relevant current source: [app/sw.ts](../../../app/sw.ts) (Serwist `skipWaiting: true`, `clientsClaim: true`, `navigationPreload: true`, no runtime caching routes, KILL_SW handler), [next.config.ts](../../../next.config.ts) (`swDest: 'public/sw.js'`, `additionalPrecacheEntries` for the manifest + both icons, `disable: isDev`), [app/layout.tsx](../../../app/layout.tsx) (Apple metas, `viewportFit: 'cover'`, Toaster inset offsets).

## Goals / Non-Goals

**Goals:**

- Author the PWA/offline e2e specs against the 6.0 harness: SW registration, install-detection surface, offline behavior, kill-switch, and the regression-informed safe-area/top-bar set.
- Pin the **never-cache-HTML** invariant in a real browser — the privacy/staleness property the `pwa-shell` purpose statement exists for.
- Correct the `pwa-shell` spec drift (`status-bar-style`) and elevate the latent manifest-identity and safe-area invariants into the spec.

**Non-Goals:**

- Any harness/execution-model change (`playwright.config.ts` projects, DB target, CI jobs, scripts) — owned by 6.0.
- Making list views *work* offline (runtime caching, offline fallback pages) — a product feature, and one the active `pwa-shell` spec deliberately forbids for HTML.
- Real install-prompt synthesis (`beforeinstallprompt`) or app-store/TWA packaging.
- Unit-coverage changes (`vitest.config.ts` untouched; e2e contributes no per-file coverage).
- Web Push / notifications (explicitly out of `pwa-shell` scope).

## Decisions

### Decision 1 — All specs run in the `authenticated` project

The PWA shell (manifest, SW, safe-area CSS) is identity-independent — it renders identically for any session. The authenticated server is the one where seeded list pages render for the viewer without ceremony, so the offline-list-view pin and the pagination assertions live there naturally. Files use the harness's `.auth.spec.ts` suffix.

**Alternative — duplicate a subset under `guest`. Rejected:** no PWA behavior differs by session; duplicate runs add wall-clock for zero discrimination.

### Decision 2 — Three spec files split by browser-state concern

- `e2e/pwa-shell.auth.spec.ts` — SW registration + install-detection surface (manifest endpoint, head links, Apple metas, icons 200, viewport meta) + kill-switch.
- `e2e/pwa-offline.auth.spec.ts` — the offline behaviors (HTML not served; precache served; cache-storage holds no HTML).
- `e2e/pwa-safe-area.auth.spec.ts` — the regression-informed safe-area/top-bar set.

Offline toggling and KILL_SW mutate browser-context-level state; Playwright isolates each test in a fresh context (and the harness runs `workers: 1`), so the split is for readability and failure-localization, not correctness. Titles follow `<PageOrFlow>_<Action>_<ExpectedOutcome>` (e.g. `PwaShell_VisitAnyRoute_RegistersServiceWorkerAtRootScope`, `PwaOffline_ReloadVisitedList_DoesNotServeHtmlFromCache`).

### Decision 3 — SW readiness protocol: explicit `ready`-wait helper, no sleeps

`ServiceWorkerRegistration` registers on mount; `app/sw.ts` sets `skipWaiting` + `clientsClaim`, so the SW takes control without a reload. Each spec that needs an active SW awaits `navigator.serviceWorker.ready` (and a non-null `controller`, which `clientsClaim` guarantees shortly after activation) inside `page.evaluate`/`page.waitForFunction` — an observable condition, never a timeout. If 2+ files duplicate this glue it is extracted to `test/helpers/e2e/` per the testing-foundation extraction rule (expected: yes, a small `awaitServiceWorkerActive(page)`).

### Decision 4 — "Offline list view" = assert the never-cache-HTML invariant, plus precache availability

The deliberate semantics of "offline" for this app (per the `pwa-shell` purpose): viewer-scoped HTML must NEVER come from a client cache, because a cached list page bypasses the server's `revalidateTag` discipline and can leak stale claim/spoiler state. So the offline spec:

1. Visits a seeded list page with the SW active (so if the SW *were* caching HTML, the copy would now exist).
2. Goes offline (`context.setOffline(true)`) and re-navigates: the navigation SHALL fail (net error — asserted as a rejected `goto`), proving no client cache served HTML.
3. Still offline, fetches a precached asset (`/icons/icon-192.png`, `/manifest.webmanifest`) from page context: the response SHALL succeed — served from the SW precache with the network provably down (step 2 is the evidence the network emulation is biting).
4. Independently of network state, enumerates Cache Storage from page context and asserts no cached response has an HTML content-type — the direct, mechanism-level pin of "SHALL NOT cache HTML".

**Alternative — implement offline support and test it. Rejected:** contradicts the active spec and is a product change, not test coverage. **Alternative — `context.route()` to simulate offline. Rejected:** Playwright request interception does not see SW-mediated fetches, so it cannot black-hole the network for a controlled page; `setOffline` emulates at the network layer beneath the SW. The ordering in steps 2→3 makes the test self-evidencing: if a Chromium/Playwright version ever exempts SW fetches from offline emulation, step 2's failed navigation still proves navigations hit the network, and step 4 still proves no HTML is cached.

### Decision 5 — Install detection = criteria-level assertions, not prompt synthesis

"PWA install detection" is asserted as the set of criteria a browser checks before offering install: served HTML links `rel="manifest"`; the manifest endpoint returns `application/manifest+json` whose JSON carries the full contract (name/short_name/description/start_url/display/background_color/theme_color/icon matrix **and the elevated `id`/`scope`/`orientation`**); every declared icon URL returns 200 with an image content-type; the Apple metas render (iOS install path); the viewport meta carries `viewport-fit=cover`. Headless Chromium does not reliably fire `beforeinstallprompt` (heuristics, flags, and engagement signals vary by version), so prompt synthesis would be flake-by-design.

The unit tier already asserts the `manifest()` *function* shape; the e2e asserts what unit tests cannot see — the **served** endpoint, content-type, head linkage, and that declared URLs actually resolve on the production server. The JSON field assertions deliberately overlap the unit tier at the values level: the e2e is the only tier observing them post-serialization at the real route.

### Decision 6 — Safe-area assertions: CDP inset override as primary, served-CSS assertion as fallback

Desktop Chromium resolves `env(safe-area-inset-*)` to `0px`, which would make computed-style assertions vacuous (`calc(12px + 0px)` = the non-regressed value). Primary mechanism: a CDP session (`context.newCDPSession(page)`) issuing the Emulation safe-area-inset override (available in recent Chromium; Playwright is pinned at ^1.60), then asserting computed styles respond: `.app-nav` height/padding-top grows by the top inset; `.items-pagination` `padding-bottom` grows by the bottom inset (on `/items`, where seeded items render the overlay); the toast container's `top` reflects the top inset; `html` background-color computes to `rgb(37, 25, 78)` (`#25194e`) regardless of insets.

**Fallback** (if the CDP method is absent/ineffective in the pinned Chromium — probed at apply): assert the *served production CSS* — fetch the stylesheet(s) the page links and assert the relevant selectors carry `env(safe-area-inset-top|bottom)` terms, plus the DOM-level assertions that need no insets (viewport meta, status-bar meta, html background). Weaker (text-level, not render-level) but still beyond the unit tier's reach, since it observes the built bundle. The spec deltas phrase scenarios mechanism-neutrally ("WHEN the UA reports a nonzero bottom inset THEN …") so the fallback does not violate a scenario.

The toast-container assertion depends on react-hot-toast rendering its positioned container; if it renders only while a toast is live, the spec triggers a cheap same-server toast first (e.g. the share-copy success on a seeded list) — decided at apply by inspection.

### Decision 7 — Spec-delta write timing follows the archive-time precedent

The `pwa-shell` drift correction (`default` → `black-translucent`) and elevations land as deltas under this change's `specs/` and reach the canonical spec at archive sync — the `test-app-frame` (commit `c2f3e19`) precedent — NOT the apply-time write `test-visit-history` used. §7.11 of the governing change has not ratified a convention; nothing here needs canonical wording mid-flight (the e2e asserts source behavior, which already matches the delta), so the default precedent is the low-risk choice and avoids pre-empting §7.11.

### Decision 8 — Safe-area latent invariants are elevated into `pwa-shell`, not `app-frame`/`items-browser-chrome`

The app-nav top-inset absorption and pagination bottom-inset clearance live in CSS owned (layout-wise) by `app-frame` and `items-browser-chrome`. They are elevated here as a single **standalone safe-area contract** requirement in `pwa-shell` because the concern is cross-cutting PWA display (the rules exist only because `viewportFit: 'cover'` exposes the notch/home-indicator zones in standalone mode), the project convention is that capability ownership follows the concern rather than the DOM region, and the parent §6.2 sanctions elevation "to the `pwa-shell` spec" specifically. The delta cross-references both layout capabilities and changes neither's layout contract.

**Alternative — three MODIFIED deltas (`pwa-shell` + `app-frame` + `items-browser-chrome`). Rejected:** scatters one invariant family across three specs, exceeds the issue's sanctioned spec impact, and each sibling delta would be a single orphaned sentence about a concern that isn't theirs.

### Decision 9 — Kill-switch is asserted end-to-end in one context

Post `KILL_SW` to `navigator.serviceWorker.controller`, then `waitForFunction` until `caches.keys()` resolves empty AND `navigator.serviceWorker.getRegistration()` resolves `undefined` — the exact two-step contract of the `pwa-shell` handler, with the SW's `event.waitUntil` covered by the wait-for (no fixed tick assumption). Context isolation means the unregistration cannot leak into other specs even under `workers: 1`.

## Risks / Trade-offs

- **[`setOffline` vs SW-mediated fetches — emulation gaps across Chromium versions]** → the offline test is self-evidencing (failed navigation proves the network is down before the precache assertion claims cache service); the cache-storage no-HTML enumeration is network-independent; verified empirically at apply.
- **[CDP safe-area override unavailable in pinned Chromium]** → probe at apply; served-CSS fallback already designed (Decision 6); scenarios phrased mechanism-neutrally.
- **[`goto` offline error message varies (`ERR_INTERNET_DISCONNECTED` vs `ERR_FAILED`)]** → assert rejection + match a tolerant error pattern, not an exact string.
- **[SW activation timing flake on cold server]** → observable-condition waits only (`serviceWorker.ready`, `waitForFunction`); no sleeps (assertion-substance bar). CI retries (2) already absorb cold-start transients per the 6.1 hardening.
- **[Precache contains many content-hashed bundle entries]** → assertions key on content-type and the two stable `additionalPrecacheEntries` URLs, never on hashed filenames.
- **[Toast container may not exist without a live toast]** → trigger a same-server toast first, or drop the toast assertion to the served-CSS fallback if no cheap trigger exists (decided at apply; the elevated spec text covers the inset offsets either way).
- **[e2e surfaces a real production defect, as 6.1 did]** → disposition per the established rule: spin off a sub-proposal, or fold in by explicit owner decision recorded in `tasks.md`.
- **[Spec-level overlap: install-surface JSON assertions repeat unit-tier values]** → accepted deliberately (Decision 5) — different observation point (served route vs function return); divergence between the two tiers is itself a signal.

## Migration Plan

Additive, test-only; no production source expected to change. Apply order: (1) spec deltas (`e2e-pwa-offline` new, `pwa-shell` modified, `testing-foundation` Tier-2 bookkeeping); (2) the three `e2e/*.auth.spec.ts` files + any `test/helpers/e2e/` extraction; (3) seed negative-case audit recorded in `tasks.md`; (4) five-gate pre-merge. **Rollback:** delete the spec files and deltas; nothing else references them.

## Open Questions

- Does the pinned Chromium expose the CDP safe-area-inset override? (Probe at apply; fallback designed.)
- Does react-hot-toast render its positioned container with zero live toasts? (Inspect at apply; cheap-toast trigger fallback.)
- Does `navigator.serviceWorker.controller` reliably become non-null without a reload under `clientsClaim` in headless runs, or does the registration spec need one `page.reload()`? (Either satisfies the spec scenario "controller is non-null on the subsequent navigation"; pick the deterministic one at apply.)
