## Context

Sub-proposal 4.12 of the `test-coverage` initiative — the PWA-shell carve-out. All six primitive-family carve-outs (3.1–3.6), the foundation work (1.1–1.2, 2.1, 0.1), and the first capability-flow carve-out (4.1 `test-app-frame`) are archived. The `testing-foundation` capability is established and hardened: `__tests__/` colocation, the universal per-file floor `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the four-audit + invariant-elevation obligations, and the two-project vitest split (`.test.tsx`→jsdom, `.test.ts`→node) are all stable.

Like `test-app-frame`, this carve-out elevates against an **already-substantive** spec (`pwa-shell`, six real requirements). Unlike `test-app-frame`, the spec edit here is small: the existing R1 manifest contract is already correct, so the source is refactored to match it (no spec modification), and ONE new requirement is ADDED to lock the `ServiceWorkerRegistration` client-side contract that no requirement currently states.

Carve-out (per parent `test-coverage` tasks.md §4.12):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/manifest.ts` | 42 | Pure, DOM-free factory. Returns a static `MetadataRoute.Manifest` literal: name / short_name / description / id / start_url / scope / display / orientation / background_color / theme_color + a 4-entry `icons` array (192 & 512, each × `any`/`maskable`). No branches, no inputs. | **node project**; single `manifest()` invocation + shape assertions; `node:fs` `existsSync` to verify icon `src` files exist under `public/icons/` |
| `app/ui/components/ServiceWorkerRegistration.tsx` | 15 | `'use client'`. A `useEffect(…, [])` that, when `'serviceWorker' in navigator`, calls `navigator.serviceWorker.register('/sw.js', { scope: '/' })` and swallows rejection via `.catch(() => {})`. Returns `null`. | **jsdom project** + RTL; `navigator.serviceWorker` stubbed via `Object.defineProperty`; register stubbed to resolve / reject / be absent |

Explicitly OUT of carve-out (per §4.12): `app/sw.ts` (Serwist precache + `KILL_SW` handler) — browser-runtime, covered by 6.2 `test-e2e-pwa-offline`. Also out of scope: `app/layout.tsx` (the render site + manifest/Apple-meta convention; coverage-excluded layout file) and `next.config` (the Serwist `disable: isDev` wiring — R6 territory, exercised by 6.2).

Coverage floor: universal `COVERAGE_FLOOR` (98 / 98 / 95 / 100). Per-file thresholds are added by-name in `vitest.config.ts`, referencing the constant.

Bound by:

- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `pwa-shell` (active) — owns six SHALLs. This sub-proposal asserts R1 (manifest shape) as-is and ADDS one SHALL (Decision 3). No existing requirement is MODIFIED or REMOVED.

## Goals / Non-Goals

**Goals:**

- Land two colocated test files at the universal `COVERAGE_FLOOR` — one node (`manifest.test.ts`), one jsdom (`ServiceWorkerRegistration.test.tsx`).
- Assert every observable property of both files — no execute-for-coverage invocations, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for both files via `eslint.config.mjs` per-file overrides.
- Remove `app/manifest.ts` from `vitest.config.ts`'s `coverage.exclude` (it carries a real, testable field-value contract) and add per-file thresholds for both files referencing `COVERAGE_FLOOR`.
- Refactor two source drifts in-place: the manifest brand-casing (`'ctrl+List'` → `'Ctrl+List'`) and the dead `typeof window === 'undefined'` operand in the registration guard.
- ADD one call-time SHALL to the `pwa-shell` spec (the `ServiceWorkerRegistration` registration contract).
- Complete the four-audit + invariant-elevation obligation, recording dispositions in `tasks.md`.

**Non-Goals:**

- No coverage of `app/sw.ts` — out of carve-out; 6.2 `test-e2e-pwa-offline` exercises the precache / HTML-bypass / `KILL_SW` runtime behavior in a real service-worker context (jsdom has no SW runtime).
- No coverage of `app/layout.tsx` — the render site of `<ServiceWorkerRegistration />` and the host of the manifest/Apple-meta convention. It is a coverage-excluded layout file and out of carve-out.
- No fix for the R4 Apple-meta drift (`apple-mobile-web-app-status-bar-style`: spec says `"default"`, `layout.tsx` says `"black-translucent"`). That drift lives in `layout.tsx` (out of carve-out, coverage-excluded). Noted in `proposal.md` and deferred to whatever sub-proposal owns layout-metadata coverage.
- No new `pwa-shell` requirement for R2/R3/R6 — those govern `sw.ts` / `next.config` and belong to 6.2.
- No real service-worker registration. jsdom does not implement `navigator.serviceWorker`; the test stubs it. No real `/sw.js` is fetched.
- No DOM-snapshot tests. Every assertion names a specific field value, exact string, call argument, or DOM property.

## Decisions

### Decision 1: One `.test.*` per executable source file; the manifest test runs under the node project, the registration test under jsdom.

The carve-out has two source files in two locations. Each gets its own colocated test under a `__tests__/` directory:

- `app/__tests__/manifest.test.ts` — **node project** (`.test.ts`). `manifest.ts` is a pure factory with no DOM or React; the node project is the right environment, and it grants `node:fs` access so the test can assert the icon `src` paths resolve to files that actually exist under `public/icons/` (locking the R1 scenario's "src values resolve to existing files" clause — a substantive cross-artifact check a jsdom test could not cleanly make). This is the first `__tests__/` directory under `app/` directly (siblings live under `app/ui/...`); colocation next to `app/manifest.ts` requires it.
- `app/ui/components/__tests__/ServiceWorkerRegistration.test.tsx` — **jsdom project** (`.test.tsx`). The component is a React client component with a mount effect; it needs a DOM and RTL.

**Alternatives considered:**

- *Both tests as `.test.tsx` under jsdom, for uniformity.* Rejected — `manifest.ts` has no DOM dependency, and putting its test under jsdom forfeits clean `node:fs` access to verify icon files (jsdom's module environment can still import `node:fs`, but the node project is the semantically correct home and matches the `test-pure-libs` precedent for DOM-free modules). The two-project split exists precisely to route DOM-free tests to node.
- *One combined `pwa-shell.test.tsx` covering both files.* Rejected — destroys per-source-file coverage attribution and forces a single environment on two files with different needs. Same reasoning as every prior carve-out's one-file-per-source rule.

### Decision 2: `app/manifest.ts` is removed from `coverage.exclude` and locked at `COVERAGE_FLOOR`.

At HEAD, `vitest.config.ts`'s `coverage.exclude` lists both `app/sw.ts` and `app/manifest.ts` — they were excluded as no-executable-behavior config surfaces (alongside `field-icons.tsx`, the constant ReactNode table). But `pwa-shell` R1 is a substantive field-value contract: a test that invokes `manifest()` and asserts each documented field would fail loudly if a contributor changed `theme_color`, dropped a `maskable` icon, or renamed the app. That is observable behavior, not a constant table. So `app/manifest.ts` is REMOVED from `coverage.exclude` and gets a `COVERAGE_FLOOR` threshold entry. The single `manifest()` invocation covers 100% of the factory (no branches).

`app/sw.ts` STAYS excluded — it is out of carve-out, has no unit-testable surface in jsdom (it relies on `ServiceWorkerGlobalScope`, `self.__SW_MANIFEST`, `caches`), and is covered by 6.2 at the e2e layer.

**Alternative considered:** *Leave `manifest.ts` excluded and skip its test, treating §4.12 as covering only `ServiceWorkerRegistration.tsx`.* Rejected — the parent tasks.md §4.12 names "`app/manifest.ts` shape" explicitly as in-scope. The shape IS the contract; excluding it would leave R1 unlocked.

### Decision 3: ADD one `pwa-shell` requirement for the `ServiceWorkerRegistration` client-side contract.

The source at HEAD (after the Decision 6 refactor):

```tsx
'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);
  return null;
}
```

The existing `pwa-shell` R2 ("A service worker is registered for every route and serves only non-HTML assets") describes the SW's emission path (`public/sw.js`), scope (`/`), and precache policy, and its first scenario "SW is registered after first visit" asserts the BROWSER outcome (`navigator.serviceWorker.controller` non-null after the second navigation, registration scope `/`). None of this locks the React component's OWN contract: the exact registration path string `'/sw.js'`, the `{ scope: '/' }` option object, the `'serviceWorker' in navigator` feature-detection guard, the `.catch(() => {})` error-swallow, or the `null` render. A contributor could change `'/sw.js'` to `'/service-worker.js'`, drop the scope option, remove the feature guard (throwing on browsers without SW support), or let a registration rejection bubble (unhandled-rejection noise) — and no spec scenario would catch it.

**ADDED Requirement** (full text in `specs/pwa-shell/spec.md`):

> The `ServiceWorkerRegistration` component SHALL, on mount, register `/sw.js` at scope `/` when `'serviceWorker' in navigator`, SHALL no-op when the API is unavailable, SHALL swallow a registration rejection without surfacing it, and SHALL render nothing.

Non-obvious (the path / scope / guard / error-swallow are implementation details a reader would not infer from the component name). Survives reimplementation (any rewrite must preserve the path, scope, guard, and error-swallow or break installability / throw on unsupported browsers). Protects real failure modes: (a) a wrong path silently disables the PWA; (b) a missing feature guard throws on browsers without SW support, breaking first paint; (c) an un-swallowed rejection floods the console / error telemetry; (d) the component must render nothing (it is mounted in `<body>` alongside real content). Elevated.

**Alternatives considered:**

- *Fold the component contract into a MODIFIED R2 instead of a new requirement.* Rejected — R2 is about the service worker's runtime behavior (precache, HTML-bypass), owned by `sw.ts` / 6.2. The registration COMPONENT is a distinct artifact with a distinct contract; a separate ADDED requirement keeps the R2 runtime contract and the registration-component contract cleanly attributable to their respective carve-outs (6.2 vs 4.12).
- *Don't elevate; just test the component against R2's existing scenario.* Rejected — R2's scenario is a browser-runtime assertion (`controller` non-null) that a jsdom unit test cannot make; the unit-level contract (the `register` call arguments) is genuinely un-spec'd. Per the invariant-elevation obligation, a source-enforced invariant with no governing SHALL gets elevated.

### Decision 4: `app/manifest.ts` brand-casing is fixed in-place (source-follows-spec).

The source at HEAD declares `name: 'ctrl+List'` and `short_name: 'ctrl+List'` (lowercase `c`). A grep of `app/` + `lib/` shows `app/manifest.ts` is the SOLE occurrence of `'ctrl+List'`; every other brand string uses `'Ctrl+List'`:

- `app/layout.tsx`: `title`, OpenGraph `title`, Twitter `title`, `apple-mobile-web-app-title` — all `'Ctrl+List'`.
- `app/ui/components/AppLogo.tsx`, `Logo.tsx`, `app/(auth)/ui/components/SignInPage.tsx`, `UserMenu.tsx`: image `alt` / `aria-label` — all `'Ctrl+List'`.
- `openspec/specs/pwa-shell/spec.md` R1: explicitly mandates `name: 'Ctrl+List'`, `short_name: 'Ctrl+List'`.

So the manifest is the outlier, and the active spec is already correct. The `name` / `short_name` are the strings the OS shows on the install prompt and home-screen label — rendering them with inconsistent casing is an observable brand bug.

**Disposition path** (per the no-backdoor rule, mirroring `test-app-frame`'s `Header.tsx` decision):

1. A first test draft asserting `name === 'ctrl+List'` would lock the OBSERVED-but-wrong value.
2. The assertion-substance audit flags it: "the assertion locks a brand-casing bug that contradicts the spec and every other brand string; this is a latent defect, not a contract."
3. Disposition **(b) refactor-in-place**: change both literals to `'Ctrl+List'`.
4. The test asserts the FIXED values (`name === 'Ctrl+List'`, `short_name === 'Ctrl+List'`), which match R1.

No `pwa-shell` R1 spec edit — the spec is the authority the source is brought to.

**Alternative considered:** *MODIFY R1 to say `'ctrl+List'`, matching the source.* Rejected — the spec, the layout title, the OG/Twitter cards, the logo alts, and the Apple title all agree on `'Ctrl+List'`; bending the one normative document to the single source outlier would propagate the inconsistency and contradict the brand used everywhere a user sees it.

### Decision 5: `ServiceWorkerRegistration` is tested by stubbing `navigator.serviceWorker` via `Object.defineProperty`; reset in `afterEach`.

jsdom does not implement `navigator.serviceWorker`. The component's `'serviceWorker' in navigator` guard makes it safe in jsdom (the effect no-ops by default), but to exercise the positive path the test installs a stub:

```ts
let registerMock: ReturnType<typeof vi.fn>;

function stubServiceWorker(register: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register },
  });
}

afterEach(() => {
  // Remove the stub so the absent-API test sees a navigator without serviceWorker.
  Reflect.deleteProperty(navigator, 'serviceWorker');
  vi.restoreAllMocks();
});
```

- **register resolves** → `registerMock = vi.fn().mockResolvedValue(undefined)`; after render, assert `registerMock` called once with `('/sw.js', { scope: '/' })`.
- **register rejects** → `registerMock = vi.fn().mockRejectedValue(new Error('boom'))`; after render + a microtask flush (`await Promise.resolve()`), assert no unhandled rejection surfaced (the `.catch(() => {})` swallows it) and the test does not throw. The rejected-promise path is what covers the `.catch` arm.
- **API absent** → do NOT install the stub (or `Reflect.deleteProperty`); render; assert `registerMock` (a free-standing spy not wired to navigator) is never called — i.e. the guard short-circuits. Asserted by confirming no throw and that a spy passed into a stub that was never attached is uncalled.
- **renders null** → `expect(container.firstChild).toBeNull()` in every case.
- **mount-only** → rerender the component; assert `registerMock` call count stays at 1 (the `[]` dep array).

**Alternatives considered:**

- *Mock the whole `navigator` object.* Rejected — overbroad; other code (RTL, jsdom internals) reads `navigator`. Defining only `serviceWorker` is surgical.
- *Refactor the component to accept an injected registrar for testability.* Rejected — cross-API change for no benefit; the `Object.defineProperty` stub exercises every branch without touching the component's signature. Same scope discipline as `test-app-frame`'s rejection of prop-injection refactors.

### Decision 6: The dead `typeof window === 'undefined'` operand in the registration guard is removed in-place.

The source at HEAD:

```tsx
useEffect(() => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
}, []);
```

`useEffect` callbacks run only in the browser, after mount — never during server rendering. Inside the effect, `window` is therefore always defined, so the `typeof window === 'undefined'` operand is unreachable in every environment (production browser and jsdom alike). v8 branch coverage would flag its always-false outcome, and on a 15-line file one uncovered branch can drop below the 95% branch floor.

**Disposition (b) refactor-in-place** (default): drop the dead operand:

```tsx
useEffect(() => {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
}, []);
```

Both branches of the remaining guard are directly testable (stub present → register called; stub absent → no-op), giving 100% branch coverage with no `/* v8 ignore */`. This is also the cleaner code: it removes a guard for a scenario that cannot happen, consistent with the repo's "don't add error handling for scenarios that can't happen" guidance.

**Alternative (c) — `/* v8 ignore */`:** keep the operand and annotate `/* v8 ignore next -- SSR short-circuit; useEffect never runs server-side, so window is always defined */`. This is the fallback if a reviewer prefers retaining the defensive guard (note: `test-app-frame` chose this for `useKeyboardOffset`'s `typeof window` guard — but there the guard sits in the hook body, which CAN run during SSR, so it is genuinely needed; here the guard is inside `useEffect`, where it is genuinely dead, so removal (b) is the better fit). Recorded so the disposition is explicit either way.

## Risks / Trade-offs

- **`navigator.serviceWorker` stubbing relies on `Object.defineProperty` with `configurable: true`.** Some environments cache `navigator` properties. → Mitigation: define fresh per test and `Reflect.deleteProperty` in `afterEach`; if the property cannot be redefined the test fails loudly on the first assertion. Same pattern `test-app-frame` used for `window.visualViewport`.
- **The rejected-`register` path needs a microtask flush.** The `.catch(() => {})` runs after the promise rejects; the test must `await Promise.resolve()` (or `await act(...)`) before asserting no unhandled rejection. → Mitigation: flush microtasks after render in the reject case; assert the test completes without an unhandled-rejection warning.
- **The manifest brand-casing refactor changes a user-visible string** (the install-prompt / home-screen label `'ctrl+List'` → `'Ctrl+List'`). → Accepted: it is a correction to the brand used everywhere else and mandated by R1; no consumer depends on the lowercase form.
- **Removing the `typeof window` operand is a (tiny) behavior surface change.** → Accepted: the removed branch was unreachable (useEffect never runs server-side), so there is no observable behavior change; the new test covers both remaining branches.
- **The R4 Apple-meta drift is real but out of scope.** `layout.tsx`'s `apple-mobile-web-app-status-bar-style: 'black-translucent'` contradicts R4's `"default"`. → Accepted/deferred: `layout.tsx` is coverage-excluded and out of carve-out; flagged in `proposal.md` for a future layout-metadata sub-proposal rather than silently fixed here (fixing it would expand the carve-out beyond §4.12's two files).
- **`app/sw.ts` stays untested at the unit layer.** → Accepted: it has no jsdom-testable surface (relies on `ServiceWorkerGlobalScope`, `self.__SW_MANIFEST`, `caches`); 6.2 `test-e2e-pwa-offline` covers it in a real SW runtime. This carve-out does not block on it.
- **First `__tests__/` directory directly under `app/`.** → Accepted: the colocation convention is uniform (tests next to source under `__tests__/`), regardless of directory depth; `manifest.ts` lives at `app/manifest.ts`, so its test lives at `app/__tests__/manifest.test.ts`.

## Open Questions

None. Both files are testable as-shipped after the two trivial in-place refactors; the spec delta is a single ADDED requirement; the config edits (exclude removal + two threshold entries + two eslint paths) follow established per-carve-out precedent.
