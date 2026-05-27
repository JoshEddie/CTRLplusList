## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [ ] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active in `vitest.config.ts`.
- [ ] 1.3 Confirm `@testing-library/react` and `@testing-library/user-event` are present (already installed for prior carve-outs).
- [ ] 1.4 Spec re-grep across `openspec/specs/`: confirm no existing `confirm-dialog-system`, `tooltip-system`, `empty-state-system`, or `form-shell-system` spec.md exists. Confirm `form-field-system/spec.md` line 333's "no tooltip for error text" exclusion is unchanged — `tooltip-system`'s family-scope SHALL cross-links to it without modifying it.
- [ ] 1.5 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**` (already present at `vitest.config.ts:74-89`); the new `app/ui/components/__tests__/` directory inherits the exclusion. No new exclude line needed.

## 2. Write `app/ui/components/__tests__/ConfirmDialog.test.tsx` (universal COVERAGE_FLOOR)

### 2A. ClosedState — isOpen=false short-circuit (Decision 3a-1, spec SHALL)

- [ ] 2.1 `IsOpenFalse_RendersNothing` **Spec SHALL** — `confirm-dialog-system` controlled-modal short-circuit. (`render(...)` then assert no `confirm-dialog-overlay` is queryable)

### 2B. OpenState — overlay, content, title, message, button row

- [ ] 2.2 `IsOpenTrue_RendersOverlayAndContentAndButtons`
- [ ] 2.3 `TitleAndMessage_RenderedAsHeadingAndParagraph` (`<h3 class="confirm-dialog-title">` + `<p class="confirm-dialog-message">`)
- [ ] 2.4 `MessageAcceptsReactNode_RendersComplexChildren` (pass `<span data-testid="x">` as message; assert it's a descendant of `.confirm-dialog-message`)

### 2C. ButtonRowOrder — two vs. three button row (Decision 3a-2, spec SHALL)

- [ ] 2.5 `NoTertiary_TwoButtonsOnly` **Spec SHALL** — DOM order: Cancel, Confirm.
- [ ] 2.6 `WithTertiary_ThreeButtonsInOrder` **Spec SHALL** — DOM order: tertiary, Cancel, Confirm. (assert via `screen.getAllByRole('button')` index)

### 2D. ButtonVariants — fixed Cancel/Confirm, tertiary default (Decision 3a-2, spec SHALL)

- [ ] 2.7 `CancelButton_Variant_Ghost` **Spec SHALL** (assert via `Button`-system class signature, e.g. presence of `--btn-ghost` class token or whatever marker `<Button variant="ghost">` emits at HEAD; coordinate with existing `Button.test.tsx` patterns)
- [ ] 2.8 `ConfirmButton_Variant_Danger` **Spec SHALL**
- [ ] 2.9 `TertiaryDefaultVariant_Primary` **Spec SHALL** — `tertiary={{ label, onClick }}` (no variant) renders through primary.
- [ ] 2.10 `TertiaryExplicitSecondary_Secondary` **Spec SHALL** — `tertiary={{ ..., variant: 'secondary' }}` renders through secondary.

### 2E. ClickBehavior — auto-dismiss composition (Decision 3a-3, 3a-4, spec SHALL)

- [ ] 2.11 `CancelClick_CallsOnCloseOnce_NotOnConfirmOrTertiary` **Spec SHALL**
- [ ] 2.12 `ConfirmClick_CallsOnConfirmThenOnClose_InThatOrder` **Spec SHALL** — assert via `mock.invocationCallOrder` that `onConfirm[0] < onClose[0]`.
- [ ] 2.13 `TertiaryClick_CallsTertiaryOnClickThenOnClose_InThatOrder` **Spec SHALL** — same invocation-order pattern.

### 2F. LabelDefaults — confirmText / cancelText defaults and overrides

- [ ] 2.14 `ConfirmTextDefault_Confirm`
- [ ] 2.15 `CancelTextDefault_Cancel`
- [ ] 2.16 `ConfirmTextOverride_RendersOverride` (e.g. `confirmText="Delete"`)
- [ ] 2.17 `CancelTextOverride_RendersOverride` (e.g. `cancelText="Keep"`)
- [ ] 2.18 `TertiaryLabel_RenderedInsideTertiaryButton`

## 3. Write `app/ui/components/__tests__/TooltipWrapper.test.tsx` (universal COVERAGE_FLOOR)

### 3A. WrapperClass — exact-string composition (Decision 3b-1, spec SHALL)

- [ ] 3.1 `Default_RendersDivWithTooltipContainerClass`
- [ ] 3.2 `NoClassName_WrapperClassEndsWithTrailingSpace` **Spec SHALL** — `expect(div.className).toBe('tooltip-container ')` (exact string, trailing space preserved by the source template literal).
- [ ] 3.3 `WithClassName_AppendedAfterTrailingSpace` **Spec SHALL** — `expect(div.className).toBe('tooltip-container foo')` for `className="foo"`.
- [ ] 3.4 `EmptyStringClassName_BehavesLikeUndefined` — `expect(div.className).toBe('tooltip-container ')` (the `||` short-circuit selects `''`).

### 3B. Children — render order

- [ ] 3.5 `Children_RenderInsideWrapper`

### 3C. ShowTooltip — conditional span (Decision 3b-2, spec SHALL)

- [ ] 3.6 `ShowTooltipDefault_True_TooltipSpanRendered` **Spec SHALL** — default true; `<span class="tooltip">` present.
- [ ] 3.7 `ShowTooltipFalse_NoTooltipSpan` **Spec SHALL** — explicit false; no `.tooltip` queryable.
- [ ] 3.8 `ShowTooltipTrue_TooltipText_RenderedInsideSpan` — text matches the `tooltip` prop.
- [ ] 3.9 `ShowTooltipTrue_NoTooltipProp_SpanRenderedEmpty` — span present but text content is empty string.

## 4. Write `app/ui/components/__tests__/Empty.test.tsx` (universal COVERAGE_FLOOR)

### 4A. Title — type-aware capitalization (Decision 3c-1, 3c-2, spec SHALL)

- [ ] 4.1 `TypeItem_TitleCapitalized` **Spec SHALL** — `'No Items Found'`.
- [ ] 4.2 `TypeList_TitleCapitalized` **Spec SHALL** — `'No Lists Found'`.
- [ ] 4.3 `TypePurchase_TitleExactString` **Spec SHALL** — `'No Purchases Found'` (the literal-branch title).

### 4B. Description — type-aware copy

- [ ] 4.4 `TypeItem_DescriptionCapitalized` — `'Create your first Item below.'`.
- [ ] 4.5 `TypePurchase_DescriptionExactString` **Spec SHALL** — `'You have not marked any items as purchased yet.'`.

### 4C. CTABranching — purchase vs. setter vs. fallback (Decision 3c-3, 3c-4, spec SHALL)

- [ ] 4.6 `TypePurchase_NoCTARendered` **Spec SHALL** — no `<button>` and no `<a>` inside the empty-container.
- [ ] 4.7 `NonPurchase_WithSetter_RendersButtonWithPrimaryVariant` **Spec SHALL** — `<button>` present, rendered via `<Button variant="primary">`.
- [ ] 4.8 `NonPurchase_WithSetter_ButtonText_CreateCapitalized` — accessible name `'Create Item'` for `type="item"`.
- [ ] 4.9 `NonPurchase_WithSetter_ButtonClick_InvokesSetterWithTrue` **Spec SHALL** — `setShowNewItem` spy called once with `true`.
- [ ] 4.10 `NonPurchase_WithSetter_IconRendered` — `<svg>` (FaPlus) present inside the button.
- [ ] 4.11 `NonPurchase_NoSetter_RendersLinkButton` **Spec SHALL** — `<a>` present, rendered via `<LinkButton variant="primary">`.
- [ ] 4.12 `NonPurchase_NoSetter_LinkHref_PluralizedType` **Spec SHALL** — `href="/items/new"` for `type="item"`; `href="/lists/new"` for `type="list"` (two-case sweep to lock the route convention).
- [ ] 4.13 `NonPurchase_NoSetter_LinkText_CreateCapitalized`

### 4D. ContainerShape — div + h3 + p

- [ ] 4.14 `EmptyContainer_RendersTitleAndDescriptionAsHeadingAndParagraph` **Spec SHALL** — `<div class="empty-container">` wraps `<h3>` and `<p>`.

## 5. Write `app/ui/components/__tests__/FormShell.test.tsx` (universal COVERAGE_FLOOR)

### 5A. OverlayAndInner — DOM shape and variant class (Decision 3d-2, spec SHALL)

- [ ] 5.1 `OverlayAndInner_WrapHeaderAndChildren` **Spec SHALL**
- [ ] 5.2 `VariantDefault_RendersFormShellClass` **Spec SHALL** — `className === 'form-shell'`.
- [ ] 5.3 `VariantWide_RendersFormShellAndFormShellWideClasses` **Spec SHALL** — `className === 'form-shell form-shell-wide'`.
- [ ] 5.4 `VariantSplit_RendersFormShellAndFormShellSplitClasses` **Spec SHALL** — `className === 'form-shell form-shell-split'`.
- [ ] 5.5 `Title_RenderedInsideFormShellTitleSpan`
- [ ] 5.6 `Children_RenderInsideFormShellInner`

### 5B. CloseButton — type, aria-label, click (Decision 3d-3, spec SHALL)

- [ ] 5.7 `CloseButton_AriaLabelClose` **Spec SHALL**
- [ ] 5.8 `CloseButton_TypeButton` **Spec SHALL** — explicit `type="button"` (regression-guards against form-submit when shell is inside a form).
- [ ] 5.9 `CloseButton_Click_InvokesDismiss` **Spec SHALL**

### 5C. OverlayClickDismiss — self vs. child (Decision 3d-1, spec SHALL)

- [ ] 5.10 `OverlayClickOnSelf_InvokesDismiss` **Spec SHALL** — `fireEvent.click(overlayDiv)` (Decision 6); dismiss invoked.
- [ ] 5.11 `OverlayClickOnChild_DoesNotDismiss` **Spec SHALL** — click bubbles from a child of the inner div; dismiss NOT invoked.

### 5D. useDismiss — three-branch resolution (Decision 3d-4, spec SHALL)

Setup: `vi.mock('next/navigation', () => ({ useRouter: () => ({ back: backSpy, push: pushSpy }) }))` per Decision 4; `backSpy = vi.fn()`, `pushSpy = vi.fn()` reassigned per-test via `mockReset`.

- [ ] 5.12 `UseDismiss_OnCloseProvided_InvokesOnClose_NotRouter` **Spec SHALL** — assert `back`/`push` NOT called.
- [ ] 5.13 `UseDismiss_NoOnClose_HistoryAvailable_InvokesRouterBack` **Spec SHALL** — `window.history.pushState({}, '', '/x')` in `beforeEach` to bump length > 1; assert `back` called once.
- [ ] 5.14 `UseDismiss_NoOnClose_NoHistory_CloseHrefProvided_InvokesRouterPushWithHref` **Spec SHALL** — no `pushState`; length === 1; assert `push` called once with the href.
- [ ] 5.15 `UseDismiss_NoOnClose_NoHistory_NoCloseHref_NoOp` **Spec SHALL** — assert neither `back` nor `push` called; no error thrown.

### 5E. FormShellFooter — Cancel, deleteSlot, Submit (Decision 3d-5, 3d-6, spec SHALL)

- [ ] 5.16 `FormShellFooter_CancelButton_VariantGhost` **Spec SHALL**
- [ ] 5.17 `FormShellFooter_CancelButton_InvokesItsOwnDismissResolution` **Spec SHALL** — Cancel click invokes the `useDismiss(onCancel, cancelHref)` resolution (independent of any parent shell `onClose`).
- [ ] 5.18 `FormShellFooter_SubmitButton_TypeSubmit_VariantPrimary` **Spec SHALL**
- [ ] 5.19 `FormShellFooter_SubmitLabel_RendersInsideSubmit` — accessible name === `submitLabel`.
- [ ] 5.20 `FormShellFooter_IsPendingTrue_SubmitIsLoadingTrue` **Spec SHALL** — assert via whatever loading affordance `<Button isLoading>` emits (coordinate with `Button.test.tsx` patterns; e.g. `aria-busy="true"` OR a spinner span class).
- [ ] 5.21 `FormShellFooter_IsPendingFalse_SubmitIsLoadingFalse`
- [ ] 5.22 `FormShellFooter_IsPendingUndefined_SubmitIsLoadingUndefined`
- [ ] 5.23 `FormShellFooter_DeleteSlot_RenderedBetweenCancelAndSubmit` — DOM order: Cancel → `form-shell-ft-right` containing deleteSlot → Submit.
- [ ] 5.24 `FormShellFooter_NoDeleteSlot_OnlyCancelAndSubmit`

## 6. Audits

### 6.1 Assertion-substance audit (on the new tests)

- [ ] 6.1 Walk each new test file end-to-end. Every assertion MUST name observable output (DOM attributes, exact-string classes, callback shapes, spy `mock.invocationCallOrder` comparisons, exact error-message strings). No internal-state assertions, no DOM snapshots, no tautologies. Specifically verify: `IsOpenFalse_RendersNothing` asserts the queryNotFound shape (not "rendered nothing" as an opaque blob); `ConfirmClick_CallsOnConfirmThenOnClose_InThatOrder` asserts BOTH spies AND the invocation-order relation; `NoClassName_WrapperClassEndsWithTrailingSpace` asserts the EXACT string (not `.toContain('tooltip-container')`); `OverlayClickOnChild_DoesNotDismiss` asserts BOTH that `onClose` was NOT called AND that the `useRouter` mocks were NOT called; `UseDismiss_NoOnClose_NoHistory_NoCloseHref_NoOp` asserts the NO-OP shape (both spies untouched + no throw).

### 6.2 Duplication audit (across the four new test files)

- [ ] 6.2 Inventory shared patterns across the four files. Anticipated: `useRouter` mock (only `FormShell.test.tsx`), `window.history` manipulation (only `FormShell.test.tsx`), spy invocation-order check (only `ConfirmDialog.test.tsx`'s 2.12 / 2.13). Cross-file duplication: anticipated none. Record disposition (extract to `__tests__/test-helpers.tsx` ONLY if duplication crosses ≥ 2 files; otherwise keep inline). The helper file, if created, is excluded from coverage via the existing `**/__tests__/**` glob.

### 6.3 Complexity audit (on the carve-out source)

- [ ] 6.3 Run `npm run lint` and confirm zero `sonarjs/cognitive-complexity` warnings OR errors for any of the four carve-out files. Expected complexity at HEAD: `ConfirmDialog.tsx` ≤ 4; `TooltipWrapper.tsx` ≤ 2; `Empty.tsx` ≤ 5; `FormShell.tsx` ≤ 8 (the `useDismiss` three-branch resolver is the highest). All well below the error-promoted ceiling of 15. Pre-existing warnings in unrelated files carry forward unchanged — record them as carried, not introduced.

### 6.4 Testability audit (on the carve-out source)

- [ ] 6.4 Run `npm run test:coverage` and confirm per-file metrics for the four files meet or exceed the universal `COVERAGE_FLOOR` (lines ≥ 98, statements ≥ 98, branches ≥ 95, functions = 100). Record metrics from `coverage/coverage-summary.json`.
- [ ] 6.4a `/* v8 ignore */` annotations expected:
  - `FormShell.tsx` — `typeof window !== 'undefined'` SSR guard: **`/* v8 ignore next */` with rationale "SSR-guard; window always defined under jsdom; the branch is a Next.js safety net"** per Decision 8.
- [ ] 6.4b Source refactors taken: anticipated none. If any audit finding requires source change, record disposition (b) here.

### 6.5 Invariant-elevation audit

- [ ] 6.5 Confirm every SHALL in each of the four new specs is asserted by ≥ 1 colocated `<State>_<Behavior>` test. Cross-reference:
  - `confirm-dialog-system` SHALLs → tests in §2 (per Decision 3a sub-sections — each sub-section maps to a SHALL).
  - `tooltip-system` SHALLs → tests in §3.
  - `empty-state-system` SHALLs → tests in §4.
  - `form-shell-system` SHALLs → tests in §5.
- [ ] 6.6 Confirm no test asserts an invariant lacking a corresponding SHALL — every assertion maps to a SHALL in one of the four new specs, OR to a pre-existing requirement in an inherited spec (`button-system` token surface for the Cancel/Confirm/Submit/CTA buttons).

## 7. Config changes

- [ ] 7.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` to include the four new paths. Add the carve-out comment header `// test-misc-primitives (sub-proposal 3.8) — locked at universal COVERAGE_FLOOR.` above the four entries, matching the precedent set by prior carve-outs.
  - `app/ui/components/ConfirmDialog.tsx`
  - `app/ui/components/TooltipWrapper.tsx`
  - `app/ui/components/Empty.tsx`
  - `app/ui/components/FormShell.tsx`
- [ ] 7.2 Add four per-file threshold entries in `vitest.config.ts`, each referencing `COVERAGE_FLOOR`:
  - `'app/ui/components/ConfirmDialog.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/TooltipWrapper.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/Empty.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/FormShell.tsx': COVERAGE_FLOOR`
- [ ] 7.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line added (same as prior carve-outs).

## 8. Apply spec deltas

- [ ] 8.1 At archive time, the four new active spec files are CREATED at `openspec/specs/confirm-dialog-system/spec.md`, `openspec/specs/tooltip-system/spec.md`, `openspec/specs/empty-state-system/spec.md`, `openspec/specs/form-shell-system/spec.md` from this sub-proposal's `specs/<name>/spec.md` ADDED Requirements. Each ships with a Purpose paragraph written (not "TBD") per Decision 2.
- [ ] 8.2 Validate via `openspec validate test-misc-primitives --strict`. All four new specs MUST pass strict validation.
- [ ] 8.3 Confirm the carve-out bookkeeping spec at `openspec/changes/test-misc-primitives/specs/testing-foundation/spec.md` stays archive-only — it does NOT roll into the parent `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md`. Per `test-coverage` design D13 two-tier rollup, this carve-out's `testing-foundation` delta is Tier 2 (archive-only).

## 9. Pre-merge

- [ ] 9.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files (same set carried forward across recent carve-outs) are acceptable; this carve-out introduces zero new warnings or errors.
- [ ] 9.2 `npx tsc --noEmit` exits 0 with zero errors.
- [ ] 9.3 `npm run build` completes successfully — all routes generated.
- [ ] 9.4 `npm run test:coverage` passes; coverage report for the four carve-out files at or above the universal `COVERAGE_FLOOR` (98/98/95/100).
- [ ] 9.5 `npm run test:e2e` — Playwright reports "No tests found" on this branch (pre-existing state per the parent's deferral of e2e to sub-proposal 6.1); vacuously zero failures.
