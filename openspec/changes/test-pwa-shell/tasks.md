## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach` (jsdom project).
- [ ] 1.2 Confirm the two-project vitest split routes `.test.ts` → node and `.test.tsx` → jsdom, and that the `@/` alias resolves in both.
- [ ] 1.3 Spec re-grep against `openspec/specs/pwa-shell/spec.md` at HEAD: confirm R1's exact manifest field values, the four-entry icon matrix, and the negative Web-Push clause; confirm no existing requirement locks the `ServiceWorkerRegistration` component contract (R2's "SW is registered after first visit" is a browser-runtime scenario, not the component's unit contract). Confirm the ADDED requirement does not overlap R2/R3/R4/R6.
- [ ] 1.4 Confirm `vitest.config.ts` `coverage.exclude` currently lists BOTH `app/sw.ts` and `app/manifest.ts`; this change removes only `app/manifest.ts`.
- [ ] 1.5 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block; new entries will append to its `files` array.
- [ ] 1.6 Brand-casing grep: confirm `app/manifest.ts` is the SOLE occurrence of `'ctrl+List'` and every other brand string (layout title/OG/Twitter/apple title, logo alts/aria) uses `'Ctrl+List'` — locking Decision 4's source-follows-spec direction.

## 2. Source refactors (in-place, inside carve-out)

- [ ] 2.1 `app/manifest.ts` — change `name: 'ctrl+List'` → `'Ctrl+List'` and `short_name: 'ctrl+List'` → `'Ctrl+List'` (Decision 4, disposition (b)). No other field changes.
- [ ] 2.2 `app/ui/components/ServiceWorkerRegistration.tsx` — drop the dead `typeof window === 'undefined'` operand; guard becomes `if (!('serviceWorker' in navigator)) return;` (Decision 6, disposition (b)). Behavior preserved; the removed branch was unreachable inside `useEffect`.

## 3. Write `app/__tests__/manifest.test.ts` (node project, universal COVERAGE_FLOOR)

### 3A. ShapeContract — top-level fields

- [ ] 3.1 `Invoked_ReturnsNameCtrlPlusList` — `manifest().name === 'Ctrl+List'` (locks the FIXED brand casing per Decision 4).
- [ ] 3.2 `Invoked_ReturnsShortNameCtrlPlusList` — `short_name === 'Ctrl+List'`.
- [ ] 3.3 `Invoked_ReturnsDescriptionMatchingRootMetadata` — `description === 'Create and share your lists with friends and family'` (the R1 "matching root metadata" clause).
- [ ] 3.4 `Invoked_ReturnsIdStartUrlScopeRoot` — `id`, `start_url`, and `scope` each equal `'/'`.
- [ ] 3.5 `Invoked_ReturnsDisplayStandalone_OrientationPortrait` — `display === 'standalone'`, `orientation === 'portrait'`.
- [ ] 3.6 `Invoked_ReturnsThemeAndBackgroundColor25194e` — `background_color === '#25194e'` and `theme_color === '#25194e'`.
- [ ] 3.7 `Invoked_DeclaresNoWebPushFields` — the returned object has no `gcm_sender_id` key (R1 negative clause).

### 3B. IconMatrix — four entries, two sizes × two purposes

- [ ] 3.8 `Icons_ContainsExactlyFourEntries` — `icons.length === 4`.
- [ ] 3.9 `Icons_Has192Any_And192Maskable` — entries with `sizes: '192x192'`, `src: '/icons/icon-192.png'`, `type: 'image/png'`, one `purpose: 'any'` and one `purpose: 'maskable'`.
- [ ] 3.10 `Icons_Has512Any_And512Maskable` — entries with `sizes: '512x512'`, `src: '/icons/icon-512.png'`, `type: 'image/png'`, one `purpose: 'any'` and one `purpose: 'maskable'`.
- [ ] 3.11 `Icons_EverySrcResolvesToExistingPublicFile` — for each icon `src`, `fs.existsSync(path.join(process.cwd(), 'public', src))` is true (locks the R1 "src values resolve to existing files under public/icons/" clause via `node:fs`).

## 4. Write `app/ui/components/__tests__/ServiceWorkerRegistration.test.tsx` (jsdom project, universal COVERAGE_FLOOR)

### 4A. Setup — navigator.serviceWorker stub

- [ ] 4.1 Add a `stubServiceWorker(register)` helper that `Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } })`.
- [ ] 4.2 `afterEach` `Reflect.deleteProperty(navigator, 'serviceWorker')` and `vi.restoreAllMocks()` so the absent-API test sees a clean navigator.

### 4B. RegistrationContract — path, scope, guard, error-swallow, null render (Decision 3 ADDED SHALL)

- [ ] 4.3 `ApiAvailable_RegistersSwJsAtScopeRoot` **Spec delta SHALL** — stub `register` resolving; render; assert `register` called once with `('/sw.js', { scope: '/' })`.
- [ ] 4.4 `ApiUnavailable_DoesNotRegister_DoesNotThrow` **Spec delta SHALL** — no stub installed; render; assert a free-standing `register` spy is never called and the render does not throw.
- [ ] 4.5 `RegisterRejects_RejectionSwallowed` **Spec delta SHALL** — stub `register` rejecting; render; `await Promise.resolve()` to flush microtasks; assert no unhandled rejection surfaced and the component is still mounted (the `.catch(() => {})` arm).
- [ ] 4.6 `Rendered_ProducesNoDom` **Spec delta SHALL** — `expect(container.firstChild).toBeNull()`.
- [ ] 4.7 `Rerendered_RegistersOnlyOnce` **Spec delta SHALL** — stub resolving; render then `rerender`; assert `register` call count stays at 1 (empty dep array).

## 5. Config changes

- [ ] 5.1 In `vitest.config.ts`, REMOVE `'app/manifest.ts'` from `coverage.exclude`. Leave `'app/sw.ts'` in place.
- [ ] 5.2 In `vitest.config.ts`, add two `thresholds` entries under a comment header `// test-pwa-shell (sub-proposal 4.12) — locked at universal COVERAGE_FLOOR.`: `'app/manifest.ts': COVERAGE_FLOOR` and `'app/ui/components/ServiceWorkerRegistration.tsx': COVERAGE_FLOOR`.
- [ ] 5.3 In `eslint.config.mjs`, append `app/manifest.ts` and `app/ui/components/ServiceWorkerRegistration.tsx` to the per-file `sonarjs/cognitive-complexity = error` override `files` array, with a comment header naming the sub-proposal.
- [ ] 5.4 Confirm `vitest.config.ts`'s `coverage.exclude` still covers `**/__tests__/**`; no new exclude line needed for the test files.

## 6. Audits

### 6.1 Assertion-substance audit (on the new tests)

- [ ] 6.1 Walk both test files. Every assertion SHALL name observable output (exact field values, exact call arguments, `null` render, file-existence boolean). Verify specifically: the manifest test asserts the FIXED brand (`'Ctrl+List'`), NOT the latent `'ctrl+List'`; `ApiAvailable_RegistersSwJsAtScopeRoot` asserts the EXACT `('/sw.js', { scope: '/' })` argument shape, not just "called"; `Icons_EverySrcResolvesToExistingPublicFile` asserts real disk existence, not a string match. Record disposition for any flagged test.

### 6.2 Duplication audit (across the two new test files)

- [ ] 6.2 The two files share NO setup (one is node + `node:fs`, the other jsdom + `navigator.serviceWorker` stub). Default disposition: no shared `test-helpers.ts` extracted. Record confirmation.

### 6.3 Complexity audit (on the carve-out source)

- [ ] 6.3 Run `npm run lint`; confirm zero `sonarjs/cognitive-complexity` warnings or errors on `app/manifest.ts` and `app/ui/components/ServiceWorkerRegistration.tsx` (both ≤2, far below 15). Record measured complexities if surfaced.

### 6.4 Testability audit (on the carve-out source)

- [ ] 6.4 Coverage report at universal `COVERAGE_FLOOR` or above for both files. Record per-file metrics from `coverage/coverage-summary.json`.
- [ ] 6.5 `/* v8 ignore */` annotations: expected NONE. The Decision 6 refactor removes the only unreachable branch (the `typeof window` operand), so both files reach 100% with no ignore. If any region is annotated, record file + line + rationale.
- [ ] 6.6 Source refactors taken in-place: (a) `app/manifest.ts` brand casing ×2 (Decision 4); (b) `ServiceWorkerRegistration.tsx` dead `typeof window` operand removal (Decision 6). Confirm both are exercised by the new tests.

### 6.5 Invariant-elevation audit

- [ ] 6.7 Confirm the ADDED `pwa-shell` requirement (ServiceWorkerRegistration contract) is asserted by at least one discrete `<State>_<Behavior>` `it()`: path+scope → §4.3; feature guard → §4.4; error-swallow → §4.5; null render → §4.6; mount-once → §4.7.
- [ ] 6.8 Confirm no test asserts an invariant lacking a corresponding SHALL — every manifest assertion maps to `pwa-shell` R1; every registration assertion maps to the new ADDED requirement.

## 7. Apply spec deltas

- [ ] 7.1 Apply the ADDED requirement from `specs/pwa-shell/spec.md` into the active `openspec/specs/pwa-shell/spec.md`. Validate via `openspec validate pwa-shell --strict`. No existing R1–R6 requirement is modified or removed.
- [ ] 7.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-pwa-shell/specs/testing-foundation/spec.md` stays archive-only (Tier 2 per `test-coverage` design D13) — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`.
- [ ] 7.3 Leave `openspec/changes/test-coverage/tasks.md` §4.12 checkbox unchecked; it flips on archive of this sub-proposal (not at apply).

## 8. Pre-merge

- [ ] 8.1 `npm run lint` passes with zero errors; zero new warnings from the carve-out files.
- [ ] 8.2 `npx tsc --noEmit` exits 0.
- [ ] 8.3 `npm run build` completes successfully — all routes generated, the manifest endpoint emits with the corrected brand casing.
- [ ] 8.4 `npm run test:coverage` passes; both carve-out files at universal `COVERAGE_FLOOR` (98/98/95/100) or above.
- [ ] 8.5 `npm run test:e2e` — record outcome. The runtime PWA behavior (precache, HTML-bypass, kill-switch) lands with 6.2; "No tests found" is vacuously acceptable here.

## 9. Audit disposition record

- [ ] 9.1 Record final dispositions: §6.1 assertion-substance (manifest asserts FIXED brand; register asserts exact args), §6.2 duplication (no shared helper), §6.3 complexity (both ≤2), §6.4 testability (per-file metrics), §6.5 v8-ignore (expected none), §6.6 refactors (manifest casing + dead-operand removal), and the §8 four-gate results.
