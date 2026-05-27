## Context

Sub-proposal 3.8 of the `test-coverage` initiative. The `testing-foundation` capability is established and hardened by `test-housekeeping`: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the no-backdoor rule is in effect, and seven primitive-family carve-outs already archived (`test-button-system` 3.1 through `test-segmented-control-system` 3.6, plus `test-loading-indicator-system` 3.7) proved the foundation works across families of widely varying size and structure.

This is the eighth primitive carve-out — the **misc-primitives bundle**. Unlike all prior primitive carve-outs, the four files in scope (`ConfirmDialog.tsx`, `TooltipWrapper.tsx`, `Empty.tsx`, `FormShell.tsx`) are flat under `app/ui/components/` rather than in per-family sub-folders, and **no capability spec exists for any of them today**. The carve-out therefore differs from prior carve-outs along two axes:

1. **Spec creation vs. spec elevation.** Prior carve-outs (menu/popover-trigger/segmented-control) elevated call-time SHALLs into an already-existing family spec. This carve-out CREATES four new active specs (one per primitive). Spec scope is "minimal" per the parent's tasks.md §3.8 phrasing — each new spec captures only the call-time invariants the colocated tests lock against, not every possible behavior the primitive could exhibit.
2. **Test-file colocation root.** Prior carve-outs placed tests under `app/ui/components/<family>/__tests__/`. The four files here have no `<family>/` directory, so tests live at `app/ui/components/__tests__/`.

Carve-out (per parent `test-coverage` tasks.md §3.8):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/ConfirmDialog.tsx` | 76 | Default-export function component; renders nothing when `!isOpen`; otherwise overlay + content with title, message, optional tertiary, Cancel (ghost), Confirm (danger). Tertiary and Confirm BOTH invoke `onClose()` after their own action. | jsdom + RTL |
| `app/ui/components/TooltipWrapper.tsx` | 20 | Default-export function component; renders a `<div class="tooltip-container ${className||''}">` wrapping children + an optional `<span class="tooltip">` (gated by `showTooltip`, default true). | jsdom + RTL |
| `app/ui/components/Empty.tsx` | 40 | Default-export function component; capitalizes `type`; title and description branch on `type === 'purchase'`; CTA branches on `type !== 'purchase' && setShowNewItem` → `<Button>`, else → `<LinkButton href={`/${type}s/new`}>`. | jsdom + RTL |
| `app/ui/components/FormShell.tsx` | 107 | Two named exports (`FormShell`, `FormShellFooter`) + one internal hook (`useDismiss`). Overlay-on-self-target dismiss; three variant classes; close button with `aria-label="Close"`; `useDismiss` resolves in three branches (`onClose` → `router.back()` if `history.length > 1` → `router.push(closeHref)` fallback). `<FormShellFooter>` renders Cancel (ghost) + optional `deleteSlot` + Submit (primary, `isLoading={isPending}`). | jsdom + RTL + `next/navigation` mock |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). Per-file thresholds are added by-name in `vitest.config.ts`, referencing the constant.

Bound by:
- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `button-system` (active) — token surface link for `ConfirmDialog`, `Empty`, `FormShellFooter`. No `button-system` SHALL is re-asserted here.
- `form-field-system` (active) — `tooltip-system` MUST NOT regress the "no tooltip for error text" exclusion. Cross-link only; no behavior change.

## Goals / Non-Goals

**Goals:**

- Land four colocated test files (all jsdom) at the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of every file — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for all four files via `eslint.config.mjs` per-file overrides.
- Create four new active capability specs (`confirm-dialog-system`, `tooltip-system`, `empty-state-system`, `form-shell-system`), each minimal — only the call-time SHALLs the new tests lock against — with full Purpose paragraphs.
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors anticipated. Every branch is observable from rendered DOM, mocked `useRouter` calls, `window.history` manipulation, or composed class string. Findings that require source change are recorded with disposition in `tasks.md`.
- No coverage of the dozens of other files at `app/ui/components/` (Header, Nav, AppNav, AppMenu, AppFrame, AppLogo, Logo, AuthPage, ListCard, ListCardRow, MoreCard, ListCollectionsNav, ServiceWorkerRegistration, LoadingIndicator). These belong to other sub-proposals (app-frame 4.1, list-collections 4.6, pwa-shell 4.12, loading-indicator 3.7). The strict-cap rule prevents bundling them here.
- No new variant, prop, or sibling primitive in any of the four. The new specs lock the source AS-SHIPPED.
- No e2e. Component-level integration belongs to the capability-flow sub-proposals that own the call sites.
- No real router. `next/navigation`'s `useRouter` is mocked at the module boundary (jsdom does not provide a real Next router).
- No real `window.history` API behavior beyond what jsdom provides. Tests directly manipulate `window.history.length` (via setup that pushes additional state) and use jsdom's own `history.back()` semantics, NOT real-browser back-stack.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, callback shape, rendered text content, or mocked call argument.

## Decisions

### Decision 1: One `.test.tsx` per source file; tests live at `app/ui/components/__tests__/`.

The four source files are flat under `app/ui/components/`. The test files mirror that location at `app/ui/components/__tests__/<Source>.test.tsx`. This honors the `testing-foundation` `__tests__/` colocation rule (tests live under a `__tests__/` directory adjacent to source) without requiring a source restructure.

Test file locations:
- `app/ui/components/__tests__/ConfirmDialog.test.tsx`
- `app/ui/components/__tests__/TooltipWrapper.test.tsx`
- `app/ui/components/__tests__/Empty.test.tsx`
- `app/ui/components/__tests__/FormShell.test.tsx` (covers `FormShell`, `FormShellFooter`, and the internal `useDismiss`)

**Alternatives considered:**

- *Move each primitive into its own sub-folder (`app/ui/components/confirm-dialog/ConfirmDialog.tsx` etc.) to match the prior carve-outs.* Rejected — source restructure is out of scope for a test-coverage carve-out, and the existing flat structure is not in conflict with the colocation rule (which permits `__tests__/` at any directory level). Bundling a restructure with a test-coverage carve-out would mix concerns and inflate the diff with import-path churn at every call site.
- *Split `FormShell.tsx` into one test per export (`FormShell.test.tsx`, `FormShellFooter.test.tsx`).* Rejected — both exports share the internal `useDismiss` hook, and the cleanest way to test that shared helper end-to-end is through both consumers in one file. Per-file coverage attribution still resolves correctly: the file is `FormShell.tsx`; the tests live in `FormShell.test.tsx`; coverage rolls up at the file level. Same precedent as `test-form-field-system`'s `FormField.test.tsx` covering the `FormField` wrapper alongside its slot composition.

### Decision 2: CREATE four new active specs with full Purpose paragraphs.

The active specs created here are net-new. Unlike the `menu-system` / `segmented-control-system` precedent (where the existing spec carried a "TBD - created by archiving change X" placeholder that prior test-coverage carve-outs intentionally left in place), these specs are being authored fresh — there is no prior archive that already-shipped the "TBD" placeholder. Writing a Purpose paragraph at create-time costs one sentence per spec and saves a future dedicated change.

The Purpose paragraph for each:

- `confirm-dialog-system`: "Govern the `<ConfirmDialog>` primitive at `app/ui/components/ConfirmDialog.tsx` — the modal confirmation chrome used to gate destructive or irreversible actions (delete list, delete item, archive). The primitive consumes `button-system` for its action row and provides a controlled isOpen/onClose interface so consumers own the dialog's open state."
- `tooltip-system`: "Govern the `<TooltipWrapper>` primitive at `app/ui/components/TooltipWrapper.tsx` — the decorative hover-hint chrome used to attach a CSS-driven tooltip to an arbitrary element subtree. The primitive does NOT serve as the carrier for form-field error text (`form-field-system` explicitly excludes hover/focus-gated UI for error messaging); its scope is informational hints (e.g. claim-button availability gating in `ModalButtons`)."
- `empty-state-system`: "Govern the `<Empty>` primitive at `app/ui/components/Empty.tsx` — the empty-collection state with capitalized type-aware title and description plus an inline-create CTA when a state-setter is available, else a link-to-create fallback."
- `form-shell-system`: "Govern the `<FormShell>` / `<FormShellFooter>` modal-form chrome at `app/ui/components/FormShell.tsx` and the internal `useDismiss` hook. The shell wraps form children in an overlay with a header (title + close), supports three width variants (default / wide / split), and dismisses on overlay-self-click or close-button click. The footer renders Cancel + optional delete slot + Submit; the dismiss helper falls back through `onClose` → `router.back()` (when history is available) → `router.push(closeHref)`."

**Alternative considered:** *Leave the Purpose as "TBD" per the `menu-system` / `segmented-control-system` precedent.* Rejected — that precedent is scoped to "spec already shipped with TBD; carve-outs don't rewrite Purpose"; it does not apply to net-new specs. Writing Purpose at create-time avoids a guaranteed future change to fix it.

### Decision 3: ELEVATE the call-time SHALLs each primitive enforces, framed as the family spec's authoritative contract.

Because the new specs are net-new, the invariant-elevation audit's three-part criteria (non-obvious / survives reimplementation / protects real failure mode) is applied to ALL the source's call-time behavior, not just to "implicit invariants not yet stated." Each new SHALL is then traced to ≥ 1 colocated test.

#### Decision 3a: `confirm-dialog-system` SHALLs.

The four SHALLs the new spec adds:

1. **isOpen-false short-circuit.** `<ConfirmDialog isOpen={false}>` SHALL render nothing (no overlay, no content, no buttons). The source's `if (!isOpen) return null;` is the contract; a consumer that toggles `isOpen` between false and true SHALL see the dialog appear / disappear with no residual DOM. Non-obvious (controlled-modal pattern with several alternatives — visible-with-CSS, portal-mounted-conditionally, fully-unmounted; this primitive chose the simplest); survives reimplementation; protects (a) a real failure mode where leftover dialog DOM would intercept clicks on the page behind it.
2. **Button row order and variant.** When rendered, the dialog SHALL contain exactly three buttons in this DOM order when `tertiary` is provided: tertiary, Cancel (`variant="ghost"`), Confirm (`variant="danger"`); and exactly two buttons (Cancel, Confirm) when `tertiary` is not provided. The Cancel and Confirm variants are fixed (ghost / danger) — consumers cannot override them. Tertiary's variant defaults to `'primary'` when not provided and accepts only `'primary' | 'secondary'`. Non-obvious (the variant defaults and the row order encode the recommended visual hierarchy of "soft escape / reversible alternative / destructive action"); survives reimplementation; protects (b) the design-system contract that destructive buttons are always rightmost and danger-styled.
3. **Cancel-button closes via `onClose`.** Clicking Cancel SHALL invoke the `onClose` prop exactly once and SHALL NOT invoke `onConfirm` or `tertiary.onClick`. Non-obvious; survives reimplementation; protects (c) the consumer's contract that Cancel is non-destructive.
4. **Confirm and tertiary BOTH compose `onClose` after their action.** Clicking Confirm SHALL invoke `onConfirm()` THEN `onClose()` in that order, in the same React event tick. Clicking tertiary SHALL invoke `tertiary.onClick()` THEN `onClose()` in that order. This is the dialog's auto-dismiss contract: consumers do not need to manually close the dialog after the action; the dialog closes itself. Non-obvious (alternative: leave dismissal to the consumer; the chosen contract is the convenience contract); survives reimplementation; protects (d) the typical case where the consumer would forget to close, leaving the dialog stuck open after a successful action.

Tests in `ConfirmDialog.test.tsx`:
- `IsOpenFalse_RendersNothing`
- `IsOpenTrue_RendersOverlayAndContentAndButtons`
- `TitleAndMessage_RenderedAsHeadingAndParagraph`
- `MessageAcceptsReactNode_RendersComplexChildren` (the type is `React.ReactNode`)
- `NoTertiary_TwoButtonsOnly`
- `WithTertiary_ThreeButtonsInOrder` (tertiary first, then Cancel, then Confirm — DOM order via `getAllByRole('button')`)
- `TertiaryDefaultVariant_Primary` (default to 'primary' when `variant` omitted)
- `TertiaryExplicitSecondary_Secondary`
- `CancelButton_Variant_Ghost`
- `ConfirmButton_Variant_Danger`
- `CancelClick_CallsOnCloseOnce_NotOnConfirmOrTertiary`
- `ConfirmClick_CallsOnConfirmThenOnClose_InThatOrder` (asserted via call-order spy comparison)
- `TertiaryClick_CallsTertiaryOnClickThenOnClose_InThatOrder`
- `ConfirmTextDefault_Confirm` (default to 'Confirm' when prop omitted)
- `CancelTextDefault_Cancel` (default to 'Cancel' when prop omitted)
- `ConfirmTextOverride_RendersOverride`
- `CancelTextOverride_RendersOverride`
- `TertiaryLabel_RenderedInsideTertiaryButton`

#### Decision 3b: `tooltip-system` SHALLs.

The three SHALLs the new spec adds:

1. **Wrapper composition.** `<TooltipWrapper>` SHALL render an outer `<div>` with the literal class string `'tooltip-container ' + (className || '')` (note the **trailing space after `tooltip-container`**, then the className or empty string — the source uses a template literal `` `tooltip-container ${className || ''}` ``, which always emits the trailing space). The children prop SHALL render as the first child. Non-obvious (the trailing space when no className is passed is a real wart — most contributors would expect a trim); survives reimplementation only if test locks the exact string; protects against a future "tidy up the class" refactor that silently breaks CSS selectors keyed on `.tooltip-container ` (with the trailing space treated as part of the selector — unlikely but possible) AND against a refactor that adds a space-collapse and breaks any consumer concatenating into the className.
2. **Conditional tooltip span via `showTooltip`.** The `<span class="tooltip">` SHALL render IFF the `showTooltip` prop is truthy. The `showTooltip` prop SHALL default to `true` when not provided. The tooltip span's text content SHALL be the `tooltip` prop (string or undefined). Non-obvious (showTooltip allows the consumer to suppress the tooltip without removing the wrapper, useful for keyboard-only or programmatic toggling); survives reimplementation; protects against silent regression where the wrapper is unconditionally renderless.
3. **Family scope explicitly EXCLUDES error-text duty.** This spec SHALL state that `<TooltipWrapper>` is NOT to be used for form-field error text (delegated to `form-field-system`'s inline `<FieldError>` per the explicit removal in `form-field-system/spec.md:333`). Cross-link only — the exclusion already lives in `form-field-system` and is not re-asserted here as a binding test SHALL on `tooltip-system`; the spec acknowledges the boundary so future contributors don't reach for `<TooltipWrapper>` as a regression vector.

Tests in `TooltipWrapper.test.tsx`:
- `Default_RendersDivWithTooltipContainerClass`
- `NoClassName_WrapperClassEndsWithTrailingSpace` (locks Decision 3b's exact-string contract via `expect(div.className).toBe('tooltip-container ')`)
- `WithClassName_AppendedAfterTrailingSpace` (`expect(div.className).toBe('tooltip-container foo')` for `className="foo"`)
- `EmptyStringClassName_BehavesLikeUndefined` (the `||` falls through; result is `'tooltip-container '`)
- `Children_RenderInsideWrapper`
- `ShowTooltipDefault_True_TooltipSpanRendered`
- `ShowTooltipFalse_NoTooltipSpan`
- `ShowTooltipTrue_TooltipText_RenderedInsideSpan`
- `ShowTooltipTrue_NoTooltipProp_SpanRenderedEmpty` (the tooltip prop is optional; the span still renders, just with no text)

#### Decision 3c: `empty-state-system` SHALLs.

The four SHALLs the new spec adds:

1. **Type capitalization.** The `type` prop SHALL be capitalized for display (first character uppercased, remainder preserved) in both title and CTA label when `type !== 'purchase'`. The source uses `type.charAt(0).toUpperCase() + type.slice(1)`. Non-obvious (alternative: require capitalized input from the consumer — this contract puts the formatting at the boundary, freeing call sites to pass `'item'` / `'list'` / etc.); survives reimplementation; protects against subtle UI regressions where consumers might pass mixed-case and double-capitalize.
2. **Purchase branch — no inline-create CTA.** When `type === 'purchase'`, the title SHALL be `'No Purchases Found'` (exact string — note the capitalization and pluralization both come from the `'purchase'` literal path, NOT from the capitalize-and-pluralize logic the other branch uses); the description SHALL be `'You have not marked any items as purchased yet.'`; and NO CTA button or link SHALL render. Non-obvious (the purchase path is the only path with no CTA; the source's `type !== 'purchase'` guard on the CTA branch encodes this); survives reimplementation; protects against silent regression where a "create purchase" button would appear (purchases are derived from items, not directly creatable).
3. **Non-purchase + setShowNewItem → inline Button.** When `type !== 'purchase'` AND `setShowNewItem` is provided, the CTA SHALL render as a `<Button variant="primary">` with a `<FaPlus size={14}>` icon followed by the text `'Create ' + capitalized(type)`. Clicking the button SHALL invoke `setShowNewItem(true)` exactly once. Non-obvious (the choice between inline-create-via-state-setter vs. navigate-to-create-page is governed by the prop surface); survives reimplementation; protects the `ItemsPage` flow at HEAD (the only current consumer).
4. **Non-purchase + no setShowNewItem → LinkButton fallback.** When `type !== 'purchase'` AND `setShowNewItem` is NOT provided, the CTA SHALL render as a `<LinkButton variant="primary" href={`/${type}s/new`}>` with a `<FaPlus size={14}>` icon followed by the text `'Create ' + capitalized(type)`. Non-obvious (the href pluralizes the type by appending `s`, which encodes the route convention `/items/new`, `/lists/new`); survives reimplementation; protects against silent regression where the fallback might break the route convention.

Tests in `Empty.test.tsx`:
- `TypeItem_TitleCapitalized` (`'No Items Found'`)
- `TypeList_TitleCapitalized` (`'No Lists Found'`)
- `TypePurchase_TitleExactString` (`'No Purchases Found'` — locks Decision 3c-2)
- `TypeItem_DescriptionCapitalized` (`'Create your first Item below.'`)
- `TypePurchase_DescriptionExactString` (`'You have not marked any items as purchased yet.'`)
- `TypePurchase_NoCTARendered` (no `<button>` and no `<a>` inside the container)
- `NonPurchase_WithSetter_RendersButtonWithPrimaryVariant` (Decision 3c-3 — button DOM with `variant="primary"`)
- `NonPurchase_WithSetter_ButtonText_CreateCapitalized` (`'Create Item'`)
- `NonPurchase_WithSetter_ButtonClick_InvokesSetterWithTrue` (asserted via spy)
- `NonPurchase_WithSetter_IconRendered` (FaPlus rendered inside the button — assert via `svg` element presence)
- `NonPurchase_NoSetter_RendersLinkButton` (Decision 3c-4 — `<a>` element with `variant="primary"`)
- `NonPurchase_NoSetter_LinkHref_PluralizedType` (`href="/items/new"` for `type="item"`, `href="/lists/new"` for `type="list"`)
- `NonPurchase_NoSetter_LinkText_CreateCapitalized`
- `EmptyContainer_RendersTitleAndDescriptionAsHeadingAndParagraph` (DOM shape: `<h3>` + `<p>`)

#### Decision 3d: `form-shell-system` SHALLs.

The six SHALLs the new spec adds:

1. **Overlay-self-click dismisses.** Clicking the overlay element (the outer `<div class="form-shell-overlay">`) SHALL invoke `dismiss()` IFF the click's `e.target === e.currentTarget` (i.e. the click landed on the overlay itself, not on a bubbled child). Clicks on children of the overlay SHALL NOT dismiss. Non-obvious (the typical modal-close pattern; the `e.target === e.currentTarget` guard is essential to prevent dismiss-on-form-click); survives reimplementation; protects against silent regression where any click inside the modal accidentally closes it.
2. **Three variant class strings.** The inner `<div>` class SHALL be:
   - `'form-shell'` when `variant === 'default'` (or omitted).
   - `'form-shell form-shell-wide'` when `variant === 'wide'`.
   - `'form-shell form-shell-split'` when `variant === 'split'`.
   The variant token SHALL appear as a second class after the base `'form-shell'`. Non-obvious (the variant order matters for CSS specificity); survives reimplementation; protects against silent class-string drift.
3. **Header structure.** The header SHALL render a `<div class="form-shell-hd">` containing a `<span class="form-shell-title">` with the `title` prop text AND a `<button class="form-shell-close" type="button" aria-label="Close">` containing an `<LuX>` icon. The close button SHALL invoke `dismiss()` on click. Non-obvious (the explicit `type="button"` prevents form-submit when the close button is inside a form; the `aria-label="Close"` is the only accessible name); survives reimplementation; protects against silent regression where the close button accidentally submits a form OR loses its accessible name.
4. **`useDismiss` three-branch resolution.** The internal `useDismiss(onClose, closeHref)` hook SHALL resolve dismiss in this priority order:
   a. If `onClose` is provided, invoke `onClose()` and return.
   b. Else, if `typeof window !== 'undefined' && window.history.length > 1`, invoke `router.back()` and return.
   c. Else, if `closeHref` is provided, invoke `router.push(closeHref)`.
   d. If neither branch fires (no `onClose`, no history, no `closeHref`), the dismiss is a no-op.
   Non-obvious (intercepted-route modals prefer `router.back()` to unmount the `@modal` slot; the SSR-safe `typeof window` guard is required for Next.js); survives reimplementation; protects against (a) silent breakage of the intercepted-route pattern, (b) SSR errors from a missing `window` guard, (c) a stuck dialog if `closeHref` is missing AND history is empty.
5. **`FormShellFooter` row.** The footer SHALL render a `<div class="form-shell-ft">` containing: Cancel (`variant="ghost"`) leftmost; a right-aligned `<div class="form-shell-ft-right">` containing the `deleteSlot` (when provided) followed by Submit (`type="submit" variant="primary"`). The Submit button SHALL receive `isLoading={isPending}`. Cancel SHALL invoke its own `useDismiss(onCancel, cancelHref)` resolution on click. Non-obvious (the footer reuses `useDismiss` independently from the shell's dismiss — Cancel and the header-close button can have different `onClose` / `closeHref` semantics); survives reimplementation; protects against silent regression where the Cancel button intercepts the wrong dismiss.
6. **`isLoading` passthrough on Submit.** When `isPending` is true, the Submit button SHALL receive `isLoading={true}`, surfacing whatever loading affordance `<Button>` provides (spinner / disabled state per `button-system`). When `isPending` is false or undefined, `isLoading` SHALL be false / undefined. Non-obvious (the rename `isPending` → `isLoading` matches React 19's `useTransition` return-value naming; consumers pass `isPending` from a transition and the footer adapts); survives reimplementation; protects against silent regression where the loading affordance disappears.

Tests in `FormShell.test.tsx`:
- `OverlayClickOnSelf_InvokesDismiss` (click on overlay itself)
- `OverlayClickOnChild_DoesNotDismiss` (click bubbles from a child inside the inner div — `e.target !== e.currentTarget`)
- `CloseButton_AriaLabelClose`
- `CloseButton_TypeButton` (explicit `type="button"` — regression-guards against form-submit)
- `CloseButton_Click_InvokesDismiss`
- `VariantDefault_RendersFormShellClass`
- `VariantWide_RendersFormShellAndFormShellWideClasses`
- `VariantSplit_RendersFormShellAndFormShellSplitClasses`
- `Title_RenderedInsideFormShellTitleSpan`
- `Children_RenderInsideFormShellInner`
- `UseDismiss_OnCloseProvided_InvokesOnClose_NotRouter` (mock `useRouter`; assert `back`/`push` NOT called)
- `UseDismiss_NoOnClose_HistoryAvailable_InvokesRouterBack` (mock `useRouter`; set up `window.history` to have length > 1 via `history.pushState`)
- `UseDismiss_NoOnClose_NoHistory_CloseHrefProvided_InvokesRouterPushWithHref` (length === 1; assert `push(closeHref)` called)
- `UseDismiss_NoOnClose_NoHistory_NoCloseHref_NoOp` (length === 1, no `closeHref`; no `back`, no `push`)
- `UseDismiss_TypeofWindowUndefined_SkipsHistoryBranch` (the SSR guard — see Decision 4)
- `FormShellFooter_CancelButton_VariantGhost`
- `FormShellFooter_CancelButton_InvokesItsOwnDismissResolution` (independent of shell's dismiss)
- `FormShellFooter_SubmitButton_TypeSubmit_VariantPrimary`
- `FormShellFooter_SubmitLabel_RendersInsideSubmit`
- `FormShellFooter_IsPendingTrue_SubmitIsLoadingTrue`
- `FormShellFooter_IsPendingFalse_SubmitIsLoadingFalse`
- `FormShellFooter_IsPendingUndefined_SubmitIsLoadingUndefined`
- `FormShellFooter_DeleteSlot_RenderedBetweenCancelAndSubmit` (DOM order: Cancel → deleteSlot → Submit)
- `FormShellFooter_NoDeleteSlot_OnlyCancelAndSubmit`

### Decision 4: Mock `next/navigation`'s `useRouter` at the module boundary; manipulate `window.history` directly.

`FormShell.tsx` imports `useRouter` from `next/navigation` and reads `window.history.length`. The test file mocks the module via `vi.mock('next/navigation', () => ({ useRouter: () => ({ back: backSpy, push: pushSpy }) }))` (per-test or per-describe spy reassignment). For `window.history.length` manipulation, jsdom provides a real `window.history` object — tests call `window.history.pushState({}, '', '/test-path')` in `beforeEach` to bump length > 1 for the back-branch tests, then `vi.unstubAllGlobals()` + reset history state in `afterEach`.

For the `typeof window === 'undefined'` SSR-guard branch, we cannot meaningfully test this under jsdom (where `window` is always defined). Disposition: **(c) `/* v8 ignore next */`** with rationale "SSR-guard; window always defined under jsdom; the branch is a Next.js safety net" — recorded in `tasks.md` §5.4. This is the same precedent set by other `typeof window !== 'undefined'` guards in the codebase.

**Alternative considered:** *Use MSW or `vi.hoisted` to stub `useRouter`.* MSW is overkill (no network involved). `vi.hoisted` is unnecessary because the mock is module-scope and re-assigned per-test via the spy refs, not hoisted into an inline factory.

### Decision 5: `Empty.tsx`'s capitalize-and-pluralize logic is tested AS-SHIPPED — no source refactor.

The source emits `` `No ${typeCap}s Found` `` for non-purchase types. This produces `'No Items Found'` for `type='item'`, `'No Lists Found'` for `type='list'` — correct for the current consumers (`item`, `list`). It would produce `'No Boxs Found'` for an irregular plural — but no such consumer exists today. The English-plural-irregularity is NOT a blocker for this carve-out; the SHALL is "first character capitalized; plural suffix `s` appended for the title" (exact source behavior). A future change that adds an irregular-plural consumer would need to either (a) extract a `pluralize()` helper, (b) make `type` accept a `{ singular, plural }` shape, or (c) handle the special case at the call site. None of those is in scope here.

Disposition: lock the behavior as-shipped in the new spec; document the limitation in this design doc; do not refactor.

### Decision 6: `userEvent.click` for clicks; `fireEvent.click` on the overlay for the overlay-self-target test.

`testing-foundation`'s "observable behavior over execution" rule prefers user-facing event sequences. Most click tests use `userEvent.click(getByRole('button', { name: '...' }))`. The exception is the overlay-self-target test in `FormShell.test.tsx`: `userEvent.click` always dispatches via the actual cursor target (which is the topmost element at the click coordinates — not necessarily the overlay). To deterministically dispatch a click whose `e.target === e.currentTarget` (the overlay div), the test uses `fireEvent.click(overlayDiv)` — RTL's lower-level API that lets the test assert "what happens if the user clicks the overlay specifically." Documented as the deliberate exception per the assertion-substance rule (the test is locking the source's `e.target === e.currentTarget` guard, which is the right level to assert at).

### Decision 7: A shared `__tests__/test-helpers.tsx` is allowed if duplication crosses two or more test files; otherwise inline.

Anticipated duplication patterns across the four test files:

- **`useRouter` mock setup** — only `FormShell.test.tsx` needs it. Inline.
- **`window.history` manipulation** — only `FormShell.test.tsx` needs it. Inline.
- **Button-row DOM queries (`getAllByRole('button')` + index assertions)** — used in both `ConfirmDialog.test.tsx` and `FormShell.test.tsx`. Trivial enough to inline; extraction would obscure the per-test intent.
- **`onClose` / `onConfirm` / `setShowNewItem` spies** — RTL idiom (`vi.fn()`), no extraction.
- Cross-file: none anticipated.

If extracted, `test-helpers.tsx` lives at `app/ui/components/__tests__/test-helpers.tsx` and is excluded from coverage via the existing `**/__tests__/**` glob in `vitest.config.ts`'s `coverage.exclude`. The §5.2 audit records the chosen disposition.

### Decision 8: Coverage gaps surface via the no-backdoor preference order; the per-file floor is not relaxed.

Per `test-housekeeping`'s no-backdoor rule. Each branch v8 flags as uncovered has three dispositions in order of preference:

- **(a) Write a test.** Default.
- **(b) Refactor the source** (within the carve-out) to remove the awkward branch.
- **(c) `/* v8 ignore next */` annotation with a one-line rationale comment** for the specific uncoverable region.

Lowering the per-file floor is NO LONGER acceptable. Each disposition (and which option was chosen) SHALL be recorded in `tasks.md`.

Expected attention points:

- `FormShell.tsx` — the `typeof window !== 'undefined'` SSR guard (Decision 4). Disposition: **(c) `/* v8 ignore next */` with rationale "SSR-guard; window always defined under jsdom; the branch is a Next.js safety net"**. Recorded in §5.4.
- `FormShell.tsx` — the `if (closeHref) router.push(closeHref)` falsy `closeHref` branch (the dismiss is a no-op when `closeHref` is undefined AND history is empty). Disposition: **(a)** — `UseDismiss_NoOnClose_NoHistory_NoCloseHref_NoOp` test asserts no `back`/`push` call.
- `FormShell.tsx` — the `if (e.target === e.currentTarget) dismiss();` false-branch (click on a child). Disposition: **(a)** — `OverlayClickOnChild_DoesNotDismiss` test.
- `ConfirmDialog.tsx` — the `tertiary` optional rendering (truthy vs. falsy). Disposition: **(a)** — `NoTertiary_TwoButtonsOnly` AND `WithTertiary_ThreeButtonsInOrder` tests.
- `ConfirmDialog.tsx` — `tertiary.variant ?? 'primary'` (null-coalescing default). Disposition: **(a)** — `TertiaryDefaultVariant_Primary` AND `TertiaryExplicitSecondary_Secondary` tests.
- `Empty.tsx` — the `type === 'purchase'` true/false branches in both title-and-description and CTA. Disposition: **(a)** — explicit tests per branch.
- `Empty.tsx` — the `type !== 'purchase' && setShowNewItem` two-condition branch. Disposition: **(a)** — three tests cover the three reachable states (purchase / non-purchase+setter / non-purchase+no-setter).
- `TooltipWrapper.tsx` — the `className || ''` short-circuit. Disposition: **(a)** — `NoClassName_WrapperClassEndsWithTrailingSpace` AND `EmptyStringClassName_BehavesLikeUndefined` tests.
- `TooltipWrapper.tsx` — the `showTooltip` conditional. Disposition: **(a)** — `ShowTooltipDefault_True_TooltipSpanRendered` AND `ShowTooltipFalse_NoTooltipSpan` tests.

If v8 flags anything else unexpected, the disposition path is recorded per the no-backdoor rule.

### Decision 9: Carve-out bookkeeping is Tier 2 (archive-only), per parent `test-coverage` D13.

This sub-proposal's `testing-foundation` delta is a per-carve-out bookkeeping record (which files are at the universal floor, which complexity overrides land, etc.). Per `test-coverage` design D13's two-tier rollup:

- **Tier 1 (foundation rules)** — go into the parent's accumulator at `openspec/changes/test-coverage/specs/testing-foundation/spec.md`. This sub-proposal contributes NO Tier 1 deltas — the foundation rules (`__tests__/` colocation, `COVERAGE_FLOOR`, no-backdoor, four-audit, etc.) are unchanged.
- **Tier 2 (carve-out bookkeeping)** — stay in this sub-proposal's archive directory at `openspec/changes/archive/<date>-test-misc-primitives/specs/testing-foundation/spec.md`. The Tier 2 entry records which four files are tested at the universal floor, the complexity-override paths, and the elevated-invariant scenario list. Does NOT roll into the parent's accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md`.

This sub-proposal therefore writes a Tier 2 entry only, matching the precedent set by `test-button-system` through `test-segmented-control-system`. Documented in `tasks.md` §7.2.

## Risks / Trade-offs

- **The four primitives are flat under `app/ui/components/`, not in per-family sub-folders.** Risk: future contributors may expect `app/ui/components/confirm-dialog/` etc. and not find the tests. → Mitigation: tests at `app/ui/components/__tests__/<Source>.test.tsx` follow the colocation rule literally; the README or testing-foundation reference can be updated if a search-and-find issue surfaces in practice. Source restructure is explicitly out of scope (Decision 1).
- **Creating four new active specs all at once is more work than ELEVATING into existing specs.** Risk: spec drift between the new specs' wording and the active source. → Mitigation: each SHALL is anchored to a specific colocated test (see Decision 3a/3b/3c/3d sub-sections); the invariant-elevation audit §5.5 confirms every new SHALL has ≥ 1 test, and §5.6 confirms no test asserts an invariant lacking a SHALL.
- **The `TooltipWrapper` trailing-space class composition is a real-world wart.** Risk: a future contributor (or this contributor in a follow-up) will "tidy up the trailing space" and break the test. → Mitigation: the test name `NoClassName_WrapperClassEndsWithTrailingSpace` is explicit. The SHALL in `tooltip-system` documents it. If the contributor decides the trailing space is a bug, they MUST update both source AND spec AND test in the same change — the lock makes the drift loud, which is the contract.
- **`Empty.tsx`'s `LinkButton`-fallback branch is reachable only from no current call site.** Risk: testing the fallback path looks like testing dead code. → Mitigation: the branch IS in the source, and v8 reports it as a real branch. The no-backdoor rule prefers writing a test over `/* v8 ignore */`. The test renders `<Empty type="list" />` (no `setShowNewItem`) and asserts the `<a href="/lists/new">` shape — a one-line test that locks the route convention. If the consumer ever materializes (e.g. a `/lists/empty` page), the test is already in place.
- **`useRouter` mocking is a module-level side effect.** Risk: leaking the mock into adjacent tests or files. → Mitigation: `vi.mock('next/navigation', ...)` is scoped to the test file; `vi.clearAllMocks()` runs in `afterEach`. The spy refs (`backSpy`, `pushSpy`) are file-scoped and reassigned per-test via `mockReset` to ensure isolation.
- **`window.history.length` is a real-browser API with subtle jsdom behavior.** Risk: `window.history.pushState` increments `length` only up to a navigation-stack ceiling that jsdom implements approximately. → Mitigation: tests use exactly one `pushState` per test to bump from length 1 to length 2 for the "history available" tests; the "no history" tests rely on the initial test environment (length === 1). `afterEach` calls `window.history.go(-(window.history.length - 1))` to reset (or accepts the per-test fixture reset jsdom provides between test runs).
- **The `<ConfirmDialog>` Confirm-then-onClose call ORDER is asserted via spy invocation-order comparison.** Risk: the test could pass if either spy is called, missing the order requirement. → Mitigation: use `vi.fn()` with `mock.invocationCallOrder` (vitest's `expect.invocationCallOrder` is the right primitive) to assert `confirmSpy.mock.invocationCallOrder[0] < closeSpy.mock.invocationCallOrder[0]`. Same pattern locks the tertiary's order.
- **Cognitive-complexity promotion locks the ceiling at 15 for all four files.** Measured complexity at HEAD: `FormShell.tsx`'s `useDismiss` is the highest (3 branches in `useDismiss` × 1 in overlay handler ≈ 4–6), well below 15. → Accepted: the ceiling has comfortable buffer.
- **All four new specs are net-new at create-time.** Risk: getting the family scope wrong (too broad → invites unrelated additions; too narrow → misses obvious adjacent behavior). → Mitigation: each Purpose paragraph (Decision 2) explicitly states what the family DOES and DOES NOT govern. `tooltip-system` is the most likely to attract scope creep (cf. the existing `form-field-system` exclusion); its Purpose explicitly bans error-text duty.
- **No e2e coverage of the modal/overlay UX.** Risk: visual-stacking or z-index regressions might pass the unit tests but break the UX. → Accepted: e2e is sub-proposal 6.1; the unit tests assert DOM shape and behavior at the component level, which is the right scope here.
