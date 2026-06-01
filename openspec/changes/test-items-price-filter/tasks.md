## 1. Test authoring

- [x] 1.1 Create `app/(main)/items/ui/components/__tests__/PriceFilterPopover.test.tsx` (jsdom). Render the real `PriceFilterPopover` with `vi.fn()` spies for `onApply`/`onClear`; render `PriceField`, `PopoverTrigger`, `Button`, and `usePopoverDismiss` for real (no mocks) per design Decision 1. Add the `typePrice(input, digits)` cents-digit helper per Decision 3. Name every `it()` in `<State>_<Behavior>` form.
- [x] 1.2 **Debounce commit** (spec R1, design Decision 2): with fake timers — fast typing commits `onApply` exactly once ~400ms after the last keystroke; a pause > 400ms commits the intermediate value then the final value; advancing < 400ms commits nothing; a multi-keystroke burst collapses to one commit.
- [x] 1.3 **No Apply button / Done closes without its own commit** (spec R1): assert the footer has Clear + Done only (no "Apply"); Done with a valid pending edit flushes once; Done with an invalid pending edit discards silently.
- [x] 1.4 **Inverted-pair error state machine** (spec R2, design Decision 4): error appears only on debounce fire (not on the inverting keystroke); attaches to the most-recently-edited input with field-naming copy; clears live the moment the pair becomes valid or a field is emptied; re-breaking after a live-clear needs a fresh debounce fire; the error moves to the other input when that input is edited while still inverted; equal bounds are valid and commit. Assert through the real `<FieldError>` (`p.field_error` + `aria-describedby`, no `role="alert"`).
- [x] 1.5 **Never commit invalid across every close path** (spec R3, design Decision 5): closing while invalid via Done / outside `mousedown` / Escape leaves a pre-existing valid filter untouched and does not call `onApply` with the invalid pair; reopening after invalid-and-close re-sources inputs from props with no error.
- [x] 1.6 **External-change remount reset** (spec R4, design Decision 6): rerender the parent with new `min`/`max` props while open → inputs reflect the new props and any in-progress error clears (the `key=${min}|${max}` remount).
- [x] 1.7 **Footer + trigger** (spec R5, design Decision 7): Clear empties local state and calls `onClear`; Clear disabled iff props and local are both empty; the `PopoverTrigger` active-bound count badge reads 0→none / 1 / 2; the panel mounts only when open and `aria-expanded` toggles.
- [x] 1.8 **Elevated invariants** (specs delta, design Decision 8): opening the popover focuses the Min input (`document.activeElement`), not Max; a Min/Max value resolving to `$0.00` coalesces to an empty bound (input renders empty; `onApply` omits that bound; no inverted-pair error against zero).

## 2. Audits (performed and recorded BEFORE coverage validation)

- [x] 2.1 **Assertion-substance audit** — for each `it()`, record in one sentence the observable behavior asserted (the `onApply`/`onClear` spy argument, the rendered input `value`, the presence/owner of `.field_error`, `document.activeElement`, the trigger badge). Confirm no test asserts a self-constructed value, a tautology, or a smoke-execute. Fix any finding in-place (assertion audit is never deferred).

  **Findings (no defects; 0 fixes required):** every `it()` asserts an externally-observable fact. Debounce tests assert the exact `onApply` argument tuple and call count (`('', '199.99')`, `toHaveBeenCalledTimes(1)`). Error-state tests assert the rendered `.field_error` text, its `tagName === 'P'`/`field_error` class, the owning input's `aria-invalid`/`aria-describedby` linkage, and the absence of `role="alert"`. Close-path tests assert `onApply` was NOT called with an invalid pair and that the prior count badge survives. Footer tests assert the `ghost`/`primary` variant classes and the absence of any "Apply" button. Trigger tests assert the badge text and `active` class. Elevated tests assert `document.activeElement` and that a zero entry renders an empty input + omitted `onApply` bound. No assertion reads back a value the test constructed or a spy returned.

- [x] 2.2 **Duplication audit** — the only shared setup is the `typePrice` helper and the render/open boilerplate, all within this single file; the foundation's "extract at 3+ files" threshold does not trigger for one file. Confirm and record the disposition (keep in-file).

  **Findings / disposition (kept in-file):** `typePrice`, `renderPopover`, and the `trigger`/`minInput`/`maxInput`/`panel`/`fieldError`/`countBadge` query helpers are reused across the file's `it()`s but live in exactly one test file — below the cross-file extraction threshold. No `test/helpers/` extraction warranted.

- [x] 2.3 **Complexity audit** — measure `sonarjs/cognitive-complexity` for `PriceFilterPopover.tsx`. Record the value. If any function is ≥15, fix in-place via a single-file, behavior-preserved extraction (or a named per-line disable); never skip the file or lower the floor.

  **Measured (HEAD, via `eslint sonarjs/cognitive-complexity` at the `error`-level promotion):** `PriceFilterPopover.tsx` passes clean — **no function ≥15** (`ESLint: No issues found`). No refactor, no `eslint-disable`, floor untouched. The proposal's "complexity finding unlikely for a ~200-line two-component file" held.

- [x] 2.4 **Testability audit** — confirm the dispositions hold: cents-math driven via `typePrice` (Decision 3); the 400ms debounce via fake timers (Decision 2); outside-dismiss via `mouseDown(document.body)` and Escape via `keyDown(document)` against the real `usePopoverDismiss` (Decision 5); `autoFocus` assertable via `document.activeElement` under jsdom (Decision 8). Confirm none requires a cross-file refactor; if one does, defer per 2.5.

  **Findings (all dispositions held; no cross-file refactor):** cents-math driven with digit strings (`'5000'` ⇒ `50.00`), assertions read the formatted display + `onApply` strings. Fake timers (`vi.useFakeTimers`/`advanceTimersByTime`, restored in `afterEach`) drive the debounce. Outside-dismiss and Escape fire real DOM events against the unmocked `usePopoverDismiss`. `autoFocus` lands in `document.activeElement` under jsdom (`toHaveFocus()` passes). One apply-time adjustment, in-file only: three `querySelector` calls tripped `testing-library/no-node-access` (error) — replaced with `screen.queryByText`/`within(...).queryByText` and a `tagName`/`toHaveClass` check; no source change.

- [x] 2.5 **Invariant-elevation audit** — confirm the ADDED `items-price-filter` requirements (Min autofocus on open; `$0.00` coalesces to absent bound) pass the three-part test and are stated by no existing requirement; record non-elevations with rationale (trigger active-bound count derivation — owned by `popover-trigger-system`, borderline-obvious; exact `DEBOUNCE_MS=400` — impl detail, behavior already specced; panel class strings — styling). Add no new top-level sub-proposal checkboxes (no discovered carve-outs expected for a single fully-owned file).

  **Elevated (2 ADDED to `items-price-filter` spec):** (a) *Opening the popover moves keyboard focus into the Min input* — `autoFocus` on Min only; non-obvious, survives reimplementation, real failure mode (keyboard users). (b) *A `$0.00` bound is treated as absent, not a zero filter* — `toString(0) ⇒ ''`; non-obvious empty-vs-zero coalescing, real failure mode (a meaningless `$0` bound serialized to the URL). Both stated by no existing requirement. **Not elevated (rationale):** trigger active-bound count derivation `(min?1:0)+(max?1:0)` — the trigger surface is owned by `popover-trigger-system` and the derivation is borderline-obvious (tested, not elevated); exact `DEBOUNCE_MS=400` — impl detail, the debounce *behavior* is already specced in R1; `.store-filter-panel`/`.price-filter-panel` class strings — styling, not behavior. **No new sub-proposal checkboxes** — the single file is fully owned; no boundary deferrals discovered.

## 3. Config changes

- [x] 3.1 `vitest.config.ts` — add `'app/(main)/items/ui/components/PriceFilterPopover.tsx': COVERAGE_FLOOR` under a `// test-items-price-filter (sub-proposal 4.16) — locked at universal COVERAGE_FLOOR.` comment.
- [x] 3.2 `eslint.config.mjs` — add `'app/(main)/items/ui/components/PriceFilterPopover.tsx'` to the per-file `sonarjs/cognitive-complexity = error` override array under the matching comment.

## 4. Apply spec deltas

- [x] 4.1 Apply the ADDED requirement(s) from `specs/items-price-filter/spec.md` (as finalized by audit 2.5) to `openspec/specs/items-price-filter/spec.md`. Confirm no existing requirement is changed. **Done:** the two ADDED requirements (Min autofocus on open; `$0.00` coalesces to absent bound) appended to the active spec; no existing requirement MODIFIED or REMOVED.
- [x] 4.2 Confirm the `testing-foundation` carve-out bookkeeping (the `COVERAGE_FLOOR`/complexity entries and audit record) stays Tier-2 — in this change's delta/archive only, NOT rolled into the parent `test-coverage` accumulator and NOT written to the active `testing-foundation` spec. **Done:** no `testing-foundation` delta file was created; the bookkeeping lives only in this change's `vitest.config.ts`/`eslint.config.mjs` entries and this tasks record.

## 5. Coverage validation

- [x] 5.1 `npm run test:coverage` — confirm `PriceFilterPopover.tsx` meets `lines ≥ 98 / statements ≥ 98 / branches ≥ 95 / functions = 100`. Close any gap via a test OR `/* v8 ignore */` with a named reason — never by lowering the floor. **Done:** the per-file `thresholds` gate enforces the floor and the run passes with no "does not meet threshold" error for `PriceFilterPopover.tsx`; no `/* v8 ignore */` needed.

## 6. Pre-merge (five-gate, author-run locally)

- [x] 6.1 `npm run lint` passes with zero errors (the `sonarjs/cognitive-complexity = error` promotion in effect for `PriceFilterPopover.tsx`). **0 errors.** The 8 remaining warnings are pre-existing `sonarjs/cognitive-complexity`/`@next/next/no-img-element` on files this change does not touch (Item.tsx, useItemForm.ts, ChooseItemsForm.tsx, ListDetails.tsx, Avatar.tsx, items.ts, lists.ts, seed-dev-users.ts) — no new warning introduced by this change, per the §7.4 warn-globally reconciliation.
- [x] 6.2 `npx tsc --noEmit` passes with zero errors. **No errors found.**
- [x] 6.3 `npm run build` completes successfully. **Completes** with a connection string present; the change adds no production code (test + config + spec only), so the bundle is unaffected.
- [x] 6.4 `npm run test:coverage` passes (the new file green; floors met). **1087 tests pass** (the new file's 33 included); one unrelated test (`app/actions/__tests__/follows.test.ts`, sub-proposal 4.2) hit a 10s hook timeout under parallel load and passes on isolated re-run (33/33) — a pre-existing flake, not this change.
- [ ] 6.5 `npm run test:e2e` passes (no regression; this carve-out adds no E2E). **Not runnable in this worktree** — `.env.local` here has no `DATABASE_URL`, which the Playwright suite requires (dev server + seeded DB + `AUTH_BYPASS`). This change adds no E2E and no production code an existing E2E would exercise; the author must run `npm run test:e2e` against their full local env before merge.

## 7. Audit disposition record

- [x] 7.1 Record the final disposition of every audit finding (2.1–2.5) in this file: each fixed-in-place (with reference) or recorded as a deliberate exception (with rationale). Confirm zero findings remain as TODO comments or unaddressed notes.

  **Final disposition of every audit finding:**
  - **2.1 (assertion substance):** no findings — every assertion is observable-behavior; 0 fixes.
  - **2.2 (duplication):** kept in-file — helpers reused within one file, below the cross-file threshold; no extraction.
  - **2.3 (complexity):** `PriceFilterPopover.tsx` measured <15 on every function (`eslint` clean at `error`); no refactor, no disable, floor untouched.
  - **2.4 (testability):** all dispositions held; the only apply-time change was an in-file swap of three `querySelector` calls for Testing Library queries to satisfy `testing-library/no-node-access` — no source change.
  - **2.5 (invariant elevation):** 2 ADDED requirements to [items-price-filter/spec.md](openspec/specs/items-price-filter/spec.md) (Min autofocus on open; `$0.00` coalesces to absent bound); non-elevations (trigger count derivation, exact debounce ms, panel class strings) recorded with rationale; no new sub-proposal checkboxes.

  Zero findings remain as TODO comments or unaddressed notes.
