## Context

Sub-proposal 4.16 of `test-coverage` adds unit coverage for `PriceFilterPopover.tsx` — the price-range filter popover in the items toolbar — and elevates its latent invariants to the existing `items-price-filter` capability spec. The carve-out was deferred here from `test-items-browser-chrome` §9.6, which module-mocked the popover so the chrome tests would not re-own its internals.

The foundation (1.1, 1.2), the housekeeping amendment (0.1), the pure-libs and primitive-family carve-outs (2.1, 3.1–3.8), and the items chrome carve-out (4.5) have all archived. The runner (vitest 4.x, jsdom/node two-project split), RTL, the `__tests__/` colocation convention, the universal `COVERAGE_FLOOR` constant, the four-audit obligation, the `<State>_<Behavior>` test-naming rule, and the `sonarjs` warn→error-per-carve-out policy are all in place and authoritative.

The `items-price-filter` spec is unusually complete: it already locks the trailing-edge 400ms debounce, the asymmetric inverted-pair error timing (appear only on debounce fire; clear live; re-break requires a fresh fire; error moves to the most-recently-edited input), the never-commit-invalid guarantee across every close path, the `key=${min}|${max}` remount-on-external-change reset, and the Clear/Done footer shape. So this carve-out is **coverage-first**: it drives the source through every one of those specced behaviors and adds only the handful of invariants the source enforces that the spec does not yet state.

The constraint that shapes the test design: **`PriceField` uses cents-as-integer math** (`form-field-system`). Its `onChange` strips non-digits, parses the remainder as integer cents, and emits `cents / 100`. So typing the characters `5000` into the Max input produces the value `50.00`, not `5000`. The spec scenarios describe *logical dollar values* (Min=`100`, Max=`50`); the tests must drive the inputs with the digit strings that the cents parser maps to those values, and assert on the `onApply` string arguments (`"100.00"`, `"50.00"`).

## Goals / Non-Goals

**Goals:**

- One colocated jsdom test file, `app/(main)/items/ui/components/__tests__/PriceFilterPopover.test.tsx`, meeting the universal `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) for `PriceFilterPopover.tsx`.
- Drive the source through every behavior the `items-price-filter` spec already states (debounce commit, inverted-pair error state machine, never-commit-invalid across all close paths, key-remount reset, Clear/Done footer).
- ADD the latent invariants that pass the three-part elevation test and no current requirement states (candidates: Min-input autofocus on open; `$0.00` coalesces to an absent bound).
- Lock `PriceFilterPopover.tsx`'s cognitive-complexity ceiling at `error`.

**Non-Goals:**

- Re-testing `PriceField` / `FieldError` internals (cents parsing, currency formatting, `aria-describedby` wiring) — owned by `form-field-system` (3.3); rendered for real here and asserted *through*.
- Re-testing `PopoverTrigger` (count badge, `active` token) or `usePopoverDismiss` (outside-mousedown / Escape) — owned by `popover-trigger-system` (3.5); rendered for real and asserted through.
- Testing the *application* of `price_min`/`price_max` to the items grid (the `displayPrice ∈ [min,max]` test, non-finite exclusion, URL writes, `page` reset) — owned by `items-browser-chrome` (4.5). This file's contract stops at the `onApply`/`onClear` callback boundary, which the tests spy on.
- Testing `StoreFilterPopover` — deferred sibling 4.17.

## Decisions

### Decision 1: One `.test.tsx` (jsdom) for the single source file; primitives render for real.

`PriceFilterPopover.tsx` is a client component, so its test is `.test.tsx` under `__tests__/` (→ jsdom project per the two-project split). The popover renders `PriceField`, `PopoverTrigger`, and the `Button` primitives, and consumes `usePopoverDismiss` — all owned and already covered by 3.3 / 3.5 / 3.1. Per the items-chrome Decision 2 precedent ("tested primitives render for real; only out-of-carve-out children are mocked"), **none of these are mocked**: rendering them for real exercises the real integration the popover depends on (a real `<FieldError>` in the DOM with real `aria-describedby`, a real `PopoverTrigger` count badge, a real outside-mousedown closing the panel). The only test doubles are the `onApply` / `onClear` props, which are `vi.fn()` spies — they are the seam the spec defines this component against.

**Alternative considered:** mocking `PriceField` to a bare `<input>` to sidestep the cents-math. Rejected — it would stop the tests from verifying that the popover's `toNumber`/`toString` glue actually round-trips through the real primitive, which is the integration most likely to break.

### Decision 2: The 400ms debounce is tested with fake timers.

`PriceFilterPanel` commits via `setTimeout(…, DEBOUNCE_MS)` in a `useEffect` keyed on local state. Tests use `vi.useFakeTimers()`, type via `fireEvent.change`, advance `< 400ms` (assert no `onApply`), advance past 400ms (assert exactly one `onApply` with the expected string args), and verify a multi-keystroke burst within the window collapses to a single commit (the `clearTimeout` cleanup). Real timers are restored in `afterEach`. This mirrors the items-chrome Decision 5 search-debounce approach and the debounce-test approach the `items-price-filter` spec itself references.

### Decision 3: Inputs are driven with cents-digit strings; assertions read the `onApply` string args.

A small in-file helper (`typePrice(input, digits)`) fires `change` with a digit string; the cents parser maps `"10000"` → `100.00`, `"5000"` → `50.00`, `"5"` → `0.05`. Tests assert on the resulting `onApply(min, max)` arguments (`"100.00"`, `"50.00"`) and on the rendered input `value` (the formatted display). This makes the spec's logical scenarios (Min=`100`, Max=`50`) executable without coupling to the primitive's keystroke handling. Because three or more `it()`s reuse this helper within the one file, it is a same-file local helper (no cross-file extraction needed — the duplication audit's 3-file threshold is per the foundation rule, and this is one file).

### Decision 4: The inverted-pair error state machine is asserted through the real `<FieldError>`, by DOM and by which input owns it.

The spec's hardest requirement is the asymmetric error timing. Tests assert the **observable** facts, never the internal `errorShown`/`lastEdited` state:

- **Appears only on debounce fire:** type into an inverting input, advance `< 400ms` → assert no `.field_error` in the DOM; advance past 400ms → assert exactly one `.field_error`, associated to the correct input via `aria-describedby`, with copy naming the offending field ("Min must be at most Max" / "Max must be at least Min").
- **Lives-clears:** with the error shown, type to make the pair valid → assert the `.field_error` is gone on that keystroke (no timer advance), and a subsequent debounce fire commits.
- **Re-break requires a fresh fire:** after a live-clear, re-invert → assert no error on the breaking keystroke; only after a fresh 400ms fire does it reappear.
- **Error moves to the other input:** error under Max, then edit Min keeping the pair inverted → assert the error is now under Min and absent under Max.
- **Equal bounds are valid; either-empty hides the error** → assert commit / no error respectively.

This covers the `showError && lastEdited === 'min'|'max'` branches and the render-phase `if (!inverted && errorShown) setErrorShown(false)` live-clear path. The assertion that the error uses `<FieldError>` (not a tooltip / `role="alert"` / banner) composes the `form-field-system` contract — asserted by the presence of `p.field_error` + `aria-describedby` and the absence of `role="alert"`.

### Decision 5: Every close path is exercised through the real dismiss surfaces.

The never-commit-invalid guarantee holds across Done click, outside `mousedown`, and Escape. Tests trigger each via the real surfaces — `fireEvent.click` on Done, `fireEvent.mouseDown(document.body)` (outside the `rootRef`) for outside-dismiss, `fireEvent.keyDown(document, { key: 'Escape' })` for Escape — and assert:

- **Valid divergent local state flushes once** on close (`onApply` called with the pending values).
- **Invalid local state is discarded silently** (`onApply` not called; if a valid filter pre-existed, the trigger still shows it).
- **No divergence → no flush** (Done with local === props calls neither `onApply` nor `onClear`).

This drives `handleClose`'s `diverged && !isInvertedPair(...)` branch matrix and the `valuesRef` plumbing, using the real `usePopoverDismiss` rather than mocking it.

### Decision 6: The `key=${min}|${max}` remount-reset is tested by re-rendering with new props while open.

Open the popover, edit local state (and optionally surface an error), then `rerender` the parent with new `min`/`max` props (simulating an external clear-all). Assert the inner panel remounted: the inputs now read the new props and any in-progress error is gone. This verifies the spec's "external URL change does not stomp in-progress edits" requirement and covers the `PriceFilterPanel` mount-time `useState(initialMin/Max)` initialization and the debounce effect's skip-on-unchanged early return.

### Decision 7: Footer + trigger coverage.

Assert the footer renders exactly a ghost Clear (left) and a primary Done (right) — no Apply. Assert Clear empties local state and calls `onClear`; assert Clear is disabled when both props and local state are empty and enabled otherwise (covering `disabled={activeCount === 0 && !localMin && !localMax}`). Assert the `PopoverTrigger` reflects the active-bound count (0 → no badge, 1 → badge "1", 2 → badge "2") through the real primitive, and that the panel mounts only when open (`aria-expanded` toggles).

### Decision 8: Invariant-elevation audit — expect a small ADD set; MODIFY none.

The spec is comprehensive, so the §9.5 audit's job is mostly to confirm coverage and prune. Candidates that pass the three-part test (non-obvious from name/signature/type · survives a reasonable reimplementation · protects a real failure mode) and are stated by no current requirement:

- **Min-input autofocus on open** — `autoFocus` is set on the Min `PriceField` only. Non-obvious (a reimplementation could omit it or focus Max), real failure mode (keyboard users must tab into the panel). **Elevate** (assert `document.activeElement` is the Min input on open).
- **A `$0.00` bound coalesces to an absent bound** — `toString(n) => n === 0 ? '' : n.toFixed(2)`, so a value resolving to zero clears that bound rather than filtering at `$0`. Non-obvious, real failure mode (a `$0` minimum would be meaningless / filter nothing-or-everything depending on the consumer). **Elevate** (type a zero value → assert the bound is emptied and `onApply` omits it).

Non-elevation candidates recorded with rationale: the trigger's active-bound *count derivation* (`(min?1:0)+(max?1:0)`) is borderline-obvious and the trigger surface is owned by `popover-trigger-system`; the precise `DEBOUNCE_MS = 400` value is an impl detail (the *behavior* is already specced); the `.store-filter-panel`/`.price-filter-panel` class strings are styling, not behavior. Final set fixed at apply.

### Decision 9: `testing-foundation` bookkeeping is Tier-2 (archive-only).

Per the parent's D13 two-tier rollup, this carve-out's `COVERAGE_FLOOR` / complexity-override entry and audit record are a Tier-2 delta — recorded in this change's delta dir only, NOT rolled into the parent `test-coverage` accumulator and NOT written to the active `testing-foundation` spec. Only the `items-price-filter` ADDs are Tier-1 capability content.

## Risks / Trade-offs

- **Cents-math input nuance** (typing `5000` ⇒ `$50.00`) → centralized `typePrice` digit-string helper (Decision 3); assertions read the formatted display and the `onApply` string args, not raw keystrokes.
- **Debounce flakiness under real timers** → fake timers + explicit advance, restored in `afterEach` (Decision 2).
- **The render-phase `setErrorShown(false)` live-clear (React 19 pattern)** could mask a stale-error bug → test the observable (error absent on the fixing keystroke), never the internal flag (Decision 4).
- **`autoFocus` under jsdom** → jsdom honors `autoFocus` into `document.activeElement`, so the autofocus invariant is directly assertable (Decision 8).
- **Branch coverage of the error/close matrix is wide** (`lastEdited` × `showError` × `diverged` × `isInvertedPair`) → enumerate the matrix explicitly; if a branch is genuinely unreachable, dispose via `/* v8 ignore */` + named reason, never by lowering the floor.
- **Complexity finding** — unlikely for a ~200-line two-component file, but if any function measures ≥15 it is fixed in-place by a single-file, behavior-preserved extraction (or a named per-line disable); the file is never skipped.

## Migration Plan

Additive: one new test file, two one-line config edits (`vitest.config.ts` threshold, `eslint.config.mjs` override), the ADDED `items-price-filter` requirement(s), and one archive-only `testing-foundation` Tier-2 record. No runtime source change expected. Rollback = revert the change; no production code path depends on it.

## Open Questions

- Whether the trigger active-bound count derivation is elevated or recorded as a non-elevation is finalized by the §9.5 audit at apply time (current lean: non-elevation — the trigger surface is owned by `popover-trigger-system`).
