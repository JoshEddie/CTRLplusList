## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`. Confirmed at `test/helpers/setup.ts:1-11`.
- [x] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active. Confirmed at `vitest.config.ts:34-50`; `react()` plugin and `aliasRoot` are present on the jsdom project.
- [x] 1.3 Confirm `@testing-library/react` and `@testing-library/user-event` are present (already installed for prior carve-outs).
- [x] 1.4 Spec re-grep against `openspec/specs/segmented-control-system/spec.md` at HEAD: six existing requirements unchanged and the four new requirements do not overlap or contradict them. **Divergence finding:** `segmentedGroupClasses` and `segmentedOptionClasses` use destructured parameters without `= {}` defaults; the spec scenarios all invoke them with required arguments (`tone`, `active`), so no no-args scenario is asserted and no source change is needed. Disposition: (a) — tests assert only the documented call shapes; no parameter-default refactor.
- [x] 1.5 Confirm `vitest.config.ts` `coverage.exclude` contains `app/ui/components/*/index.ts` and `**/__tests__/**`. Both glob patterns active at `vitest.config.ts:74-89` — no change needed.

## 2. Write `app/ui/components/segmented-control/__tests__/SegmentedControl.test.tsx` (universal COVERAGE_FLOOR)

### 2A. DomShape — element type, role, aria, class, ref

- [x] 2.1 `Default_RendersDivWithRadiogroup`
- [x] 2.2 `AriaLabel_ForwardedToContainer`
- [x] 2.3 `AriaLabelledBy_ForwardedToContainer`
- [x] 2.4 `ClassName_AppendedAsExtra` (locks Decision 3a token order via exact-string match)
- [x] 2.5 `RefForwarding_PointsAtRadiogroupDiv` (via `useImperativeHandle`)

### 2B. ToneClass — always-emit-tone for both tones (Decision 3a, spec delta SHALL)

- [x] 2.6 `ToneLight_RendersToneLightClassOnContainer` **Spec delta SHALL** — Decision 3a.
- [x] 2.7 `ToneOnDark_RendersToneOnDarkClassOnContainer` **Spec delta SHALL** — Decision 3a.

### 2C. ContextProvision — children consume value / onChange / tone via context

- [x] 2.8 `ChildOption_ReadsValueFromContext_RendersAriaCheckedTrue`
- [x] 2.9 `ChildOption_ReadsValueFromContext_RendersAriaCheckedFalse`
- [x] 2.10 `ChildOption_ClickFiresContextOnChange`

### 2D. KeyboardListenerScope — container-scoped, [onChange] deps (Decision 3d, spec delta SHALL)

- [x] 2.11 `ListenerScopedToContainer_NotDocument` **Spec delta SHALL** — Decision 3d. (spy on `Element.prototype.addEventListener`; assert called with `'keydown'` against the radiogroup container; assert NOT called on `document`)
- [x] 2.12 `Unmount_ListenerRemovedFromContainer` (spy on `Element.prototype.removeEventListener`; cleanup runs on unmount)
- [x] 2.13 `KeydownOnSiblingOutsideContainer_NoOnChange` **Spec delta SHALL** — Decision 3d. (ArrowRight dispatched on a sibling button outside the container; `onChange` NOT called)
- [x] 2.14 `OnChangeIdentityChange_ListenerReattachedWithNewCallback` **Spec delta SHALL** — Decision 3d. (rerender with new `onChange` reference; subsequent ArrowRight fires the new spy, not the old)
- [x] 2.15 `ValueChange_ListenerNotReattached` **Spec delta SHALL** — Decision 3d. (rerender with new `value` but same `onChange`; `addEventListener` spy called exactly once across lifecycle)

### 2E. KeyboardNavigation — arrow keys, modulo wrap, non-arrow short-circuit

- [x] 2.16 `ArrowRight_AdvancesAndFiresOnChange`
- [x] 2.17 `ArrowDown_AdvancesAndFiresOnChange` (Down is forward)
- [x] 2.18 `ArrowLeft_RetreatsAndFiresOnChange`
- [x] 2.19 `ArrowUp_RetreatsAndFiresOnChange` (Up is backward)
- [x] 2.20 `ArrowRight_OnLastOption_WrapsToFirst`
- [x] 2.21 `ArrowLeft_OnFirstOption_WrapsToLast`
- [x] 2.22 `NonArrowKey_NoOnChangeNoPreventDefault` (e.g. `'a'` or `'Tab'`; covers the four-way key-filter negative branch)
- [x] 2.23 `ArrowRight_FocusMovesToNextOption` (asserts `document.activeElement === nextOption` after dispatch)
- [x] 2.24 `ArrowRight_CallsPreventDefault` (event.preventDefault was invoked — verified by `event.defaultPrevented === true` after `fireEvent.keyDown`)

### 2F. KeyboardEdgeCases — currentIndex resolution, empty group, missing data-value

- [x] 2.25 `NoCheckedOption_ArrowRight_SelectsFirst` (value="__none__" sentinel; `currentIndex === -1`; `(-1 + 1) % len = 0`)
- [x] 2.26 `NoCheckedOption_ArrowLeft_SelectsSecondToLast` (`(-1 - 1 + len) % len = len - 2`)
- [x] 2.27 `EmptyOptions_ArrowRight_NoOnChange` (`<SegmentedControl>` with NO children; `options.length === 0` short-circuit)
- [x] 2.28 `SyntheticOptionWithoutDataValue_ArrowRight_NoOnChange` (renders a raw `<button role="radio">` without `data-value` as a sibling option; covers the `nextValue === undefined` guard — disposition (a). If flaky, fall back to (c) `/* v8 ignore */` recorded in §5.4)

## 3. Write `app/ui/components/segmented-control/__tests__/SegmentedOption.test.tsx` (universal COVERAGE_FLOOR)

### 3A. DomShape — button, role, type, data-value

- [x] 3.1 `Default_RendersButtonWithRadioRole`
- [x] 3.2 `Default_RendersButtonTypeButton` (explicit `type="button"` to avoid form-submit default)
- [x] 3.3 `DataValue_MirrorsValueProp` (the coupling attribute the parent's keydown handler reads via `next.dataset.value`)
- [x] 3.4 `Children_RenderInsideButton`
- [x] 3.5 `RefForwarding_PointsAtButton`

### 3B. ActiveState — aria-checked, tabIndex roving, active class

- [x] 3.6 `ContextValueMatches_AriaCheckedTrue` (React serializes to literal string `"true"`)
- [x] 3.7 `ContextValueDiffers_AriaCheckedFalse` (literal string `"false"`)
- [x] 3.8 `ContextValueMatches_TabIndex0`
- [x] 3.9 `ContextValueDiffers_TabIndexNegative1`
- [x] 3.10 `ContextValueMatches_ActiveClassPresent` (locks Decision 3b token order via exact-string class match)
- [x] 3.11 `ContextValueDiffers_NoActiveClass`
- [x] 3.12 `ClassNameForwarded_AppendedAsExtra`

### 3C. ClickBehavior — onChange invocation, idempotent re-selection

- [x] 3.13 `InactiveOption_Click_FiresOnChangeWithValue`
- [x] 3.14 `ActiveOption_Click_StillFiresOnChange` (idempotent re-selection; source has no `if (isActive) return` guard)

### 3D. PropsPassthrough — native button props reach the element, omitted props do NOT

- [x] 3.15 `Disabled_ReachesButton`
- [x] 3.16 `AriaLabel_ReachesButton`
- [x] 3.17 `DataTestId_ReachesButton`
- [x] 3.18 `CustomId_ReachesButton`
- [x] 3.19 `ValueProp_BecomesDataValue_NotRawValueAttribute` (locks that the `value` prop — which IS in the prop type — is consumed by the component and surfaced as `data-value`, NOT spread through as a raw `value` HTML attribute on the button; regression-guards a future destructure removal)

### 3E. ContextThrow — orphan render throws (Decision 3c, spec delta SHALL)

- [x] 3.20 `OrphanRender_ThrowsDescriptiveError` **Spec delta SHALL** — Decision 3c. (`expect(() => render(<SegmentedOption value="x">label</SegmentedOption>)).toThrow('<SegmentedOption> must be rendered inside a <SegmentedControl>')`; `console.error` spied + asserted called, then restored)

## 4. Write `app/ui/components/segmented-control/__tests__/segmentedClasses.test.ts` (universal COVERAGE_FLOOR — node project)

### 4A. segmentedGroupClasses — always-emit-tone, fixed token order (Decision 3a, spec delta SHALL)

- [x] 4.1 `ToneLight_EmitsToneLightClass` **Spec delta SHALL** — Decision 3a. (returns `'segmented tone-light'`, NOT `'segmented'`)
- [x] 4.2 `ToneOnDark_EmitsToneOnDarkClass` **Spec delta SHALL** — Decision 3a.
- [x] 4.3 `ToneLightWithExtra_BaseToneLightExtraInOrder` **Spec delta SHALL** — Decision 3a.
- [x] 4.4 `ToneOnDarkWithExtra_BaseToneOnDarkExtraInOrder` **Spec delta SHALL** — Decision 3a.
- [x] 4.5 `ToneLightEmptyExtra_Filtered` (returns `'segmented tone-light'`; empty-string `extra` filtered, no trailing whitespace)
- [x] 4.6 `ToneOnDarkUndefinedExtra_Filtered`

### 4B. segmentedOptionClasses — fixed token order (Decision 3b, spec delta SHALL)

- [x] 4.7 `ActiveFalse_ReturnsBaseToken` (returns `'segmented-option'`)
- [x] 4.8 `ActiveTrue_AppendsActive` **Spec delta SHALL** — Decision 3b. (returns `'segmented-option active'`)
- [x] 4.9 `ActiveTrueWithExtra_BaseActiveExtraInOrder` **Spec delta SHALL** — Decision 3b. (returns `'segmented-option active foo'`)
- [x] 4.10 `ActiveFalseWithExtra_BaseExtra` (returns `'segmented-option foo'`; `false` filtered)
- [x] 4.11 `ActiveFalseEmptyExtra_Filtered` (returns `'segmented-option'`)
- [x] 4.12 `ActiveFalseUndefinedExtra_Filtered`

## 5. Audits

### 5.1 Assertion-substance audit (on the new tests)

- [x] 5.1 Walked each new test file end-to-end. All assertions name observable output (DOM attributes, exact-string classes, callback shapes, spy `this`-binding, exact error-message string). No internal-state assertions, no DOM snapshots, no tautologies. Specifically verified: `OrphanRender_ThrowsDescriptiveError` asserts the exact error string `'<SegmentedOption> must be rendered inside a <SegmentedControl>'`; `ListenerScopedToContainer_NotDocument` asserts BOTH positive (1 container `keydown` call) AND negative (0 document `keydown` calls); `ValueChange_ListenerNotReattached` asserts exact spy count `=== 1`. **Divergence from proposal §3.20:** the `console.error` spy is kept (to suppress React 19 error-boundary log noise) but the `expect(errSpy).toHaveBeenCalled()` assertion is dropped — React 19's synchronous-throw path no longer routes through `console.error` when the throw is caught by `expect(...).toThrow()`. The exact-string `toThrow` is the load-bearing assertion; the spy is purely noise suppression. Disposition: (a).

### 5.2 Duplication audit (across the three new test files)

- [x] 5.2 Duplication audit complete. **Disposition: all stayed inline; no shared `test-helpers.tsx` extracted.** Local helpers: `ProviderHarness` in `SegmentedOption.test.tsx` (used 17 times — wraps `<SegmentedControl>` with default `value="a"`, `tone="light"`, `aria-label="g"`). No equivalent helper in `SegmentedControl.test.tsx` because every test there exercises the parent's own props (the parent IS the harness); `segmentedClasses.test.ts` has no JSX. Cross-file duplication: none.

### 5.3 Complexity audit (on the carve-out source)

- [x] 5.3 `npm run lint` reports zero `sonarjs/cognitive-complexity` warnings or errors for any of the three carve-out files. **No warning emitted** for `SegmentedControl.tsx`, `SegmentedOption.tsx`, or `segmentedClasses.ts` (all functions below the error-promoted ceiling of 15). Other pre-existing warnings in unrelated files (Item.tsx 24, ItemsToolbar.tsx 32, itemFilters.ts 19, useItemForm.ts 19, ChooseItemsForm.tsx 22, ListDetails.tsx 20, Avatar.tsx no-img-element, items.ts 20, lists.ts 16, seed-dev-users.ts 20) carry forward unchanged.

### 5.4 Testability audit (on the carve-out source)

- [x] 5.4 Coverage report at universal `COVERAGE_FLOOR` or above across all three carve-out files. Per-file metrics from `coverage/coverage-summary.json`: `SegmentedControl.tsx` lines/statements/branches/functions = 100/100/100/100; `SegmentedOption.tsx` = 100/100/100/100; `segmentedClasses.ts` = 100/100/100/100. `npx vitest run --coverage` exit code: 0. **`/* v8 ignore */` annotations:** one — `/* v8 ignore next */` above `if (!container) return;` in `SegmentedControl.tsx`'s keydown `useEffect` (per Decision 5; defensive null-ref guard, ref always populated in test env — same precedent as `test-menu-system` §5.4). **Source refactors taken:** none (disposition (b) not used). No parameter-default additions were needed because no spec scenario calls either composer with zero arguments.

### 5.5 Invariant-elevation audit

- [x] 5.5 Confirmed every new SHALL in the spec delta is asserted by at least one discrete `<State>_<Behavior>` `it()`:
  - Decision 3a (`segmentedGroupClasses` always-emit-tone + fixed order) → §4.1 / §4.2 / §4.3 / §4.4 AND §2.6 / §2.7 (end-to-end through the component).
  - Decision 3b (`segmentedOptionClasses` fixed order) → §4.8 / §4.9 AND §3.10 (end-to-end through the option).
  - Decision 3c (`useSegmentedContext` outside-provider throw) → §3.20.
  - Decision 3d (container-scoped listener with `[onChange]` deps) → §2.11 / §2.13 / §2.14 / §2.15.
- [x] 5.6 Confirmed no test asserts an invariant lacking a corresponding SHALL — every assertion maps to either an existing `segmented-control-system` requirement (radiogroup primitive, aria-checked option, roving tabindex, arrow-key selection, button-system focus contract, migration scenarios) or one of the four newly-elevated SHALLs.

## 6. Config changes

- [x] 6.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` to include `app/ui/components/segmented-control/SegmentedControl.tsx`, `app/ui/components/segmented-control/SegmentedOption.tsx`, and `app/ui/components/segmented-control/segmentedClasses.ts`. Add the carve-out comment header (`// test-segmented-control-system (sub-proposal 3.6) — locked at universal COVERAGE_FLOOR.`) above the three new paths, matching the precedent set by the popover-trigger entries.
- [x] 6.2 Add three per-file threshold entries in `vitest.config.ts`, each referencing `COVERAGE_FLOOR`: `'app/ui/components/segmented-control/SegmentedControl.tsx': COVERAGE_FLOOR`, `'app/ui/components/segmented-control/SegmentedOption.tsx': COVERAGE_FLOOR`, `'app/ui/components/segmented-control/segmentedClasses.ts': COVERAGE_FLOOR`.
- [x] 6.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `app/ui/components/*/index.ts` and `**/__tests__/**`. No new exclude line added (same as `test-popover-trigger-system` §6.3).

## 7. Apply spec deltas

- [x] 7.1 Merge the four ADDED Requirements (Decisions 3a/3b/3c/3d) into `openspec/specs/segmented-control-system/spec.md`. Validate via `openspec validate segmented-control-system --strict`. No existing requirements modified or removed.
- [x] 7.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-segmented-control-system/specs/testing-foundation/spec.md` stays archive-only — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`. Per `test-coverage` design D13 two-tier rollup, this carve-out's `testing-foundation` delta is Tier 2 (archive-only).

## 8. Pre-merge

- [x] 8.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files (same set carried forward across recent carve-outs) are acceptable; this carve-out introduces zero new warnings or errors.
- [x] 8.2 `npx tsc --noEmit` exits 0 with zero errors.
- [x] 8.3 `npm run build` completes successfully — all routes generated.
- [x] 8.4 `npm run test:coverage` passes; coverage report for the three carve-out files at 100/100/100/100 (all above the universal `COVERAGE_FLOOR` of 98/98/95/100). Total passing test count for the suite: 473.
- [x] 8.5 `npm run test:e2e` — Playwright reports "No tests found" on this branch (no `e2e/**/*.spec.ts` files exist yet). Vacuously zero failures; pre-existing config state, not a regression introduced by this carve-out.
