## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirmed `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [x] 1.2 Verified the jsdom project resolves `@/` and the `react()` plugin is active (the existing `app/ui/components/menu/__tests__/Menu.test.tsx` was added under this project and runs to completion).
- [x] 1.3 Confirmed `@testing-library/react` ships `renderHook` (it is a documented export — no new dependency).
- [x] 1.4 Spec re-grep complete. **Divergence finding:** `triggerClasses()` (no args) at HEAD threw `Cannot destructure property 'active' of 'undefined' …` because the destructured argument had no default. Patched `triggerClasses.ts` to add a `= {}` parameter default so the spec's "`triggerClasses()` (or `triggerClasses({})`) is called → returns 'popover-trigger'" SHALL is satisfiable. Recorded under §5.4 disposition (b) refactored the source — same precedent as `test-menu-system` §1.4 / §7.4.
- [x] 1.5 Confirmed `vitest.config.ts` `coverage.exclude` contains `app/ui/components/*/index.ts` and `**/__tests__/**`. Both glob patterns active.

## 2. Write `app/ui/components/popover-trigger/__tests__/PopoverTrigger.test.tsx` (universal COVERAGE_FLOOR)

### 2A. DomShape — element type, default class, default type

- [x] 2.1 `Default_RendersButtonWithPopoverTriggerClass`
- [x] 2.2 `LabelRenders_InLabelSpan`
- [x] 2.3 `LabelOrder_IconBeforeLabel`
- [x] 2.4 `RefForwarding_PointsAtButton`
- [x] 2.5 `TypeOverride_ExplicitTypeWins`

### 2B. ClassComposition — tone, active, className flow through triggerClasses

- [x] 2.6 `ToneOnDark_AddsToneOnDarkClass`
- [x] 2.7 `ToneLight_NoToneOnDarkClass`
- [x] 2.8 `ToneOmitted_DefaultsToLight`
- [x] 2.9 `ActiveTrue_AddsActiveClass`
- [x] 2.10 `ActiveFalse_NoActiveClass`
- [x] 2.11 `ClassNameForwarded_AppendedAsExtra` (locks Decision 3c order via exact-string class match)

### 2C. CountBadge — zero-suppression gate (Decision 3a, spec delta SHALL)

- [x] 2.12 `CountPositive_RendersBadge`
- [x] 2.13 `CountZero_NoBadgeSpan` **Spec delta SHALL** — Decision 3a.
- [x] 2.14 `CountUndefined_NoBadgeSpan` **Spec delta SHALL** — Decision 3a.
- [x] 2.15 `CountOmitted_NoBadgeSpan`
- [x] 2.16 `CountLargeNumber_RendersAsText`

### 2D. Chevron — aria-hidden contract (Decision 3b, spec delta SHALL)

- [x] 2.17 `Chevron_AlwaysRendered`
- [x] 2.18 `Chevron_AriaHiddenTrue` **Spec delta SHALL** — Decision 3b.
- [x] 2.19 `Chevron_NoRoleNoAriaLabel` **Spec delta SHALL** — Decision 3b.

### 2E. PropsPassthrough — native button props reach the element

- [x] 2.20 `OnClick_InvokedOnClick`
- [x] 2.21 `PassthroughProps_ReachButton`

## 3. Write `app/ui/components/popover-trigger/__tests__/triggerClasses.test.ts` (universal COVERAGE_FLOOR — node project)

- [x] 3.1 `NoArgs_ReturnsBaseToken` (required adding `= {}` default to source — see §1.4 / §5.4).
- [x] 3.2 `EmptyObject_ReturnsBaseToken`
- [x] 3.3 `ToneLight_ReturnsBaseToken`
- [x] 3.4 `ToneOnDark_AppendsToneOnDark`
- [x] 3.5 `ActiveTrue_AppendsActive`
- [x] 3.6 `ActiveFalse_NoActiveToken`
- [x] 3.7 `ToneOnDarkPlusActive_BothInOrder` **Spec delta SHALL** — Decision 3c.
- [x] 3.8 `AllArgs_BaseToneActiveExtraInOrder` **Spec delta SHALL** — Decision 3c.
- [x] 3.9 `LightPlusActivePlusExtra_BaseActiveExtra`
- [x] 3.10 `EmptyExtra_Filtered`
- [x] 3.11 `UndefinedExtra_Filtered`

## 4. Write `app/ui/hooks/__tests__/usePopoverDismiss.test.tsx` (universal COVERAGE_FLOOR — jsdom project)

### 4A. ListenerLifecycle — attach / cleanup gated on `open`

- [x] 4.1 `Closed_NoListenersAttached`
- [x] 4.2 `Open_BothListenersAttached`
- [x] 4.3 `Unmount_BothListenersRemoved`
- [x] 4.4 `ClosedAfterOpen_ListenersCleanedUp`
- [x] 4.5 `OnCloseIdentityChange_ListenersReattached`

### 4B. OutsideClick — null-ref + populated-ref + inside-click

- [x] 4.6 `NullRef_OutsideMousedown_OnCloseNotCalled` **Spec delta SHALL** — Decision 3d.
- [x] 4.7 `PopulatedRef_OutsideMousedown_OnCloseCalled`
- [x] 4.8 `PopulatedRef_InsideMousedown_OnCloseNotCalled`
- [x] 4.9 `PopulatedRef_RefElementItself_OnCloseNotCalled`

### 4C. EscapeKey — escape-only key gate

- [x] 4.10 `Escape_OnCloseCalled`
- [x] 4.11 `OtherKey_OnCloseNotCalled`
- [x] 4.12 `Closed_EscapeDispatched_OnCloseNotCalled`

## 5. Audits

### 5.1 Assertion-substance audit (on the new tests)

- [x] 5.1 Walked each new test file end-to-end. Findings:
  - Every `it()` block asserts on observable output: rendered DOM attributes, class strings, exact-string class equality (locks Decision 3c), callback call counts and order, spied `addEventListener`/`removeEventListener` argument shapes, badge-span presence-or-absence under the count gate. No assertions on internal React state names.
  - No tautologies-against-source: `ClassNameForwarded_AppendedAsExtra` would fail if `triggerClasses` reordered its output; `CountZero_NoBadgeSpan` and `CountUndefined_NoBadgeSpan` exercise the two halves of the gate independently — dropping either half fails the corresponding test; `Chevron_AriaHiddenTrue` would fail if a future icon-library swap dropped the attribute; `NullRef_OutsideMousedown_OnCloseNotCalled` would fail if the `ref.current && …` guard were removed.
  - No DOM-snapshot assertions. Every assertion names a specific attribute, class string, accessible name (`getByRole('button')`), `toHaveTextContent`, callback invocation count, or spied call argument.

### 5.2 Duplication audit (across the three new test files)

- [x] 5.2 Identified repeated patterns. Disposition: **all stayed inline; no shared `test-helpers.tsx` extracted** (matches design.md Decision 6).
  - "Render `<PopoverTrigger>` with various prop combos" — internal to one file; one-liner shape stays inline.
  - "Mount `usePopoverDismiss` with a ref attached to a real DOM element" — extracted as a local `Harness` component INSIDE `usePopoverDismiss.test.tsx` (4 use sites within that file). Not cross-file; no shared module needed.
  - "Spy on `document.addEventListener` / `removeEventListener`" — used only in `usePopoverDismiss.test.tsx` `ListenerLifecycle` describe block; stays inline.
  - Cross-file: zero duplication. The three files exercise very different surfaces.

### 5.3 Complexity audit (on the carve-out source)

- [x] 5.3 `npm run lint` reports zero `sonarjs/cognitive-complexity` warnings or errors for any of the three carve-out files at the error-promoted ceiling of 15. Measured ceilings (from lint output): all three files under 15 (no per-file warning emitted, which means each function's measured complexity is below the threshold). `PopoverTrigger.tsx` is a single-return JSX function with two inline conditionals (count gate + chevron unconditional); `triggerClasses.ts` is a single `.filter(Boolean).join(' ')` expression; `usePopoverDismiss.ts` is one `useEffect` with two event handlers and one `!open` short-circuit. All comfortably below ceiling.

### 5.4 Testability audit (on the carve-out source)

- [x] 5.4 Coverage report after the suite landed at **100% statements / 100% branches / 100% functions / 100% lines** across all three carve-out files (from `coverage/coverage-summary.json`):
  - `PopoverTrigger.tsx`: 2/2 lines, 4/4 branches, 1/1 functions, 2/2 statements — 100%.
  - `triggerClasses.ts`: 1/1 lines, 6/6 branches, 1/1 functions, 1/1 statements — 100%.
  - `usePopoverDismiss.ts`: 12/12 lines, 8/8 branches, 5/5 functions, 14/14 statements — 100%.
  - All exceed the universal `COVERAGE_FLOOR` of 98/98/95/100. `npx vitest run --coverage` exits 0.
  - **One source refactor recorded ((b) disposition):** added `= {}` parameter default to `triggerClasses.ts` so `triggerClasses()` no-args returns `'popover-trigger'` per spec scenario "No arguments returns the base token" (Decision 3c). Without this, `triggerClasses()` threw `Cannot destructure property 'active' of 'undefined' …`. Same precedent as `test-menu-system` §1.4 / §7.4 finding for `menuItemClasses`.
  - No `/* v8 ignore */` annotations needed. All branches reachable via tests.

### 5.5 Invariant-elevation audit

- [x] 5.5 Each new SHALL in the spec delta is asserted by a discrete `<State>_<Behavior>` `it()`:
  - Decision 3a (count-badge zero-suppression) → 2.13 `CountZero_NoBadgeSpan` AND 2.14 `CountUndefined_NoBadgeSpan` (both halves of the gate exercised independently).
  - Decision 3b (chevron `aria-hidden`) → 2.18 `Chevron_AriaHiddenTrue` AND 2.19 `Chevron_NoRoleNoAriaLabel`.
  - Decision 3c (triggerClasses fixed token order) → 3.7 / 3.8 / 3.9 (order asserted via exact-string match in the pure-function test) AND 2.11 `ClassNameForwarded_AppendedAsExtra` (end-to-end through the component).
  - Decision 3d (`usePopoverDismiss` null-ref short-circuit) → 4.6 `NullRef_OutsideMousedown_OnCloseNotCalled`.
  - No test asserts an invariant lacking a corresponding SHALL — every assertion maps to either the existing `popover-trigger-system` requirements (form-input-styled button shape, `tone: 'light' | 'on-dark'` surface adaptation, focus contract via passthrough props, `usePopoverDismiss` outside-click + Escape) or the four newly-elevated SHALLs.

## 6. Config changes

- [x] 6.1 Extended the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` to include the three carve-out files.
- [x] 6.2 Added three per-file threshold entries in `vitest.config.ts`, each referencing `COVERAGE_FLOOR`.
- [x] 6.3 Confirmed `vitest.config.ts`'s `coverage.exclude` already covers `app/ui/components/*/index.ts` and `**/__tests__/**`. No new exclude line added.

## 7. Apply spec deltas

- [ ] 7.1 **(archive-time)** Merge the four ADDED Requirements (Decisions 3a/3b/3c/3d) from `openspec/changes/test-popover-trigger-system/specs/popover-trigger-system/spec.md` into `openspec/specs/popover-trigger-system/spec.md`. Validate via `openspec validate popover-trigger-system --strict`. No existing requirements modified or removed.
- [ ] 7.2 **(archive-time)** The carve-out bookkeeping spec at `openspec/changes/test-popover-trigger-system/specs/testing-foundation/spec.md` remains archive-only — does NOT roll into the parent `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md`. Per `test-coverage` design D13 two-tier rollup, this carve-out's `testing-foundation` delta is Tier 2 (archive-only).

## 8. Pre-merge

- [x] 8.1 `npm run lint` passes with zero errors. 10 pre-existing `sonarjs/cognitive-complexity` + `@next/next/no-img-element` warnings persist in unrelated files (`Item.tsx`, `ItemsToolbar.tsx`, `itemFilters.ts`, `useItemForm.ts`, `ChooseItemsForm.tsx`, `ListDetails.tsx`, `Avatar.tsx`, `app/actions/items.ts`, `app/actions/lists.ts`, `scripts/seed-dev-users.ts`) — same set as `test-menu-system` §10.1; carve-out introduces zero new warnings or errors.
- [x] 8.2 `npx tsc --noEmit` exits 0 with zero errors.
- [x] 8.3 `npm run build` completes successfully — all routes generated.
- [x] 8.4 `npx vitest run` passes 413/413 tests; coverage report for the three carve-out files at 100% across all four metrics (above the universal `COVERAGE_FLOOR` of 98/98/95/100).
- [x] 8.5 `npm run test:e2e` — Playwright reports "No tests found" on this branch (no `e2e/**/*.spec.ts` files exist). Vacuously zero failures; pre-existing config state, not a regression introduced by this carve-out.
