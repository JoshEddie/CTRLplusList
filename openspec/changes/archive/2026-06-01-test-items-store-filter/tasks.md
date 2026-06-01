## 1. Confirm foundation surfaces are usable

- [x] 1.1 Confirm the carve-out boundary against the live tree: this carve-out owns **only** `app/(main)/items/ui/components/StoreFilterPopover.tsx`. The composed primitives (`PopoverTrigger` §3.5, `SearchField`/`CheckboxField` §3.3, `Button` §3.1) and `usePopoverDismiss` (§3.5) are NOT in this carve-out and SHALL NOT be re-tested — they render live and inherit their own specs.
- [x] 1.2 Confirm `StoreFilterPopover` is still module-mocked by the upstream `items-browser-chrome` suites — present in `itemsToolbar/__tests__/FiltersSheet.test.tsx:27` and `__tests__/ItemsBrowser.test.tsx:29`; `ItemsToolbar.test.tsx` no longer renders it directly post-decomposition (it lives under `FiltersSheet`). This carve-out does NOT alter those mocks; it adds direct coverage the mocks deferred.
- [x] 1.3 Read `usePopoverDismiss` — it listens on `document` for `mousedown` (outside-click via `!ref.current.contains(target)`) and `keydown` (Escape), with listeners attached only while `open`. Dismiss tests dispatch `mouseDown` on `document.body` and `keyDown` Escape on `document`.

## 2. Write `app/(main)/items/ui/components/__tests__/StoreFilterPopover.test.tsx` (jsdom + RTL)

- [x] 2.1 `Trigger` — `NoStores_NoBadgeNotActive` (empty `selectedStores` → no count badge, trigger not `active`); `SelectedStores_CountBadgeAndActive` (`selectedStores` length N → badge `N`, trigger `active`); `Click_TogglesPanelAndAriaExpanded` (click opens `role="dialog"` labeled "Filter by store", `aria-expanded` true; click again closes, `aria-expanded` false). Covers spec R "trigger reflects count and toggles panel". (`StoreFilterPopover.test.tsx` describe `Trigger`.)
- [x] 2.2 `Search` — `EmptyQuery_RendersAllOptions`; `Query_NarrowsCaseInsensitiveSubstring` (`["Amazon","Target","Etsy"]` + `"a"` → Amazon, Target only); `WhitespaceQuery_TreatedAsEmpty` (spaces → all options). Asserts narrowing does not call `onToggle`/`onClear`. Covers spec R "search narrows case-insensitively".
- [x] 2.3 `EmptyState` — `NoMatches_ShowsNoMatchingStores` (query with zero matches → "No matching stores", no checkboxes); `HasMatch_SuppressesEmptyState`. Covers spec R "empty filtered result shows empty state".
- [x] 2.4 `Options` — `CheckedState_MirrorsSelectedStores` (boxes in `selectedStores` render checked, others unchecked); `Toggle_CallsOnToggleWithName-NoSelfMutation` (toggling calls `onToggle(name)` once; component does not mutate `selectedStores` itself — verified by controlled re-render with updated prop per design D3). Covers spec R "option checkbox reflects and toggles selection".
- [x] 2.5 `Footer` — `ClearDisabled_WhenNoSelection`; `Clear_CallsOnClearAndKeepsPanelOpen` (non-empty selection → click Clear calls `onClear` once, panel stays open); `Done_ClosesWithoutMutatingSelection` (click Done closes panel, neither `onClear` nor `onToggle` called). Covers spec R "footer Clear gated, Done only closes".
- [x] 2.6 `Dismiss` — `OutsideClick_ClosesOpenPanel` (`fireEvent.mouseDown(document.body)`); `Escape_ClosesOpenPanel` (`fireEvent.keyDown(document, {key:'Escape'})`) — the events `usePopoverDismiss` actually listens for (§1.3); assert at the observable level (panel no longer in the document). Covers spec R "panel dismisses on outside click and Escape".

## 3. Audits (performed and recorded BEFORE coverage validation)

### 3.1 Assertion-substance audit (always fixed-in-place, never deferred)

- [x] 3.1 Every `it()` asserts an externally-observable fact, not a self-constructed value: `Trigger` asserts the rendered button's `active` class, `aria-expanded` attribute, and the badge text / dialog presence; `Search`/`EmptyState` assert which `role="checkbox"` options (by accessible name) and the "No matching stores" text are rendered after typing into the live searchbox; `Options` asserts `toBeChecked()` state and the `onToggle('Target')` spy argument (and the absence of self-mutation via a controlled re-render); `Footer` asserts `toBeDisabled()`, the `onClear` spy, and dialog presence; `Dismiss` asserts the dialog is gone after the real `mousedown`/`Escape` events. No tautologies, no execute-for-coverage, no assertions on mock return values. 0 fixes required.

### 3.2 Duplication audit

- [x] 3.2 **Kept inline.** The only repeated setup is the `renderPopover` props-builder, the `trigger`/`panel`/`openPanel` query helpers, and the `['Amazon','Target','Etsy']` option list — all confined to this single test file (below the 3-file extraction threshold). No existing `test/fixtures`/`test/helpers` entry covers a store-filter render harness. No extraction.

### 3.3 Complexity audit (on the carve-out source)

- [x] 3.3 `sonarjs/cognitive-complexity` for `StoreFilterPopover.tsx` is well under 15 (one `useMemo` filter, one `.map`, three trivial handlers) — `npm run lint` passes at the promoted `error` level (§7.1) with no flag. No fix, no per-line disable, floor not lowered.

### 3.4 Testability audit (on the carve-out source)

- [x] 3.4 No source change required. `StoreFilterPopover` is a pure prop-driven client component — no `next/navigation`, no DAL, no timers (search is synchronous via `useMemo`); `usePopoverDismiss` attaches real `document` listeners that fire under jsdom. The full surface is reachable by rendering the real component and driving it through the DOM. No cross-file refactor.

### 3.5 Invariant-elevation audit

- [x] 3.5 The six `store-filter` requirements (§4.1) each pass the three-part test (true invariant / not impl detail / not owned elsewhere): trigger count/active mapping + toggle, case-insensitive trimmed search narrowing, empty state, checkbox reflect/`onToggle`, Clear-gating + Done-only-closes, outside-click/Escape dismiss. **Tested-but-NOT-elevated** (with rationale): the `MdFilterList` icon and the `.store-filter-*` / `.popover-trigger-*` class strings (presentational — owned by the primitives/CSS, not normative store-filter behavior); the exact accessible-name spacing of the trigger (a primitive-rendering detail).

### 3.6 Deferred-findings record (discovered sub-proposals)

- [x] 3.6 None. No audit surfaced a cross-file refactor or a genuinely-ungoverned sibling — the carve-out is self-contained. No finding is left as a TODO/issue-only note; nothing appended to `test-coverage/tasks.md` §4.

## 4. Apply spec deltas

- [x] 4.1 `specs/store-filter/spec.md` carries the six ADDED requirements (trigger count/toggle; search narrowing; empty state; checkbox reflect/toggle; footer Clear/Done; dismiss), each scoped to defer toolbar layout, the `store` URL-param algebra (owned by `items-browser-chrome`), and primitive chrome. `openspec validate test-items-store-filter --strict` passes.
- [x] 4.2 `testing-foundation` delta tier = **Tier 2 / archive-only** — this carve-out adds no new foundation rule, only inherits existing ones. The classification stays in this change's `proposal.md`/`tasks.md`; it is NOT rolled into the parent `test-coverage` accumulator and NOT written to the active `openspec/specs/testing-foundation/spec.md`.

## 5. Config changes

- [x] 5.1 `vitest.config.ts` — added the per-file `thresholds` entry for `StoreFilterPopover.tsx` (`= COVERAGE_FLOOR`) under the `// test-items-store-filter (sub-proposal 4.17) — locked at universal COVERAGE_FLOOR.` comment.
- [x] 5.2 `eslint.config.mjs` — added `app/(main)/items/ui/components/StoreFilterPopover.tsx` to the per-file `sonarjs/cognitive-complexity = error` override array under the matching comment.

## 6. Coverage validation

- [x] 6.1 `StoreFilterPopover.tsx` meets the floor (`lines ≥ 98 / statements ≥ 98 / branches 100 / functions = 100`) — the per-file `vitest.config.ts` threshold passes with no ERROR. The two easily-missed branches (empty-state `filtered.length === 0`, Clear `disabled={count === 0}`) are covered. One gap surfaced during validation — the `SearchField` `onClear={() => setQuery('')}` arrow (line 62) was uncovered (functions 90.9%); closed in-place by adding `SearchClearButton_ResetsQueryAndRestoresOptions` (types a query, clicks the field's "Clear search" button, asserts the query resets and all options return) — NOT by lowering the floor. 16 tests total.

## 7. Pre-merge (five-gate — run locally before requesting review)

- [x] 7.1 `npm run lint` exits 0 — zero errors. The `sonarjs/cognitive-complexity = error` promotion is in effect for `StoreFilterPopover.tsx` and it passes. No NEW warnings introduced by this change (the touched files — `StoreFilterPopover.{tsx,test.tsx}`, `vitest.config.ts`, `eslint.config.mjs` — lint clean at exit 0); pre-existing global `warn`-level complexity in non-carved-out files (e.g. `Item.tsx`, `useItemForm.ts`) is the known `test-coverage` §7.4 conflict (warning-zero scoped to "no new warnings" until §7.2 universalizes), not introduced here.
- [x] 7.2 `npx tsc --noEmit` passes with zero errors.
- [x] 7.3 `npm run build` completes successfully (exit 0).
- [x] 7.4 This carve-out's suite is green and at floor: `StoreFilterPopover.test.tsx` 16/16 pass; the per-file coverage threshold passes (§6.1). The full `npm run test:coverage` run surfaced **pre-existing, environment-only** failures in unrelated `|node|` PGlite DB-integration tests (`rails/__tests__/FollowingRail`, `RecentlyVisitedRail`) — `bootPglite()` WASM cold-boot + migration replay exceeds the default 10s `hookTimeout` under parallel load. Confirmed environmental, not a regression: the same tests **pass 5/5** when run single-threaded with a raised hook timeout (`--no-file-parallelism --hookTimeout=60000`). This carve-out touches no DB code and cannot affect PGlite boot. (Relates to the parent's in-flight visit-history/rails carve-outs; not a finding this sub-proposal owns.)
- [x] 7.5 `npm run test:e2e` — **author-run locally** (CI does not run Playwright). This carve-out adds no E2E and touches no E2E-relevant source (a pure client component), so the existing suite is unaffected by construction. Not executed in this sandbox (no browsers / dev server / real `.env.local`); to be run by the author before merge.

## 8. Audit disposition record

- [x] 8.1 Final disposition of every audit finding:
  - **3.1 (assertion substance):** no findings — every `it()` asserts observable DOM / `aria-*` / spy arguments / panel presence; 0 fixes.
  - **3.2 (duplication):** **kept inline** — the `renderPopover`/`trigger`/`panel`/`openPanel` helpers and option list are single-file (below the 3-file extraction threshold). No extraction.
  - **3.3 (complexity):** no finding — `StoreFilterPopover.tsx` is well under 15; `npm run lint` passes at the promoted `error` level. No fix, no per-line disable, floor not lowered.
  - **3.4 (testability):** no finding — pure prop-driven client component, fully reachable without a cross-file refactor.
  - **3.5 (invariant elevation):** six requirements ADDED to [store-filter/spec.md](specs/store-filter/spec.md); non-elevations (icon, class strings, accessible-name spacing) recorded with rationale.
  - **3.6 (deferred findings):** none — carve-out self-contained; nothing appended to `test-coverage/tasks.md` §4.
  - **Coverage gap (§6.1):** the `SearchField` `onClear` arrow was uncovered → **fixed-in-place** by adding `SearchClearButton_ResetsQueryAndRestoresOptions` in [StoreFilterPopover.test.tsx](app/(main)/items/ui/components/__tests__/StoreFilterPopover.test.tsx). Floor not lowered.

  Zero findings remain as TODO comments or unaddressed notes.
