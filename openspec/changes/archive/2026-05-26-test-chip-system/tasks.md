## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach` (added in `test-button-system` §7.3 finding 4). Sanity check, not new work.
- [x] 1.2 Verify the jsdom project (`*.test.tsx`) resolves `@/` and the `react()` plugin is active by re-running an existing `*.test.tsx` (e.g. `app/ui/components/button/__tests__/Button.test.tsx`). The two-project split (jsdom for `.tsx`, node for `.ts`) is the foundation pattern; chip tests use both — `Chip.test.tsx` under jsdom, `chipClasses.test.ts` under node.
- [x] 1.3 Spec re-grep: confirm the `chip-system` SHALLs the tests will lock against (DOM-shape, `chipClasses` composition, `aria-label` derivation, `type="button"` + `stopPropagation`, `disabled` passthrough) match the production code at HEAD. If any spec wording diverges from production, surface as an audit finding in §7.5 and decide disposition.

## 2. Write `app/ui/components/chip/__tests__/Chip.test.tsx` (universal COVERAGE_FLOOR)

### 2A. DomShape — `chip-system` SHALL: non-interactive wrapper + interactive remove-button child

- [x] 2.1 `Default_RenderedOuterIsSpanWithChipClass` — render `<Chip onRemove={() => {}}>Foo</Chip>`; assert the rendered subtree's outermost element is a `<span>` with class `chip` (assert via `container.firstChild` tag + `toHaveClass('chip')`).
- [x] 2.2 `Default_RemoveChildIsButtonWithChipRemoveClass` — render same; assert `screen.getByRole('button')` is a `<button>` with class `chip-remove`.
- [x] 2.3 `Default_NoOtherInteractiveElementInSubtree` — render same; assert exactly one element with role `button` exists (`screen.getAllByRole('button').length === 1`) AND `screen.queryByRole('link')` is null.
- [x] 2.4 `Default_RemoveButtonTypeIsButton` — render same; assert `screen.getByRole('button')` has `toHaveAttribute('type', 'button')` (NOT the HTML default `'submit'`).

### 2B. ClassNamePassthrough — `chip-system` SHALL: chipClasses({ extra: className })

- [x] 2.5 `ClassNameProvided_AppearsAsExtraOnWrapper` — render `<Chip className="custom-token" onRemove={() => {}}>Foo</Chip>`; assert the outer `<span>` has `toHaveClass('chip', 'custom-token')`.
- [x] 2.6 `ClassNameMultiToken_AllTokensPresent` — `className="a b c"` → `toHaveClass('chip', 'a', 'b', 'c')`.
- [x] 2.7 `ClassNameOmitted_OnlyChipClass` — render `<Chip onRemove={() => {}}>Foo</Chip>`; assert outer span `toHaveClass('chip')` AND `className === 'chip'` (no trailing space, no `undefined` token).

### 2C. AriaLabelDerivation — `chip-system` SHALL: three discrete derivation paths

- [x] 2.8 `RemoveLabelOmittedChildrenString_AriaLabelIsRemovePlusChildren` — render `<Chip onRemove={() => {}}>Tag A</Chip>`; assert `screen.getByRole('button')` has `toHaveAttribute('aria-label', 'Remove Tag A')`.
- [x] 2.9 `RemoveLabelOmittedChildrenElement_AriaLabelIsRemove` — render `<Chip onRemove={() => {}}><span>Tag A</span></Chip>`; assert `screen.getByRole('button')` has `toHaveAttribute('aria-label', 'Remove')` (fallback; element children NOT stringified into the label).
- [x] 2.10 `RemoveLabelProvidedChildrenString_AriaLabelIsRemoveLabel` — render `<Chip onRemove={() => {}} removeLabel="Clear filter">Tag A</Chip>`; assert `aria-label === 'Clear filter'` (override beats the string-children default).
- [x] 2.11 `RemoveLabelProvidedChildrenElement_AriaLabelIsRemoveLabel` — render `<Chip onRemove={() => {}} removeLabel="Clear"><span>X</span></Chip>`; assert `aria-label === 'Clear'` (override beats the element-children fallback too).

### 2D. OnRemoveCallbackContract — invoked-once + stopPropagation

- [x] 2.12 `XClicked_OnRemoveInvokedOnce` — render `<Chip onRemove={spy}>Foo</Chip>`; `userEvent.click(screen.getByRole('button'))`; assert `spy.toHaveBeenCalledTimes(1)`.
- [x] 2.13 `XClicked_DoesNotBubbleToParentClickHandler` — render `<div onClick={parentSpy}><Chip onRemove={removeSpy}>Foo</Chip></div>` (no `<form>`); `userEvent.click(screen.getByRole('button'))`; assert `removeSpy.toHaveBeenCalledTimes(1)` AND `parentSpy.toHaveBeenCalledTimes(0)`. Locks the `e.stopPropagation()` contract per design Decision 4.
- [x] 2.14 `XClickedInsideForm_DoesNotSubmitForm` — render `<form onSubmit={(e) => { e.preventDefault(); submitSpy(); }}><Chip onRemove={removeSpy}>Foo</Chip></form>`; `userEvent.click(screen.getByRole('button'))`; assert `removeSpy.toHaveBeenCalledTimes(1)` AND `submitSpy.toHaveBeenCalledTimes(0)`. Locks the `type="button"` contract.

### 2E. DisabledPassthrough — `chip-system` SHALL: native HTML disabled

- [x] 2.15 `DisabledTrue_RenderedButtonDisabled` — render `<Chip disabled onRemove={spy}>Foo</Chip>`; assert `screen.getByRole('button')` `toBeDisabled()`.
- [x] 2.16 `DisabledTrueXClicked_OnRemoveNotInvoked` — render same; `userEvent.click(screen.getByRole('button'))`; assert `spy.toHaveBeenCalledTimes(0)`. HTML's native click-suppression on disabled buttons (the chip does NOT need its own guard).
- [x] 2.17 `DisabledTrue_AriaLabelUnchanged` — render `<Chip disabled onRemove={() => {}}>Tag A</Chip>`; assert `aria-label === 'Remove Tag A'` (the disabled state does not alter the derivation).
- [x] 2.18 `DisabledFalse_RenderedButtonNotDisabled` — render `<Chip disabled={false} onRemove={spy}>Foo</Chip>`; assert `screen.getByRole('button')` `not.toBeDisabled()` AND `userEvent.click(button)` → `spy.toHaveBeenCalledTimes(1)`.
- [x] 2.19 `DisabledOmitted_RenderedButtonNotDisabled` — render `<Chip onRemove={spy}>Foo</Chip>` (no `disabled` prop); assert `not.toBeDisabled()` AND click invokes `spy` once.

### 2F. ChildrenRender — content positioning

- [x] 2.20 `ChildrenString_RenderedAsWrapperLeadingContent` — render `<Chip onRemove={() => {}}>Foo</Chip>`; assert the wrapper `<span>` has `toHaveTextContent(/Foo/)` AND the `Foo` text node precedes the remove `<button>` in the wrapper's child order (`container.querySelector('.chip').firstChild` text starts with `Foo`).
- [x] 2.21 `ChildrenElement_RenderedAsWrapperLeadingContent` — render `<Chip onRemove={() => {}}><span data-testid="inner">Tag A</span></Chip>`; assert `screen.getByTestId('inner')` is non-null AND is a descendant of the chip wrapper but NOT inside `.chip-remove`.

### 2G. IndependentInstances — sanity (multiple chips don't share state)

- [x] 2.22 `TwoChipsRendered_EachOnRemoveFiresIndependently` — render `<><Chip onRemove={spyA}>A</Chip><Chip onRemove={spyB}>B</Chip></>`; locate the two remove buttons via `screen.getAllByRole('button')` + their parents' text; click the first, assert `spyA.toHaveBeenCalledTimes(1)` AND `spyB.toHaveBeenCalledTimes(0)`; click the second, assert `spyA.toHaveBeenCalledTimes(1)` AND `spyB.toHaveBeenCalledTimes(1)`. Guards against shared-closure regressions.

## 3. Write `app/ui/components/chip/__tests__/chipClasses.test.ts` (universal COVERAGE_FLOOR)

### 3A. ClassComposition — exact string output per input shape

- [x] 3.1 `NoArgs_ReturnsChip` — assert `chipClasses() === 'chip'`.
- [x] 3.2 `EmptyObject_ReturnsChip` — assert `chipClasses({}) === 'chip'`.
- [x] 3.3 `ExtraTruthySingleToken_ReturnsChipSpaceExtra` — assert `chipClasses({ extra: 'foo' }) === 'chip foo'` (exact string, single space).
- [x] 3.4 `ExtraTruthyMultiToken_PreservedVerbatim` — assert `chipClasses({ extra: 'a b c' }) === 'chip a b c'` (multi-token extra preserved with its internal whitespace).
- [x] 3.5 `ExtraEmptyString_ReturnsChipOnly` — assert `chipClasses({ extra: '' }) === 'chip'` (empty-string filtered by `.filter(Boolean)`; no trailing space).
- [x] 3.6 `ExtraUndefined_ReturnsChipOnly` — assert `chipClasses({ extra: undefined }) === 'chip'` (explicit undefined filtered; no `undefined` token in output).

## 4. Config changes

- [x] 4.1 Add `app/ui/components/chip/Chip.tsx` and `app/ui/components/chip/chipClasses.ts` to the existing per-file `sonarjs/cognitive-complexity = error` override block in `eslint.config.mjs`. Verify the existing block (lines ~31-45) is the right insertion point.
- [x] 4.2 Add two entries to `vitest.config.ts`'s `thresholds` map, each referencing the existing `COVERAGE_FLOOR` constant (NO per-file numeric variation per `test-housekeeping`'s single-constant rule):
  - `'app/ui/components/chip/Chip.tsx': COVERAGE_FLOOR`
  - `'app/ui/components/chip/chipClasses.ts': COVERAGE_FLOOR`
- [x] 4.3 Confirm `index.ts` exclusion is already covered by the existing `app/ui/components/*/index.ts` glob in `coverage.exclude` (no new per-file exclude entry needed).
- [x] 4.4 Run `npm test -- --coverage`. For every uncovered branch the v8 report flags on either file, dispose of it in the preference order from design Decision 6:
  - **(a)** Write a test that covers it. Default disposition.
  - **(b)** Refactor the source (within carve-out) to remove the awkward branch.
  - **(c)** Add a `/* v8 ignore next */` annotation in the source with a one-line rationale comment naming the specific uncoverable region. Lowering the per-file floor (option (d) from the old policy) is NO LONGER acceptable per `test-housekeeping`'s no-backdoor rule.
  Each disposition (and which option was chosen) SHALL be recorded in this task's checked-off note. Do NOT silently relax the floor.

## 5. Reserved (no source refactors expected — see §7)

## 6. Reserved (covered by §4)

## 7. Four audits + invariant-elevation audit (per testing-foundation)

- [x] 7.1 **Duplication audit** — measured against the two carve-out source files AND across the two new test files. Expected finding: low. The chip carve-out has no variant/size matrix scaffold to share with the button carve-out (chip has neither axis), so no extraction across families is warranted. If a within-chip pattern repeats (e.g., a `renderChip(...)` helper appears 3+ times), disposition options: (a) accept as test-file-local (≤2 uses); (b) extract to `app/ui/components/chip/__tests__/test-helpers.ts` (≥3 uses; excluded from coverage via the existing `**/__tests__/**` glob in `coverage.exclude`). Record disposition.
- [x] 7.2 **Complexity audit** — measured against `sonarjs/cognitive-complexity`:
  - `Chip.tsx:Chip` — measured complexity expected ~2 (one nullish-coalesce on `removeLabel`, one `typeof` ternary). PASS.
  - `chipClasses.ts:chipClasses` — measured complexity expected ~1 (one `filter(Boolean)` + `.join`). PASS.
  - Record measured values; promote per §4.1; assert `npm run lint` against these files emits zero `sonarjs/cognitive-complexity` errors after promotion.
- [x] 7.3 **Testability audit** — identify any pattern that resisted testing. Anticipated findings:
  - `e.stopPropagation()` is invisible from chip's own DOM and required a parent-spy harness (per design Decision 4). Record as testing-pattern observation, NOT a source defect.
  - The fallback `'Remove'` label for non-string children may be flagged as a UX adequacy concern but is pre-existing behavior; the test SHALL lock the current contract. Any change to the fallback string belongs to a separate chip-UX change. Record as observation if relevant; out of scope for source change here.
  - If a foundation gap surfaces (missing matcher, RTL version issue, jsdom shim), follow the `test-button-system` precedent: fix in-place if one-line additive; defer as sibling sub-proposal if structural.
- [x] 7.4 **Assertion audit** — every `it(...)` in the two new test files SHALL name a specific class string, specific attribute value, specific accessible name, specific spy-call shape, or specific exact string. No lone `toBeDefined()`, `toBeTruthy()` on a self-constructed value, snapshot-only, or tautology. Specifically guard against:
  - `expect(button).toBeInTheDocument()` as the ONLY assertion (tautology — `screen.getByRole` already threw if it wasn't).
  - `expect(span.className).toContain('chip')` when the assertion should be `toHaveClass('chip', ...)` against the specific composed string.
  - Asserting that `aria-label` is "set" without asserting the specific value (the three-case derivation per `chip-system` SHALL is the contract).
  - For `chipClasses.test.ts`: every assertion is an exact string equality (`expect(chipClasses(...)).toBe('chip ...')`) — `.toContain('chip')` is insufficient because it doesn't catch trailing whitespace or `undefined` tokens.
- [x] 7.5 **Invariant-elevation audit** — per testing-foundation Requirement: "Sub-proposals SHALL elevate non-trivial invariants to capability-spec SHALLs". Walk every invariant the new tests enforce. Apply the three-part gate (non-obvious / survives reimplementation / protects real failure mode). Expected outcome: **multiple elevations** — this carve-out CREATES the `chip-system` spec. The elevated SHALLs in `specs/chip-system/spec.md` are:
  - DOM shape: non-interactive wrapper `<span>` + interactive remove `<button>` child (two interactive concerns, two elements). NEW elevation.
  - `chipClasses({ extra })` composition contract (exact string outputs). NEW elevation.
  - `aria-label` derivation rule (three discrete paths). NEW elevation.
  - `type="button"` + `e.stopPropagation()` click semantics. NEW elevation.
  - `disabled` native passthrough. NEW elevation.
  - Verbatim relocation: "Removable chips share the button focus/touch contract" (moved from `button-system`). NOT a new elevation; preserves existing SHALL ownership.
  Record any invariant the tests assert that did NOT make it into the spec, with one-line rationale (e.g. "remove button text content is `×` — implementation detail; not elevated"). If a spec/code divergence is found during the walk, record as a spec-vs-code finding and defer as a sibling one-line spec amendment (per `test-pure-libs` §7.5 precedent — do NOT bundle the spec edit into this change unless it's a typo).

## 8. Spec move + bookkeeping

- [x] 8.1 Confirm the `specs/button-system/spec.md` delta in this change is a clean REMOVAL of "Removable chips share the button focus/touch contract via `<Chip>` primitive" with its **Reason** and **Migration** sections. No partial deletes; no unrelated edits to other `button-system` requirements.
- [x] 8.2 Confirm the `specs/chip-system/spec.md` delta contains the verbatim relocated requirement (description + four scenarios from `button-system`) AS THE FIRST REQUIREMENT in the new spec — preserving content exactly so a future diff between archived `button-system` and active `chip-system` shows zero text drift on the relocated requirement.
- [x] 8.3 Confirm the `specs/testing-foundation/spec.md` delta adds the chip-system carve-out bookkeeping requirement parallel to the test-button-system precedent (universal `COVERAGE_FLOOR`, `sonarjs/cognitive-complexity` promotion, `__tests__/` colocation, no per-file exclude for `index.ts` — already covered by existing glob).

## 9. Final verification

- [x] 9.1 `npm test` — every new test passes; total test count grows by the §2 + §3 cases (~28 tests); no regressions in pre-existing tests.
- [x] 9.2 `npm test -- --coverage` confirms:
  - `app/ui/components/chip/Chip.tsx`: meets `COVERAGE_FLOOR` (`lines ≥ 98, statements ≥ 98, branches ≥ 95, functions = 100`). Record actual measured values.
  - `app/ui/components/chip/chipClasses.ts`: meets `COVERAGE_FLOOR`. Record actual measured values.
  - `app/ui/components/chip/index.ts` absent from the report (excluded via the existing `app/ui/components/*/index.ts` glob).
  - Per-file thresholds defined in §4.2 pass; suite exits zero.
- [x] 9.3 Override active — verify by manually editing `Chip.tsx` to inject a high-complexity function (e.g. paste a 20-branch switch), running `npm run lint`, observing the `sonarjs/cognitive-complexity` ERROR (not warning), then reverting the test edit. Document the proof.
- [x] 9.4 `openspec validate test-chip-system` — passes (strict mode if available).

## 10. Pre-merge

- [x] 10.1 `npm run lint`: **0 errors**. Document any pre-existing warnings (carry-over from prior sub-proposals — the foundation's "warn globally" `sonarjs/cognitive-complexity` policy plus the `tasks` rule's literal "zero warnings" wording is a governance reconciliation question for the parent `test-coverage` change to settle, not blocking this sub-proposal).
- [x] 10.2 `npx tsc --noEmit` — exits 0.
- [x] 10.3 `npm run build` — completes successfully.
- [x] 10.4 `npm test` — all tests pass, zero failures.
