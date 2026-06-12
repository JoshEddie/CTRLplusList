## Context

Sub-proposal 3.7 of the `test-coverage` initiative. The `testing-foundation` capability is established and hardened by `test-housekeeping`: `__tests__/` colocation is the convention, the universal per-file floor is `lines:98 / statements:98 / branches:95 / functions:100` referenced from a single `COVERAGE_FLOOR` constant in `vitest.config.ts`, the no-backdoor disposition rule is in effect, and the six primitive-family carve-outs already archived (`test-button-system` 3.1, `test-chip-system` 3.2, `test-form-field-system` 3.3, `test-menu-system` 3.4, `test-popover-trigger-system` 3.5, `test-segmented-control-system` 3.6) proved the foundation works against primitive families of widely varying size. This is the seventh primitive carve-out — the loading-indicator family — the smallest in the initiative: one executable file at 20 LOC, complexity 1, no event handlers, no context, no refs, no useEffect, no useState. It also has an unusual file layout: unlike the other primitive families, `LoadingIndicator` lives directly under `app/ui/components/` (not in a `loading-indicator/` subdirectory), so the test file is colocated at `app/ui/components/__tests__/LoadingIndicator.test.tsx`.

Like `test-menu-system`, `test-popover-trigger-system`, and `test-segmented-control-system`, this carve-out elevates against an **already-existing** spec (`loading-indicator-system`, created by archiving `unify-loading-indicators` and extended by subsequent route-segment-Suspense changes). No new capability spec is created. The spec edits here are ADDITIVE: two new requirements that lock call-time invariants the source enforces today but the spec does not state explicitly (the exact class-string composition; the exact DOM child structure).

Carve-out (per parent `test-coverage` tasks.md §3.7):

| File | LOC | Char | Tested how |
|---|---|---|---|
| `app/ui/components/LoadingIndicator.tsx` | 20 | Default-export functional component; takes `{ size: 'inline' \| 'rail' \| 'form' \| 'page' }`; renders `<div role="status" aria-live="polite" className={`loading-indicator loading-indicator--${size}`}>` containing a `<span className="loading-indicator__spinner" aria-hidden="true" />` and a `<span className="sr-only">Loading…</span>` (sr-only label with U+2026 ellipsis); side-effect imports `./loading-indicator.css` | jsdom + RTL |
| `app/ui/components/loading-indicator.css` | 58 | Pure CSS — variant-min-heights, spinner diameters by variant, `@keyframes` for rotation, `@media (prefers-reduced-motion: reduce)` slow-rotation override | NOT part of this carve-out's JS coverage gate (CSS files do not appear in the v8 coverage report) |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). One per-file threshold is added by-name in `vitest.config.ts`, referencing the constant.

Bound by:
- `testing-foundation` — `__tests__/` colocation, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`, observable-behavior-over-execution.
- `loading-indicator-system` (active) — owns every existing loading-indicator SHALL. This sub-proposal ADDS two SHALLs (Decisions 3a/3b below). No requirements are removed; no behavior is changed.

## Goals / Non-Goals

**Goals:**

- Land one colocated test file (jsdom) at the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of the component — no execute-for-coverage renders, no tautological assertions, no snapshot-only tests.
- Promote `sonarjs/cognitive-complexity` from `warn` to `error` for the file via `eslint.config.mjs` per-file override.
- Add two call-time SHALLs to the `loading-indicator-system` spec (exact class-string composition with fixed token order; exact DOM child structure with element types, child order, and `"Loading…"` ellipsis-character text).
- Complete the four-audit obligation (duplication / complexity / testability on source; assertion audit on the new tests) AND the invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No source refactors anticipated. The component is a single-render pure function with no conditionals or early returns; every observable outcome is reachable by varying the `size` prop across its four enum values.
- No coverage of `loading-indicator.css` (not JS — never part of v8 coverage).
- No new size variant, no new sibling primitive, no new sub-component, no new `className` / `tone` / `aria-label` prop.
- No e2e. Route-level integration belongs to capability-flow sub-proposals (most §4 sub-proposals consume `<LoadingIndicator>` as their `<Suspense>` fallback and verify the placement contracts owned by the existing `loading-indicator-system` spec).
- No re-verification of the placement scenarios in the existing spec (per-route Suspense placement for `/items/[id]`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, `/user/[id]`, `/settings/connections`, `/lists/[id]`; `(main)/layout.tsx` no-Suspense rule; `MainShell.tsx` non-existence; per-page `<main className=…>` placement). Those are owned by the routes that render them; the capability-flow sub-proposals (4.x) exercise the consumer behavior, not this carve-out. This carve-out exercises the PRIMITIVE'S render shape.
- No measurement of the CSS-only behaviors in the spec (min-heights per variant, spinner diameters per variant, `prefers-reduced-motion` slow-rotation override, `var(--primary-color)` resolution). jsdom does not resolve stylesheet-declared CSS variables or `min-height` declarations from an external CSS file. The carve-out's class-application assertions are the JS-level proxy for the CSS-level contract; the visual CSS contract is verified by route-level visual regression / manual inspection, not by this carve-out.
- No DOM-snapshot tests. Every assertion names a specific attribute, class string, accessible name, element tag name, or rendered text content.

## Decisions

### Decision 1: One `.test.tsx` colocated at `app/ui/components/__tests__/LoadingIndicator.test.tsx`; no per-component sub-directory restructure.

`LoadingIndicator.tsx` sits directly under `app/ui/components/` rather than in a per-family subdirectory like `button/`, `chip/`, `field/`, `menu/`, `popover-trigger/`, or `segmented-control/`. The `__tests__/` colocation rule from `test-housekeeping` is "the test file lives next to its source file under a `__tests__/` directory in the same folder as the source" — applied here, that means `app/ui/components/__tests__/LoadingIndicator.test.tsx`. This `__tests__/` directory currently does not exist; creating it is part of this carve-out.

Co-resident `app/ui/components/*.tsx` files (`AppFrame.tsx`, `AppLogo.tsx`, `AppMenu.tsx`, `AppNav.tsx`, `AuthPage.tsx`, `ConfirmDialog.tsx`, `Empty.tsx`, `FormShell.tsx`, `Header.tsx`, `ListCard.tsx`, `ListCardRow.tsx`, `ListCollectionsNav.tsx`, `Logo.tsx`, `MoreCard.tsx`, `Nav.tsx`, `ServiceWorkerRegistration.tsx`, `TooltipWrapper.tsx`) are NOT part of this carve-out. They are owned by other sub-proposals: `test-app-frame` (4.1) covers most of the AppFrame chrome; `test-misc-primitives` (3.8) covers `ConfirmDialog`, `TooltipWrapper`, `Empty`, `FormShell`; `test-list-collections` (4.6) covers `ListCard`, `ListCardRow`, `MoreCard`, `ListCollectionsNav`. The `__tests__/` directory created here will eventually host the test files for those sub-proposals too — but this carve-out adds only the one file. Each future sub-proposal adds its own files to the same `__tests__/` directory.

**Alternatives considered:**

- *Restructure `LoadingIndicator.tsx` into `app/ui/components/loading-indicator/` to match the other primitive families.* Rejected — the carve-out is "test the family," not "restructure the family." Source restructure is out of scope; would also require updating every import path (`@/app/ui/components/LoadingIndicator` → `@/app/ui/components/loading-indicator`) across ~14 call sites and updating the spec scenarios that reference the path. A future dedicated change MAY restructure if and when the loading-indicator family grows a sibling primitive that justifies a subdirectory.
- *Place the test at `app/ui/components/LoadingIndicator.test.tsx` (flat, no `__tests__/`).* Rejected — violates the `test-housekeeping` colocation rule that all carve-outs since 3.0 have followed. The flat-file convention was the pre-`test-housekeeping` style and was explicitly retired.
- *Place the test at `app/ui/__tests__/components/LoadingIndicator.test.tsx`.* Rejected — colocation means same-directory `__tests__/`, not a parallel tree.

### Decision 2: The four size variants are tested with four discrete `it()` blocks, not a parameterized `it.each` loop.

`testing-foundation`'s `<State>_<Behavior>` `it()` shape rule prefers one named test per observable behavior. The component has one behavior parameterized by four size values; the temptation is `it.each(['inline', 'rail', 'form', 'page'])('renders class for %s', …)`. Rejected because:

- A failure in the `rail` case would produce a generic "parameterized test 2 of 4 failed" failure name; the discrete-`it()` form produces `SizeRail_RendersVariantClass FAILED`, which surfaces the failing variant in the test name.
- The four variants have load-bearing call-site semantics (`inline` for chip-sized spinners, `rail` for home-page rails, `form` for edit-form fallbacks, `page` for full-route loading) — naming each test after the variant locks the four-way enum into the test ledger explicitly. A future addition of a fifth size variant would require a new `it()` block in this file, surfacing the spec change to anyone reading the test file.
- `testing-foundation`'s three-role `describe()` convention organizes the file around DOM shape, class composition, accessibility, and label content — the per-variant tests fit under the "class composition" `describe()` and the per-variant naming reads cleanly within that group.

**Alternative considered:** *One test that loops `for (const size of sizes)` internally with assertions inside the loop.* Rejected for the same reason — opaque failure naming. The discrete-`it()` form is the project precedent (`test-button-system` did the same for `variant: 'primary' | 'secondary' | 'destructive'`).

### Decision 3: ADD two call-time SHALLs to `loading-indicator-system` that the new tests lock against.

The invariant-elevation audit (per `testing-foundation`) gates each invariant the tests assert against three-part criteria (non-obvious / survives reimplementation / protects real failure mode). Two invariants pass the gate and are not yet stated in the spec.

#### Decision 3a: `<LoadingIndicator>` SHALL compose its outer `<div>` class as `'loading-indicator loading-indicator--<size>'` in fixed token order.

The source at HEAD:

```tsx
<div
  role="status"
  aria-live="polite"
  className={`loading-indicator loading-indicator--${size}`}
>
```

The contract has three parts. (1) **Two tokens.** The class string contains exactly two tokens — the base `'loading-indicator'` and the variant `'loading-indicator--<size>'`. No `className` prop is forwarded; no `tone` token; no third class. (2) **Fixed token order.** The base is always first; the variant is always second. (3) **Variant naming.** The variant token is `loading-indicator--<size>` (double-hyphen, BEM-style modifier), NOT a single-hyphen suffix like `loading-indicator-<size>` and NOT a separate class without the base prefix.

The active `loading-indicator-system` spec describes the size enum and the min-heights but does not state how the class string is composed. The CSS at `loading-indicator.css` uses BOTH the bare `.loading-indicator` selector (for the shared flex layout: `display: flex; align-items: center; justify-content: center; width: 100%`) AND the four variant selectors `.loading-indicator--inline`, `.loading-indicator--rail`, `.loading-indicator--form`, `.loading-indicator--page` (for per-variant `min-height`), AND the compound selectors `.loading-indicator--inline .loading-indicator__spinner` and `.loading-indicator--rail .loading-indicator__spinner, .loading-indicator--form .loading-indicator__spinner, .loading-indicator--page .loading-indicator__spinner` (for per-variant spinner diameter). A rewrite that:

- drops the base class (e.g. `className={`loading-indicator--${size}`}`) would silently lose the shared flex layout — the indicator would render as inline content without centering;
- merges the tokens into a single hyphen-joined class (e.g. `className={`loading-indicator-${size}`}`) would silently lose the base selector AND mis-match the BEM variant selectors;
- reorders the tokens (e.g. `className={`loading-indicator--${size} loading-indicator`}`) would still pass CSS selector matching (class order doesn't affect selector resolution) but would silently break exact-string `className` assertions, regression-tripping the test in future refactors that move to a className composer helper.

Non-obvious (the spec describes visual outcomes and the size enum, but not the class composition). Survives reimplementation (any future refactor — e.g. moving to a `loadingIndicatorClasses({ size })` helper paralleling `segmentedGroupClasses` — would have to preserve the same token order and the same BEM-double-hyphen convention). Protects real failure mode (silent visual regression on the shared flex layout if the base class is dropped; silent variant mis-match if the BEM convention is changed). Elevated.

The test path: four discrete `it()` blocks, one per size variant, each asserting `getByRole('status').className === 'loading-indicator loading-indicator--<size>'` (exact string, not `.toContain`). Exact-string match is the lock; `.toContain('loading-indicator--inline')` would not catch a regression that adds a third token.

#### Decision 3b: `<LoadingIndicator>` SHALL render exactly two `<span>` children inside the outer `<div>`, in fixed order, with exact element types and exact-string label text.

The source at HEAD:

```tsx
<div role="status" aria-live="polite" className={…}>
  <span className="loading-indicator__spinner" aria-hidden="true" />
  <span className="sr-only">Loading…</span>
</div>
```

The contract has four parts. (1) **Outer element type.** The outer element is a `<div>`, NOT a `<section>`, `<output>`, or `<span>`. The `role="status"` ARIA role works on any element, but a `<div>` is the existing precedent and consumers may have CSS that relies on the block-level default (e.g. `.app-surface .loading-indicator { … }` selectors that implicitly assume block layout). (2) **Two children, in fixed order.** The outer `<div>` contains exactly two children: the spinner span first, the label span second. The order is load-bearing for the visual: the spinner is the primary visual element and is centered by the `display: flex` rule on the parent; the sr-only label has `width: 1px; height: 1px; clip: rect(0 0 0 0); position: absolute;` in `global.css` (or similar) and takes no flex space. A reverse order would not change the visual (sr-only is absolutely-positioned), but it would change the screen-reader read order in browsers that read DOM order rather than flex visual order. (3) **Spinner element shape.** The spinner is a self-closing `<span class="loading-indicator__spinner" aria-hidden="true" />` with no text content and `aria-hidden="true"` (the literal string, per React's boolean-to-string serialization). The `aria-hidden` hides the spinner from the accessibility tree so the parent `role="status"` region announces only the sr-only label, not "spinner spinner spinner" or similar. (4) **Label element shape and text.** The label is a `<span class="sr-only">Loading…</span>` with the exact text content `'Loading…'` — including the U+2026 HORIZONTAL ELLIPSIS character (single code point `…`), NOT three ASCII full-stop characters (`...`). The ellipsis character is the typographic convention used throughout the app and is the exact string the spec scenario asserts.

The active spec mentions visually-hidden "Loading…" text and `aria-hidden="true"` on the spinner (line 87) but does not state the element types, the child order, or the sr-only class name. The DOM-shape SHALL elevates these so a refactor that, e.g., replaces the sr-only span with a `<VisuallyHidden>` component wrapper (introducing a third element), or splits the label across two spans for translation purposes, or replaces `…` with `...`, is caught by the test.

Non-obvious (the spec describes the accessibility role-and-attribute shape, not the underlying DOM types or child order). Survives reimplementation (any future refactor — e.g. introducing a `<VisuallyHidden>` wrapper component, switching to `aria-label` instead of an inline sr-only span — would have to either preserve the exact DOM shape OR update the spec). Protects real failure mode (silent screen-reader regression if the sr-only label is replaced with an `aria-label` on the parent — `aria-label` on a `role="status"` region works, but the accessibility-tree behavior on `aria-live="polite"` is subtly different across browsers, so the exact-DOM lock is the safe contract). Elevated.

The test path: one `it()` asserting `getByRole('status').tagName === 'DIV'`; one `it()` asserting `getByRole('status').children.length === 2`; one `it()` asserting `getByRole('status').children[0].tagName === 'SPAN'` and `getByRole('status').children[0].className === 'loading-indicator__spinner'` and `getByRole('status').children[0].getAttribute('aria-hidden') === 'true'` and `getByRole('status').children[0].textContent === ''`; one `it()` asserting `getByRole('status').children[1].tagName === 'SPAN'` and `getByRole('status').children[1].className === 'sr-only'` and `getByRole('status').children[1].textContent === 'Loading…'` (exact string including the U+2026 ellipsis — written with the actual Unicode character in the test source).

**Alternatives considered:**

- *Defer 3a/3b to a follow-up sub-proposal `harden-loading-indicator-spec`.* Rejected — the invariant-elevation audit IS part of this sub-proposal per `testing-foundation`. Deferring breaks the audit obligation.
- *Add only 3a (class composition); leave 3b (DOM shape) implicit because the active spec already states role/aria/sr-only at requirement-level prose.* Rejected — the active spec's accessibility requirement states *outcomes* ("contain a visually-hidden text label 'Loading…'") but not *DOM types* (the label is a `<span>`, not an `aria-label` attribute, not a `<p>`, etc.). 3b locks the structural contract that consumers' CSS selectors and screen-reader expectations both rely on. The smallest possible drift between source and spec is what the audit flags.
- *Use `getByText('Loading…')` instead of asserting `textContent` directly.* Both are equivalent for the positive path; `textContent` is preferred because it lets the test assert the exact string including the U+2026 character on the literal label element, and a future change that introduces a sibling text node (e.g. an additional "Please wait" span) would fail the exact-`textContent` match where `getByText` might still match.

### Decision 4: The `aria-hidden` assertion uses `getAttribute('aria-hidden') === 'true'`, not `hasAttribute('aria-hidden')`.

React 19 serializes the JSX `aria-hidden={true}` boolean to the literal string `"true"` on the rendered DOM element. The HTML attribute is then `aria-hidden="true"` (not the bare-attribute form `aria-hidden` and not `aria-hidden=""`). A test that uses `hasAttribute('aria-hidden')` would pass against ANY string value — including `aria-hidden="false"` and `aria-hidden=""`, both of which are semantically WRONG (the WAI-ARIA spec treats `aria-hidden=""` and `aria-hidden="false"` as not-hidden). The exact-string `getAttribute === 'true'` check is the load-bearing assertion.

The same pattern applies to `aria-live="polite"`: assert `getAttribute('aria-live') === 'polite'`, not `hasAttribute('aria-live')`.

**Alternative considered:** *Use `toHaveAttribute('aria-hidden', 'true')` from `@testing-library/jest-dom`.* Acceptable and equivalent in assertion strength. The choice is stylistic — `getAttribute === 'true'` is more explicit about the string-value contract; `toHaveAttribute(...)` reads more naturally. The implementation MAY pick either; the §5.1 assertion-substance audit verifies the chosen form locks the string-value contract (not just the attribute presence).

### Decision 5: Coverage gaps surface via the no-backdoor preference order; the per-file floor is not relaxed.

Per `test-housekeeping`'s no-backdoor rule. Each branch v8 flags as uncovered has three dispositions in order of preference:

- **(a) Write a test.** Default.
- **(b) Refactor the source** (within the carve-out) to remove the awkward branch.
- **(c) `/* v8 ignore next */` annotation with a one-line rationale comment** for the specific uncoverable region.

Lowering the per-file floor is NO LONGER acceptable. Each disposition (and which option was chosen) SHALL be recorded in `tasks.md`.

Expected attention points:

- The component has NO conditionals, NO early returns, NO loops, NO ternaries (the `${size}` template-literal substitution is not a branch — v8 measures it as a single statement). Branches metric is therefore expected at 100% trivially after the four-variant sweep.
- The side-effect `import './loading-indicator.css';` line is a top-level statement and counts as one covered line on any module load. No special handling needed.
- The type alias `type LoadingIndicatorSize = …;` and the `interface LoadingIndicatorProps` declarations erase at TypeScript compile and produce zero runtime statements. They do not appear in the v8 coverage report.

If v8 flags anything unexpected, the disposition path is recorded per the no-backdoor rule. The expected outcome is 100/100/100/100 on the single file from the four-variant sweep plus the DOM-shape assertions, with no `/* v8 ignore */` annotations.

### Decision 6: No `__tests__/test-helpers.tsx` is created.

The carve-out has one test file. There is no cross-file duplication to extract because there is no cross-file. Local helpers within `LoadingIndicator.test.tsx` are not anticipated either — every test renders `<LoadingIndicator size="…" />` directly with no wrapping context, no spy setup, and no shared assertion helpers. The `render` call is one line; a `Harness` abstraction would add noise.

If duplication unexpectedly surfaces during the §5.2 audit (e.g. across the four size-variant tests, each asserting the same DOM-shape invariant), the disposition is to keep the assertions inline — the four-variant sweep tests the same INVARIANT four times by design (Decision 2), and the §5.1 assertion-substance audit verifies each test asserts the variant-specific class string, not the shared shape.

### Decision 7: The active spec's per-route Suspense placement requirements stay out of scope.

The active `loading-indicator-system` spec has 16 requirements; this carve-out modifies the four that describe the primitive itself (size enum, min-heights, accessibility, CSS-spinner-with-token) and ADDS two new ones (class composition, DOM shape). The other ten requirements — `(main)/layout.tsx` no-Suspense rule, `MainShell.tsx` non-existence, per-page `<main className=…>` placement, the per-route Suspense contracts for `/items/[id]`, `/lists/[id]/edit`, `/lists/[id]/choose-items`, `/user/[id]`, `/settings/connections`, `/lists/[id]`, and the no-duplicate-chrome rule — are PLACEMENT contracts owned by the routes that render `<LoadingIndicator>` as their fallback. The capability-flow sub-proposals (4.x) that own those routes will exercise the placement scenarios. This carve-out exercises the PRIMITIVE's render shape only.

This is the same scope discipline `test-segmented-control-system` applied (which did not re-verify the `VisibilityPicker` / `ItemsToolbar` migration scenarios in the `segmented-control-system` spec), and the same discipline `test-menu-system` and `test-popover-trigger-system` applied. The carve-out tests the primitive; the consumers test the consumption.

## Risks / Trade-offs

- **The U+2026 horizontal ellipsis vs three ASCII dots is easy to get wrong.** Risk: a contributor copy-pasting from a non-Unicode-aware editor writes `expect(...).toHaveTextContent('Loading...')` (three ASCII dots) which silently fails to match the source's single-character `…`. The test passes against a wrong source (any text containing "Loading...") and fails against the right source. → Mitigation: Decision 3b explicitly names the U+2026 character; the spec scenario asserts the exact string `'Loading…'`; the test file's `<State>_<Behavior>` `it()` name is `LabelText_IsExactlyLoadingEllipsisCharacter` (not `LabelText_StartsWithLoading`); the test source uses the literal Unicode character (typed or pasted from the source file, not retyped). The CI lint step does NOT catch this — it's a runtime assertion, not a compile error.
- **The `aria-hidden`-as-bare-attribute trap.** Risk: writing `expect(spinner).toHaveAttribute('aria-hidden')` (no value) passes against `aria-hidden=""` (which is semantically not-hidden) and against `aria-hidden="false"` (also not-hidden). → Mitigation: Decision 4 mandates the exact-string-value form; the assertion-substance audit (§5.1) verifies each `aria-*` assertion locks the string value, not just the attribute presence.
- **The four-variant sweep tempts a `it.each` parameterization.** Risk: a future contributor refactors the four discrete `it()` blocks into a parameterized loop and the test names degrade to `index N` notation. → Mitigation: Decision 2 documents the choice; the test file's header comment cites Decision 2; the assertion-substance audit (§5.1) flags any parameterized form as a regression.
- **The CSS-driven behaviors (min-heights, spinner diameters, reduced-motion override, `--primary-color` resolution) cannot be tested in JS.** Risk: a future change to the CSS that removes the `min-height` rule for the `rail` variant or breaks the `prefers-reduced-motion` override would not be caught by this carve-out. → Accepted: the active spec already states these behaviors as scenarios; visual regression and manual route-level inspection are the verification path. The carve-out's class-application assertions are the JS-level proxy — if the class is applied to the right element, the CSS will work; if the class is not applied (Decision 3a regression), the test catches it.
- **Cognitive-complexity promotion locks the ceiling at 15 for `LoadingIndicator.tsx`.** Measured complexity at HEAD: 1. The ceiling has the largest possible buffer. → Accepted: any future change that pushes the file over 15 is a major rewrite that warrants its own design review.
- **The carve-out is in a shared `__tests__/` directory that subsequent sub-proposals will share.** Risk: the `app/ui/components/__tests__/` directory created here will host test files from `test-misc-primitives` (3.8), `test-app-frame` (4.1), `test-list-collections` (4.6), and others. Conflicting per-file overrides in `eslint.config.mjs` or `vitest.config.ts` between sub-proposals are possible. → Mitigation: each per-file threshold and override is keyed by file path, not by directory. No directory-level conflict is possible. The shared `__tests__/` directory is just a folder; the per-file gates are independent.
- **The active spec has 16 requirements and the carve-out tests only the primitive-shape ones.** Risk: a reader of the spec assumes the carve-out covers every requirement and tests are missing for, e.g., the `/user/[id]` two-section-streaming scenario. → Mitigation: Decision 7 documents the scope split; the spec edits leave the placement requirements unchanged and add only the two primitive-shape elevations. Capability-flow sub-proposals (4.x) own the placement verification.
- **No source restructure into `app/ui/components/loading-indicator/`.** Risk: the loading-indicator family is the only primitive family without a per-family subdirectory, and the structural asymmetry may invite future drift. → Accepted: Decision 1 documents the choice; the carve-out is "test the family," not "restructure the family"; a future dedicated change MAY restructure if and when a sibling primitive joins the family.
