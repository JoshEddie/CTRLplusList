## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` — already done by `test-foundation` but a sanity check before drafting tests. ✅ Verified: setup.ts is one line: `import '@testing-library/jest-dom/vitest';`.
- [x] 1.2 Verify the jsdom project (`*.test.tsx`) in `vitest.config.ts` resolves `@/` and the `react()` plugin is active (both established by foundation; check by running an existing `*.test.tsx` file like `app/ui/components/button/buttonClasses.test.ts` — wait, that's `.test.ts` — find any existing `.test.tsx` test under `hooks/` or write a sanity `Button.test.tsx` that imports the component and renders it). ✅ Verified: `hooks/use-media-query.test.tsx` runs under the jsdom project with `react()` plugin + alias root.
- [x] 1.3 Confirm the `next/link` mock pattern resolves under vitest (one-line `vi.mock('next/link', () => ({ default: ({ children, href, ...rest }) => React.createElement('a', { href: typeof href === 'string' ? href : href?.toString(), ...rest }, children) }))` — verify in `LinkButton.test.tsx` before authoring the assertion suite). ✅ Used a `forwardRef`-wrapped variant so `LinkButton`'s `ref={ref}` resolves to the rendered `<a>` (the plain functional mock loses the ref).
- [x] 1.4 Spec re-grep: confirm `button-system` SHALLs the tests will lock against (loading-state contract, toggle-state contract, variant set, shared composer, LinkButton-no-loading) match the production code as of HEAD. If any spec wording diverges from production (as `test-pure-libs` found for `buttonClasses({ variant, size, pressed, extra })` vs actual `{ variant, size, extra }`), surface as an audit finding in §7.5 and decide disposition. ✅ Re-grepped HEAD: `Button.tsx` translates `isLoading` → `disabled || isLoading` + `aria-busy` + `.btn-spinner` + `.sr-only` wrapper; `pressed === undefined ? undefined : pressed`; `type = 'button'` default. `LinkButton.tsx` mirrors the toggle ternary and has no `isLoading` in its prop type. Six variants in `types.ts`. No divergence found between spec and code.

## 2. Write `app/ui/components/button/Button.test.tsx` (90% floor)

### 2A. VariantSizeMatrix — class-string passthrough

- [x] 2.1 Enumerate `ButtonVariant` from `./types`: `['primary', 'secondary', 'ghost', 'danger', 'on-dark', 'link']`. For each variant: render `<Button variant={v}>label</Button>`, query `screen.getByRole('button')`, assert `toHaveClass('btn', v)` (jest-dom's `toHaveClass` accepts multiple class names).
- [x] 2.2 For each variant: render `<Button variant={v} size="sm">label</Button>`, assert `toHaveClass('btn', v, 'btn-sm')`.
- [x] 2.3 For each variant: render `<Button variant={v} size="md">label</Button>`, assert `toHaveClass('btn', v)` AND `not.toHaveClass('btn-sm')` (md is default, no btn-sm token).

### 2B. LoadingStateContract — `button-system` SHALL: loading sets disabled + aria-busy + spinner + sr-only-wrapped children

- [x] 2.4 `IsLoadingTrue_RendersSpinnerSpanWithBtnSpinnerClass` — render `<Button variant="primary" isLoading>Save</Button>`; assert `button.querySelector('.btn-spinner')` is non-null AND has `aria-hidden="true"`.
- [x] 2.5 `IsLoadingTrue_WrapsChildrenInSrOnlySpan` — render same; assert `button.querySelector('.sr-only')` is non-null and contains the text `Save`.
- [x] 2.6 `IsLoadingTrue_SetsAriaBusyTrue` — render same; assert `toHaveAttribute('aria-busy', 'true')`.
- [x] 2.7 `IsLoadingTrue_AccessibleNameUnchanged` — render same; assert `toHaveAccessibleName('Save')` (children remain available to AT via `.sr-only`).
- [x] 2.8 `IsLoadingFalse_NoSpinnerNoAriaBusy` — render `<Button variant="primary" isLoading={false}>Save</Button>`; assert `button.querySelector('.btn-spinner')` is null AND `not.toHaveAttribute('aria-busy')`.
- [x] 2.9 `IsLoadingOmitted_NoSpinnerNoAriaBusy` — render `<Button variant="primary">Save</Button>`; same assertions as 2.8.
- [x] 2.10 `IsLoadingTrue_RendersChildrenLiterallyOnceInSrOnly` — assert children appear in DOM exactly once (inside `.sr-only`), not duplicated alongside the spinner.

### 2C. DisabledShortCircuit — `disabled || isLoading`

- [x] 2.11 `DisabledOmittedIsLoadingOmitted_RenderedButtonNotDisabled` — render `<Button variant="primary">Save</Button>`; assert `not.toBeDisabled()`.
- [x] 2.12 `DisabledTrueIsLoadingOmitted_RenderedButtonDisabled` — render `<Button variant="primary" disabled>Save</Button>`; assert `toBeDisabled()` AND `not.toHaveAttribute('aria-busy')`.
- [x] 2.13 `DisabledOmittedIsLoadingTrue_RenderedButtonDisabledAndBusy` — render `<Button variant="primary" isLoading>Save</Button>`; assert `toBeDisabled()` AND `toHaveAttribute('aria-busy', 'true')`.
- [x] 2.14 `DisabledTrueIsLoadingTrue_RenderedButtonDisabledAndBusy` — render `<Button variant="primary" disabled isLoading>Save</Button>`; assert `toBeDisabled()` AND `toHaveAttribute('aria-busy', 'true')`.
- [x] 2.15 `IsLoadingTrue_OnClickHandlerNotInvoked` — render `<Button variant="primary" isLoading onClick={spy}>Save</Button>`; `userEvent.click(button)`; assert spy NOT called (the `disabled` attribute prevents click event per HTML spec; we lock the contract end-to-end).

### 2D. ToggleStateContract — `button-system` SHALL: aria-pressed emitted only when `pressed` defined

- [x] 2.16 `PressedTrue_AriaPressedTrueAttribute` — render `<Button variant="on-dark" pressed>X</Button>`; assert `toHaveAttribute('aria-pressed', 'true')`.
- [x] 2.17 `PressedFalse_AriaPressedFalseAttribute` — render `<Button variant="on-dark" pressed={false}>X</Button>`; assert `toHaveAttribute('aria-pressed', 'false')`.
- [x] 2.18 `PressedUndefined_NoAriaPressedAttribute` — render `<Button variant="primary">X</Button>` (no `pressed` prop); assert `not.toHaveAttribute('aria-pressed')`. This is the discrete `undefined` case per design Decision 3.

### 2E. TypeAttributeDefault

- [x] 2.19 `TypeOmitted_RenderedTypeButton` — render `<Button variant="primary">Save</Button>`; assert `toHaveAttribute('type', 'button')` (NOT the HTML default `'submit'`).
- [x] 2.20 `TypeSubmit_RenderedTypeSubmit` — render `<Button variant="primary" type="submit">Save</Button>`; assert `toHaveAttribute('type', 'submit')`.
- [x] 2.21 `TypeReset_RenderedTypeReset` — render `<Button variant="primary" type="reset">Save</Button>`; assert `toHaveAttribute('type', 'reset')`.

### 2F. ClassNamePassthrough

- [x] 2.22 `ClassNameProvided_AppearsAsExtraAfterVariantTokens` — render `<Button variant="primary" className="page-action">X</Button>`; assert `toHaveClass('btn', 'primary', 'page-action')`. (Class composition is owned by `buttonClasses`, tested in 2.1 — this asserts the wiring.)
- [x] 2.23 `ClassNameMultiToken_AllTokensPresent` — `className="a b c"` → `toHaveClass('btn', 'primary', 'a', 'b', 'c')`.

### 2G. ForwardRefResolvesToButtonElement

- [x] 2.24 `RefAttached_ResolvesToButtonElement` — create `const ref = createRef<HTMLButtonElement>()`; render `<Button ref={ref} variant="primary">X</Button>`; assert `ref.current?.tagName === 'BUTTON'`.

### 2H. ArbitraryHtmlAttributePassthrough

- [x] 2.25 `OnClickProvided_FiresOnClick` — render with `onClick={spy}`; `userEvent.click(button)`; assert spy called exactly once.
- [x] 2.26 `AriaLabelProvided_AccessibleNameMatchesAriaLabel` — render `<Button variant="primary" aria-label="Delete list"><Icon /></Button>` (children = arbitrary element); assert `toHaveAccessibleName('Delete list')`. Locks the icon-only-button SHALL from `button-system`.
- [x] 2.27 `DataAttributeProvided_RenderedVerbatim` — render with `data-testid="x"`; assert `toHaveAttribute('data-testid', 'x')`.
- [x] 2.28 `NameValueProvided_RenderedVerbatim` — render `<Button variant="primary" name="action" value="save">X</Button>`; assert `name`/`value` both render (form-submit contract).

## 3. Write `app/ui/components/button/LinkButton.test.tsx` (90% floor)

### 3A. Setup

- [x] 3.1 Mock `next/link` at file top per design Decision 2 (one-line `vi.mock` rendering `<a href={...} {...rest}>{children}</a>`). ✅ Variant: used `forwardRef` so `LinkButton`'s `ref={ref}` resolves to the rendered `<a>`. Plain functional mock loses the ref.

### 3B. VariantSizeMatrix

- [x] 3.2 Mirror Button 2.1: for each variant, render `<LinkButton variant={v} href="/x">label</LinkButton>`, query `screen.getByRole('link')`, assert `toHaveClass('btn', v)`.
- [x] 3.3 Mirror Button 2.2: `size="sm"` → `toHaveClass('btn', v, 'btn-sm')`.
- [x] 3.4 Mirror Button 2.3: `size="md"` → `toHaveClass('btn', v)` AND `not.toHaveClass('btn-sm')`.

### 3C. HrefPassthrough

- [x] 3.5 `HrefString_RenderedAsHrefAttribute` — render `<LinkButton variant="primary" href="/lists">X</LinkButton>`; assert `toHaveAttribute('href', '/lists')`.

### 3D. ToggleStateContract — mirrors Button

- [x] 3.6 `PressedTrue_AriaPressedTrueAttribute` — analogous to 2.16.
- [x] 3.7 `PressedFalse_AriaPressedFalseAttribute` — analogous to 2.17.
- [x] 3.8 `PressedUndefined_NoAriaPressedAttribute` — analogous to 2.18.

### 3E. ClassNamePassthrough

- [x] 3.9 `ClassNameProvided_AppearsAsExtraAfterVariantTokens` — analogous to 2.22.

### 3F. ForwardRefResolvesToAnchorElement

- [x] 3.10 `RefAttached_ResolvesToAnchorElement` — `createRef<HTMLAnchorElement>()`; assert `ref.current?.tagName === 'A'`.

### 3G. ArbitraryAnchorAttributePassthrough

- [x] 3.11 `OnClickProvided_FiresOnClick` — `userEvent.click(link)`; spy called once.
- [x] 3.12 `AriaLabelProvided_AccessibleNameMatchesAriaLabel` — icon-only-link case.
- [x] 3.13 `TargetAndRelProvided_RenderedVerbatim` — render `target="_blank" rel="noopener"`; assert both attributes present.
- [x] 3.14 `DataAttributeProvided_RenderedVerbatim`.

### 3H. LinkButtonDoesNotSupportLoading — `button-system` SHALL: explicit non-feature

- [x] 3.15 `IsLoadingNotInTypeSignature_TscNoEmitCatchesAttempt` — record in the test file's header comment that `isLoading` is intentionally excluded from `LinkButtonProps`. NO runtime test (a runtime test for a TypeScript-only contract would be a tautology). The `npx tsc --noEmit` gate in §9 enforces this; a future change adding `isLoading` to the type or rendering a spinner here would fail one of: tsc (if added to type), the snapshot of rendered tokens (if a `.btn-spinner` appears without a type-level signal). Sanity-render `<LinkButton variant="primary" href="/x">X</LinkButton>` and assert `link.querySelector('.btn-spinner')` is null (the visible regression guard).

### 3I. ChildrenRender

- [x] 3.16 `ChildrenProvided_RenderedAsLinkContent` — render `<LinkButton variant="primary" href="/x">View lists</LinkButton>`; assert `toHaveTextContent('View lists')`.

## 4. Config changes

- [x] 4.1 Add per-file override block in `eslint.config.mjs` promoting `sonarjs/cognitive-complexity` to `error` for `app/ui/components/button/Button.tsx` and `app/ui/components/button/LinkButton.tsx`. ✅ Added both paths to the existing `[error, 15]` override block.
- [x] 4.2 Add `app/ui/components/button/types.ts` and `app/ui/components/button/index.ts` to `vitest.config.ts`'s `test.coverage.exclude` with comments naming the reason for each (type-only / re-export-only). ✅ Added both, plus `app/ui/components/button/test-helpers.ts` (test-fixture shared by all three button test files — see §7.1 disposition).
- [x] 4.3 Add per-file thresholds in `vitest.config.ts` for `app/ui/components/button/Button.tsx` and `app/ui/components/button/LinkButton.tsx`: `lines: 90`, `statements: 90`, `functions: 90`, **`branches: 90`** (set up-front, NOT after measurement — per design Decision 5). ✅ Both files locked at 90/90/90/90.
- [x] 4.4 Run `npm test -- --coverage`. For every uncovered branch the v8 report flags on either file, dispose of it in the preference order from design Decision 5:
  - **(a)** Write a test that covers it. Default disposition.
  - **(b)** Refactor the source (within carve-out) to remove the awkward branch.
  - **(c)** Lower the per-file `branches` floor for that file AND add a `vitest.config.ts` comment naming the specific uncovered branch(es) and why neither (a) nor (b) applies (e.g. "v8 counts the `forwardRef` second-arg fallback as a branch never reached in jsdom"). "Measured X, floor at X-5" is NOT acceptable rationale.
  Each disposition (and which option was chosen) SHALL be recorded in this task's checked-off note. Do NOT silently relax the floor to match the measured number.

  ✅ **No uncovered branches.** Measured (per coverage-summary.json):
  - `Button.tsx`: lines 3/3 (100%), statements 3/3 (100%), functions 1/1 (100%), branches **9/9 (100%)**.
  - `LinkButton.tsx`: lines 3/3 (100%), statements 3/3 (100%), functions 1/1 (100%), branches **2/2 (100%)**.

  Zero gaps; no (b) refactor or (c) floor relaxation needed. The 90/90/90/90 thresholds pass cleanly on the first measurement, validating Decision 5's "set the bar up-front" stance for tiny pure-render primitives.

## 5. Reserved (no source refactors expected — see §7)

## 6. Reserved (covered by §4)

## 7. Four audits (per testing-foundation Requirement: "Each test sub-proposal SHALL perform four audits and dispose of every finding")

- [x] 7.1 **Duplication audit** — measured against the two carve-out source files AND across the two new test files. Expected finding: the variant/size matrix scaffold (`VARIANTS` array, `cap()` helper) appears in `buttonClasses.test.ts` (2.1) AND will appear in `Button.test.tsx` + `LinkButton.test.tsx`. **Disposition options:** (a) accept the duplication as test-file-local (the `cap()` PascalCase formatter is 6 lines, the `VARIANTS` array is one declaration); (b) extract to `app/ui/components/button/test-helpers.ts` excluded from coverage. Decide at audit time; the testing-foundation rule on shared fixtures applies if used in two-or-more files. Three uses (counting 2.1's) tips toward extraction.

  ✅ **Disposition: (b) extract.** Created `app/ui/components/button/test-helpers.ts` exporting `VARIANTS` and `cap()`; refactored `buttonClasses.test.ts` to import from it; `Button.test.tsx` and `LinkButton.test.tsx` consume it. Three users, single source of truth. Added to `vitest.config.ts` `coverage.exclude` (test-fixture, not production).

- [x] 7.2 **Complexity audit** — measured against `sonarjs/cognitive-complexity`:
  - `Button.tsx:Button` — measured complexity expected ~3 (one ternary on `isLoading`, one ternary on `pressed === undefined`). PASS.
  - `LinkButton.tsx:LinkButton` — measured complexity expected ~1 (one ternary on `pressed === undefined`). PASS.
  - Record measured values; promote per §4.1; assert `npm run lint` against these files emits zero `sonarjs/cognitive-complexity` errors after promotion.

  ✅ Promoted both files to `[error, 15]` in `eslint.config.mjs`. `npm run lint` against the carve-out emits **zero** `sonarjs/cognitive-complexity` findings on either file (measured complexity below threshold). Promotion verified active in §8.3 — a deliberately-inflated function inside `Button.tsx` produces the expected `error` (not `warning`), then reverted.

- [x] 7.3 **Testability audit** — identify any pattern that resisted testing. Expected findings:
  - `next/link`'s router-context requirement (resolved by §3.1 module mock per design Decision 2) — record as testing-pattern observation, NOT a source defect.
  - `forwardRef` cannot be tested via `screen.getBy*` alone (resolved by `createRef` pattern in §2.24 / §3.10) — record as testing-pattern observation.
  - If a foundation gap surfaces (missing matcher, RTL version issue, jsdom shim), follow the `test-pure-libs` precedent: fix in-place if one-line additive; defer as sibling sub-proposal if structural.

  ✅ Findings recorded:
  1. **`next/link` router-context** — resolved by per-file `vi.mock` with a `forwardRef`-wrapped `<a>` (necessary because `LinkButton` passes `ref={ref}` to `<Link>`; a plain function mock loses the ref and breaks §3.10). Recorded as testing-pattern observation; no source change.
  2. **`forwardRef` resolution** — resolved by `createRef` + assert `ref.current?.tagName`. Recorded as testing-pattern observation.
  3. **`.btn-spinner` / `.sr-only` decorative spans have no role/label** — role-based queries can't reach them, so structural assertions use `querySelector` by class. Tripped `testing-library/no-node-access`; disposition was a file-level `eslint-disable` with reason (the spec mandates the spans' presence; structural assertions are the canonical way to lock the rendered contract; AT-observable surface is asserted separately via role queries). Recorded as testing-pattern observation; no source change.
  4. **Foundation gap surfaced — RTL auto-cleanup not registered under `globals: false`.** First time the foundation ran RTL component tests revealed that RTL's auto-cleanup hook relies on a global `afterEach`, which `vitest.config.ts`'s `globals: false` does not expose. Without cleanup, the rendered DOM leaked between tests and `screen.getByRole('link')` found duplicates across cases. **Fixed in-place per `test-pure-libs` precedent** (one-line-additive): `test/helpers/setup.ts` now imports `cleanup` from RTL and registers it via the imported `afterEach` from vitest. Sibling proposal not warranted.

- [x] 7.4 **Assertion audit** — every `it(...)` in the two new test files SHALL name a specific class string, specific attribute value, specific accessible name, specific spy-call shape, or referential identity. No lone `toBeDefined()`, `toBeTruthy()` on a self-constructed value, snapshot-only, or tautology. For each test, record (in this task's checked-off rubric) the observable behavior under test in one sentence. Specifically guard against:
  - `expect(button).toBeInTheDocument()` as the ONLY assertion (tautology — `screen.getByRole` already threw if it wasn't).
  - `expect(button.className).toContain('btn')` when the assertion should be `toHaveClass('btn', variant)` against the specific composed string.
  - Asserting that `aria-pressed` is "set" without asserting the specific value (the `'true'` vs `'false'` vs absent distinction is the contract).

  ✅ Walked every test. All 36 assertions in `Button.test.tsx` + 27 in `LinkButton.test.tsx` name a specific class composition (`toHaveClass('btn', variant, …)`), a specific attribute value (`toHaveAttribute('aria-pressed', 'true')`, etc.), a specific accessible name (`toHaveAccessibleName('Save')`), a specific spy-call count (`toHaveBeenCalledTimes(1)`), or a specific ref-target tag (`ref.current?.tagName === 'BUTTON'`). No lone `toBeDefined()`, `toBeTruthy()` on self-constructed values, no snapshot-only, no `toBeInTheDocument()` as sole assertion. The `aria-pressed` three-case enumeration (`true`/`false`/absent) is exhaustive per Decision 3. The `disabled || isLoading` matrix is exhaustive per Decision 6. No findings.

- [x] 7.5 **Invariant-elevation audit** — per testing-foundation Requirement: "Sub-proposals SHALL elevate non-trivial invariants to capability-spec SHALLs". Walk every invariant the new tests enforce. Apply the three-part gate (non-obvious / survives reimplementation / protects real failure mode). Expected outcome: **zero elevations** — every load-bearing behavior is already SHALL'd in `button-system` (see design Decision 4). Record the non-elevation list with one-line rationale per item (e.g. "`type` default is `'button'` — derivable from the JSX destructure; not elevated"). If a SHALL in `button-system` reads ambiguous against production (e.g. a `buttonClasses` argument-list divergence), record as a spec-vs-code divergence finding here and defer as a sibling one-line spec amendment (per `test-pure-libs` §7.5 precedent — do NOT bundle the spec edit into this change).

  ✅ **Zero elevations.** Non-elevation list with rationale:
  - **Loading-state contract** (`isLoading` → `disabled` + `aria-busy="true"` + `.btn-spinner` + `.sr-only`-wrapped children) — already SHALL'd in `button-system` Requirement "Loading state disables the button and announces busy status". Not elevated.
  - **Toggle-state contract** (`aria-pressed` emitted iff `pressed` defined; explicit `'true'`/`'false'`) — already SHALL'd in `button-system` Requirement "Toggle state is orthogonal to variant and uses aria-pressed". Not elevated.
  - **Six-variant set** (`primary | secondary | ghost | danger | on-dark | link`) — already SHALL'd in `button-system`. Not elevated.
  - **Shared `buttonClasses` composer + `btn-sm` size token** — already SHALL'd in `button-system`. Not elevated.
  - **LinkButton-no-loading** — already SHALL'd in `button-system` ("`<LinkButton>` does NOT support a loading state in this change"). Not elevated.
  - **Icon-only-button accessible name via forwarded `aria-label`** — already SHALL'd in `button-system`. Not elevated.
  - **`type` default = `'button'`** — derivable from the JSX destructure (`type = 'button'`). Implementation-only convenience to prevent the HTML default `'submit'` from surprising consumers; not a spec contract. Not elevated.
  - **`forwardRef` resolves to rendered DOM element** — derivable from the type signature (`forwardRef<HTMLButtonElement, …>`). Not a spec SHALL. Not elevated.
  - **Arbitrary HTML attribute passthrough** (`data-*`, `name`/`value`, `target`/`rel`, `onClick`) — derivable from `{...rest}` spread. Not a spec SHALL. Not elevated.
  - **`<Button>` renders a `<button>`; `<LinkButton>` renders an `<a>`** — derivable from component name + return shape. Not a spec SHALL. Not elevated.

  **Spec-vs-code divergence check:** re-grepped `button-system` SHALLs against `Button.tsx` + `LinkButton.tsx` at HEAD. No divergence (the `buttonClasses` argument-list issue `test-pure-libs` found applies to `buttonClasses.ts` and is unchanged by this work).

## 8. Final verification

- [x] 8.1 `npm test` — every new test passes; total test count grows by the §2 + §3 cases (~40+ tests); no regressions in pre-existing tests. ✅ `10 test files passed, 145 tests passed`. Pre-change baseline was ~82 tests; +63 net (36 Button + 27 LinkButton). Zero regressions.
- [x] 8.2 `npm test -- --coverage` confirms:
  - `app/ui/components/button/Button.tsx`: ≥ 90% lines / ≥ 90% statements / ≥ 90% functions. Record actual branches %.
  - `app/ui/components/button/LinkButton.tsx`: ≥ 90% lines / ≥ 90% statements / ≥ 90% functions. Record actual branches %.
  - `app/ui/components/button/types.ts` absent from the report (excluded per §4.2).
  - `app/ui/components/button/index.ts` absent from the report (excluded per §4.2).
  - Per-file thresholds defined in §4.3 + §4.4 pass; suite exits zero.

  ✅ Measured from `coverage/coverage-summary.json`:
  - `Button.tsx`: 100% lines (3/3), 100% statements (3/3), 100% functions (1/1), **100% branches (9/9)**.
  - `LinkButton.tsx`: 100% lines (3/3), 100% statements (3/3), 100% functions (1/1), **100% branches (2/2)**.
  - `types.ts` / `index.ts` / `test-helpers.ts`: absent from report (excluded).
  - Per-file thresholds pass; suite exits zero.

- [x] 8.3 Override active — verify by manually editing `Button.tsx` to inject a high-complexity function (e.g. paste a 20-branch switch), running `npm run lint`, observing the `sonarjs/cognitive-complexity` ERROR (not warning), then reverting the test edit. Document the proof in this task's note.

  ✅ Appended a 16-branch nested `if` chain to `Button.tsx`. `npx eslint app/ui/components/button/Button.tsx` reported: `error Refactor this function to reduce its Cognitive Complexity from 136 to the 15 allowed  sonarjs/cognitive-complexity`. Severity = `error` (not `warning`), confirming the per-file promotion. Reverted via `cp /tmp/Button.tsx.bak`.

- [x] 8.4 `openspec validate test-button-system` — passes (strict mode if available). ✅ `Change 'test-button-system' is valid`.

## 9. Pre-merge

- [x] 9.1 `npm run lint`: **0 errors**. Document any pre-existing warnings (carry-over from `test-pure-libs` §9.1 — the foundation's "warn globally" `sonarjs/cognitive-complexity` policy plus the `tasks` rule's literal "zero warnings" wording is a governance reconciliation question for the parent `test-coverage` change to settle, not blocking this sub-proposal). ✅ `0 errors, 11 warnings`. All 11 warnings pre-existing (sonarjs/cognitive-complexity on `useItemForm.ts`, `ChooseItemsForm.tsx`, `ListDetails.tsx`, `items.ts`, `lists.ts`, `FormField.tsx`, `seed-dev-users.ts`, `Avatar.tsx` no-img, plus an unused-var carried from `test-pure-libs` §9.1). None introduced by this change.
- [x] 9.2 `npx tsc --noEmit` — exits 0. ✅ Clean.
- [x] 9.3 `npm run build` — completes successfully. ✅ Clean.
- [x] 9.4 `npm test` — all tests pass, zero failures. ✅ `10 test files passed, 145 tests passed`.
