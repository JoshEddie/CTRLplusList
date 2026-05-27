## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [x] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active in `vitest.config.ts`.
- [x] 1.3 Confirm `@testing-library/react` is present (already installed for prior carve-outs). `@testing-library/user-event` is NOT required for this carve-out (no events dispatched).
- [x] 1.4 Spec re-grep against `openspec/specs/loading-indicator-system/spec.md` at HEAD: 16 existing requirements unchanged and the two new requirements (class composition, DOM shape) do not overlap or contradict them. Record any divergence finding with disposition (expected: none).
- [x] 1.5 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**` (so the new `app/ui/components/__tests__/LoadingIndicator.test.tsx` file is excluded from coverage measurement). No new exclude line needed.
- [x] 1.6 Confirm the `app/ui/components/__tests__/` directory does not yet exist (it's created by this carve-out as the first test file there). Subsequent sub-proposals (3.8 `test-misc-primitives`, 4.1 `test-app-frame`, 4.6 `test-list-collections`) will add more files to the same directory.

## 2. Write `app/ui/components/__tests__/LoadingIndicator.test.tsx` (universal COVERAGE_FLOOR)

### 2A. DomShape — element types, child count, child order

- [x] 2.1 `Default_RendersDivAsOuterElement` (assert `getByRole('status').tagName === 'DIV'`)
- [x] 2.2 `Default_RendersExactlyTwoChildSpans` (assert `getByRole('status').children.length === 2` AND both children have `tagName === 'SPAN'`) **Spec delta SHALL** — Decision 3b.
- [x] 2.3 `FirstChild_IsSpinnerSpan` (assert first child has `tagName === 'SPAN'`, `className === 'loading-indicator__spinner'`, `textContent === ''`) **Spec delta SHALL** — Decision 3b.
- [x] 2.4 `SecondChild_IsSrOnlyLabelSpan` (assert second child has `tagName === 'SPAN'`, `className === 'sr-only'`) **Spec delta SHALL** — Decision 3b.

### 2B. ClassComposition — exact-string class for each size variant (Decision 3a, spec delta SHALL)

- [x] 2.5 `SizeInline_RendersExactClassString` (assert `getByRole('status').className === 'loading-indicator loading-indicator--inline'`) **Spec delta SHALL** — Decision 3a.
- [x] 2.6 `SizeRail_RendersExactClassString` (assert `getByRole('status').className === 'loading-indicator loading-indicator--rail'`) **Spec delta SHALL** — Decision 3a.
- [x] 2.7 `SizeForm_RendersExactClassString` (assert `getByRole('status').className === 'loading-indicator loading-indicator--form'`) **Spec delta SHALL** — Decision 3a.
- [x] 2.8 `SizePage_RendersExactClassString` (assert `getByRole('status').className === 'loading-indicator loading-indicator--page'`) **Spec delta SHALL** — Decision 3a.

### 2C. Accessibility — role, aria-live, aria-hidden, label text

- [x] 2.9 `OuterDiv_RoleStatus` (assert `getByRole('status')` resolves — confirms `role="status"` on the outer element)
- [x] 2.10 `OuterDiv_AriaLivePolite` (assert `getByRole('status').getAttribute('aria-live') === 'polite'` — exact-string match per Decision 4)
- [x] 2.11 `SpinnerSpan_AriaHiddenTrue` (assert first child's `getAttribute('aria-hidden') === 'true'` — exact-string match per Decision 4, NOT `hasAttribute`) **Spec delta SHALL** — Decision 3b.
- [x] 2.12 `LabelText_IsExactlyLoadingEllipsisCharacter` (assert second child's `textContent === 'Loading…'` — exact string containing U+2026 single code point, NOT three ASCII dots) **Spec delta SHALL** — Decision 3b.

## 3. Audits

### 3.1 Assertion-substance audit (on the new tests)

- [x] 3.1 Walked the new test file end-to-end. Every assertion names observable output: `tagName === 'DIV'/'SPAN'`, `className === 'loading-indicator loading-indicator--<size>'` / `'loading-indicator__spinner'` / `'sr-only'` (exact-string `.className`, not `.toContain`), `getAttribute('aria-live') === 'polite'` / `getAttribute('aria-hidden') === 'true'` (exact-string per Decision 4, not `hasAttribute`), `textContent === 'Loading…'` (exact U+2026 single code point in source), `children.length === 2`. No internal-state assertions, no DOM snapshots, no tautologies, no `it.each` parameterization (each variant has its own discrete `it()` per Decision 2). One file-level `eslint-disable testing-library/no-node-access` recorded with rationale tied to Decision 3b — the spec mandates structural `.children[0]/[1]` assertions that query-based forms cannot prove (proving "exactly two SPAN children in fixed order" requires direct child indexing). Disposition: documented in-file with comment, no other findings.

### 3.2 Duplication audit (within the new test file)

- [x] 3.2 Duplication audit on `LoadingIndicator.test.tsx`. Disposition: stays inline; no `test-helpers.tsx` extracted. Each of the four size-variant tests has a single exact-string assertion against a different class string. The four DOM-shape tests assert different children of the same render (no shared body to extract). No cross-file duplication (single-file carve-out). Single-line `render(<LoadingIndicator size="…" />)` setup is the minimum noise floor; a `Harness` wrapper would add abstraction without reducing line count. Recorded.

### 3.3 Complexity audit (on the carve-out source)

- [x] 3.3 `npm run lint` reports zero `sonarjs/cognitive-complexity` warnings or errors for `LoadingIndicator.tsx` (measured complexity 1 — single return statement, no conditionals). Pre-existing warnings in unrelated files (Item.tsx, ItemsToolbar.tsx, itemFilters.ts, useItemForm.ts, ChooseItemsForm.tsx, ListDetails.tsx, Avatar.tsx no-img-element, items.ts, lists.ts, seed-dev-users.ts) carry forward unchanged — same set as the prior carve-out.

### 3.4 Testability audit (on the carve-out source)

- [x] 3.4 `coverage/coverage-summary.json` shows `app/ui/components/LoadingIndicator.tsx` at lines:100 / statements:100 / branches:100 / functions:100 — at or above the universal `COVERAGE_FLOOR` (98/98/95/100). No `/* v8 ignore */` annotations added (none needed — no conditionals). No source refactors taken (disposition (b) not used).

### 3.5 Invariant-elevation audit

- [x] 3.5 Every new SHALL in the spec delta is asserted by at least one discrete `<State>_<Behavior>` `it()`:
  - Decision 3a (class composition exact-string, fixed token order) → §2.5 / §2.6 / §2.7 / §2.8 (one per variant), each asserting `className === 'loading-indicator loading-indicator--<variant>'` exact-string.
  - Decision 3b (DOM child structure: types, order, spinner aria-hidden, label ellipsis-character text) → §2.2 (two SPAN children), §2.3 (first child spinner span), §2.4 (second child sr-only span), §2.11 (spinner aria-hidden exact-string), §2.12 (label exact U+2026 text).
- [x] 3.6 No test asserts an invariant lacking a corresponding SHALL. Every assertion maps to an existing `loading-indicator-system` requirement (size enum from "fixed enum of size variants"; `role="status"` + `aria-live="polite"` + sr-only "Loading…" label + spinner `aria-hidden="true"` from the accessibility requirement) or one of the two newly-elevated SHALLs (class composition / DOM shape).

## 4. Config changes

- [x] 4.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` to include `app/ui/components/LoadingIndicator.tsx`. Add the carve-out comment header (`// test-loading-indicator-system (sub-proposal 3.7) — locked at universal COVERAGE_FLOOR.`) above the new path, matching the precedent set by the segmented-control entries.
- [x] 4.2 Add one per-file threshold entry in `vitest.config.ts` referencing `COVERAGE_FLOOR`: `'app/ui/components/LoadingIndicator.tsx': COVERAGE_FLOOR`.
- [x] 4.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line added.

## 5. Apply spec deltas

- [x] 5.1 Merge the two ADDED Requirements (Decisions 3a/3b) into `openspec/specs/loading-indicator-system/spec.md`. Validate via `openspec validate loading-indicator-system --strict`. No existing requirements modified or removed.
- [x] 5.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-loading-indicator-system/specs/testing-foundation/spec.md` stays archive-only — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`. Per `test-coverage` design D13 two-tier rollup, this carve-out's `testing-foundation` delta is Tier 2 (archive-only).

## 6. Pre-merge

- [x] 6.1 `npm run lint` passes — 0 errors, 10 warnings (pre-existing, unrelated files: Item.tsx, ItemsToolbar.tsx, itemFilters.ts, useItemForm.ts, ChooseItemsForm.tsx, ListDetails.tsx, Avatar.tsx no-img-element, items.ts, lists.ts, seed-dev-users.ts). Carve-out introduces zero new warnings or errors.
- [x] 6.2 `npx tsc --noEmit` exits 0 with zero errors.
- [x] 6.3 `npm run build` completes successfully — all routes generated (static + PPR + dynamic).
- [x] 6.4 `npm run test:coverage` passes; `LoadingIndicator.tsx` coverage at 100/100/100/100 (above the universal `COVERAGE_FLOOR` of 98/98/95/100). Suite total: 485 tests across 34 files, all passing.
- [x] 6.5 `npm run test:e2e` — Playwright run reports "No tests found" (no `e2e/**/*.spec.ts` files exist on this branch). Vacuously zero failures, as anticipated; pre-existing config state, not a regression introduced by this carve-out.
