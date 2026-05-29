## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [x] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active.
- [x] 1.3 Confirm `@testing-library/react`, `@testing-library/user-event`, and `vitest` are present (already installed for prior carve-outs).
- [x] 1.4 Spec re-grep against `openspec/specs/item-store-links/spec.md` at HEAD: confirm the placeholder Purpose ("TBD — Update Purpose after archive.") and the two JS-testable requirements this carve-out LOCKS (the "+N trigger SHALL open a `<Menu>`" requirement and the "Hover-open" requirement). Confirm the three NEW requirements (store-validity, empty-state fallback, click-isolation) do not overlap or contradict any existing requirement (especially the CSS-anatomy ones).
- [x] 1.5 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**`. No new exclude needed (no barrel/index in the carve-out path).
- [x] 1.6 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block; the new entry appends to its `files` array.
- [x] 1.7 Read `StoreLinks.tsx` at HEAD and confirm the source shape the tests assert against: `validStores` predicate (`name && link && !Number.isNaN(Number(price))`), `sortedStores` ascending, `lowestPrice`/`primary`, the `!lowestPrice` early return, `.item-price-row`, the `showStores` gate, `has-extras` class, `.storeLinks-more-anchor` + `+N` `<Button>` + `<Menu>`/`<MenuLinkItem>` rows, the 220 ms `COLLAPSE_DELAY_MS` hover grace, `computePlacement`, and the two `stopPropagation` calls.

## 2. Write `app/(main)/items/ui/components/__tests__/StoreLinks.test.tsx` — fixtures + setup

- [x] 2.1 Local `makeItem(stores, overrides?)` helper builds an `ItemDisplay` with the given `stores` array (inline; not extracted — single consumer). Stores are `ItemStoreTable`-shaped (`name`, `link`, `price`).
- [x] 2.2 `afterEach` restores any `getBoundingClientRect` / `getComputedStyle` spies and real timers (`vi.useRealTimers()`); RTL `cleanup` is already global.
- [x] 2.3 Helper to install geometry stubs: `vi.spyOn(window, 'getComputedStyle')` returning a controlled `overflowY` per element, and `vi.spyOn(Element.prototype, 'getBoundingClientRect')` returning a test-controlled rect per element (default all-zero).

## 3. Validity + sort + primary selection

- [x] 3.1 `AllValidStores_PrimaryIsCheapest_PriceRowShowsLowest` — three valid stores at differing prices; assert `.item-price` text is `$<lowest>.toFixed(2)` and the primary `.storeLinks-link` `href` is the cheapest store's link.
- [x] 3.2 `StoreMissingName_ExcludedFromPrimaryAndCount` **Spec delta SHALL** (4a) — a no-name entry is dropped: not the primary, not in the popover, not in the `+N` count.
- [x] 3.3 `StoreMissingLink_Excluded` **Spec delta SHALL** (4a) — a no-link entry is dropped.
- [x] 3.4 `StoreNonNumericPrice_Excluded` **Spec delta SHALL** (4a) — a `price` that yields `NaN` is dropped; no `$NaN` chip or popover row renders.
- [x] 3.5 `MixedValidInvalid_OnlyValidSortedAndCounted` **Spec delta SHALL** (4a) — mix of valid + invalid; primary is the cheapest VALID store, `+N` count equals valid-beyond-primary.
- [x] 3.6 `StoresSortedAscending_PrimaryFirst` — assert the rendered popover row order is price-ascending and the primary store is the first popover row (locks the existing "+N" sort scenario).

## 4. Price row + showStores gate

- [x] 4.1 `PrimaryPriceRow_FormattedTwoDecimals` — `.item-price` renders `$X.XX` via `Number(primary.price).toFixed(2)` (e.g. `5` → `$5.00`, `5.5` → `$5.50`).
- [x] 4.2 `ShowStoresFalse_PriceRowRenders_NoStoreLinks` — with `showStores={false}`, `.item-price-row` exists but `.storeLinks` does NOT.
- [x] 4.3 `ShowStoresDefaultTrue_StoreLinksRender` — default `showStores` (omitted) renders `.storeLinks`.

## 5. Empty-state fallback (Decision 4b ADDED SHALL)

- [x] 5.1 `NoValidStoreWithChildren_RendersActionRowWithChildren` **Spec delta SHALL** (4b) — item with no valid store + children; assert `<div class="item-action-row">` wraps the children, and NO `.item-price-row` / `.storeLinks`.
- [x] 5.2 `NoValidStoreNoChildren_RendersNull` **Spec delta SHALL** (4b) — item with no valid store + no children; assert the component renders nothing (no `.item-action-row`, no `.item-price-row`, no `.storeLinks`).
- [x] 5.3 `EmptyStoresArray_TreatedAsNoValidStore` — `stores: []` (and `stores` undefined) both hit the empty-state path.

## 6. Single vs multi store

- [x] 6.1 `SingleStore_PrimaryChipOnly_NoMoreTrigger_NoHasExtras` — one valid store: `.storeLinks-link` present, NO `.storeLinks-more`, `.storeLinks` does NOT carry `has-extras`.
- [x] 6.2 `MultiStore_PrimaryPlusMoreTrigger_HasExtras` — two-or-more valid stores: `.storeLinks` carries `has-extras`, `.storeLinks-more-anchor` + `.storeLinks-more` `+N` trigger render.
- [x] 6.3 `TwoStores_TriggerLabelSingular` — exactly one extra → trigger `aria-label` is `Show 1 more store` and text is `+1`.
- [x] 6.4 `FourStores_TriggerLabelPlural` — three extras → `aria-label` is `Show 3 more stores`, text is `+3`.

## 7. Primary buy-link chip contract

- [x] 7.1 `PrimaryChip_IsAnchorWithStoreHref` — `.storeLinks-link` is an `<a>` with `href` = primary store's link.
- [x] 7.2 `PrimaryChip_TargetBlankRelNoreferrer` — `target="_blank"`, `rel="noreferrer"`.
- [x] 7.3 `PrimaryChip_RendersStoreNameAndOpenIcon` — the store name text and an `MdOpenInNew` icon (asserted via the rendered SVG, `aria-hidden`).

## 8. `+N` popover open/close + rows (locks the existing "+N trigger" requirement)

- [x] 8.1 `Default_PopoverClosed_NoMenuPopover` — before interaction, the `<Menu>` is closed: no `.menu-popover` in the DOM (the primitive returns `null` when closed), trigger `aria-expanded="false"`.
- [x] 8.2 `TriggerClick_OpensPopover_AriaExpandedTrue` — click `+N`; assert `.menu-popover` mounts and trigger `aria-expanded="true"`.
- [x] 8.3 `OpenPopover_ContainsRowPerValidStoreIncludingPrimary` — for M valid stores, the popover contains exactly M `<MenuLinkItem>` rows (`.storeLinks-menu-item`), including the primary.
- [x] 8.4 `PopoverRows_ShowNameAndPriceFormatted` — each row renders `.storeLinks-menu-name` (store name) and `.storeLinks-menu-price` (`$X.XX`).
- [x] 8.5 `PopoverRows_OrderedAscending_PrimaryFirst` — rows are price-ascending; the primary (cheapest) is first.
- [x] 8.6 `PopoverRowAnchors_TargetBlankRelNoreferrer_WithStoreHref` — each row anchor has the store's `href`, `target="_blank"`, `rel="noreferrer"`.
- [x] 8.7 `TriggerClickAgain_ClosesPopover` — second click toggles closed; `.menu-popover` unmounts, `aria-expanded="false"`.
- [x] 8.8 `ClickMenuRow_ClosesPopover` — clicking a `<MenuLinkItem>` calls `setOpen(false)`; popover unmounts.
- [x] 8.9 `OutsideMousedown_ClosesPopover` — with the popover open, dispatch `mousedown` outside the anchor; the real `<Menu>` dismiss closes it (integration through the primitive).
- [x] 8.10 `EscapeKeydown_ClosesPopover` — with the popover open, `keydown { key: 'Escape' }` closes it via the `<Menu>` primitive.

## 9. Hover-open contract (locks the existing "Hover-open" requirement)

- [x] 9.1 `MouseEnterAnchor_OpensImmediately` — `mouseenter` on `.storeLinks-more-anchor` opens the popover (`cancelCollapseAndOpen`), no click required.
- [x] 9.2 `MouseLeaveAnchor_SchedulesCloseAfter220ms` — with the popover open, `mouseleave`; `vi.advanceTimersByTime(220)`; assert the popover closes.
- [x] 9.3 `MouseLeaveThenReEnterBeforeGrace_StaysOpen` — `mouseleave`, advance < 220 ms, `mouseenter`, advance past 220 ms; assert the popover stays open (the `clearTimeout` cancel path).
- [x] 9.4 `AnchorWrapsTriggerAndMenu` — assert the `+N` trigger and the open `.menu-popover` are both descendants of the single `.storeLinks-more-anchor` element (the hover boundary).

## 10. Placement (locks the existing "opens upward / flips below" scenarios)

- [x] 10.1 `OpenWithNoRoomInfo_PlacementAbove` — default geometry (all-zero rects, `overflowY: 'visible'`): opening yields `placement-above` on the anchor (the `roomAbove >= roomBelow` fallback with both `0`).
- [x] 10.2 `OpenWithClippingAncestorInsufficientRoomAbove_PlacementBelow` — stub a scroll-clipping ancestor (`overflowY: 'auto'`) and rects giving `roomAbove < panelHeight` AND `roomAbove < roomBelow`; opening yields `placement-below`.
- [x] 10.3 `ComputePlacement_WalksToScrollClippingAncestor` — stub a non-clipping intermediate (`overflowY: 'visible'`) wrapping a clipping ancestor; assert the walk reaches the clipping ancestor (placement reflects the clipping ancestor's rect, not the viewport).
- [x] 10.4 `PlacementRecomputesOnOpenToggle` — placement is computed when `open` transitions to true (the `useEffect(..., [open, computePlacement])` gate); closed state does not recompute.

## 11. Click-isolation (Decision 4c ADDED SHALL)

- [x] 11.1 `ClickPrimaryChip_DoesNotBubbleToParent` **Spec delta SHALL** (4c) — render `<div onClick={spy}><StoreLinks .../></div>`; click the primary chip; assert `spy` not called.
- [x] 11.2 `ClickMoreTrigger_DoesNotBubbleToParent_AndToggles` **Spec delta SHALL** (4c) — click the `+N` trigger inside the spy parent; assert `spy` not called AND the popover open state toggled.

## 12. Audits

### 12.1 Assertion-substance audit (on the new tests)

- [x] 12.1 Walk the test file end-to-end. Every assertion SHALL name observable output (DOM attributes, exact class strings, rendered text, anchor `href`/`target`/`rel`, popover row count + order, spy call arguments, exact `$X.XX` price strings, placement class). No internal-state assertions, no DOM snapshots, no tautologies. Specifically verify: price assertions use exact `$X.XX` strings (not regex); popover row-order assertions check the actual DOM order of `.storeLinks-menu-item`; click-isolation assertions check the parent spy's call count is `0`. Record disposition for any flagged test.

### 12.2 Duplication audit

- [x] 12.2 Single test file. The `makeItem` builder and the geometry-stub helper stay inline (no cross-file duplication). **Default disposition: inline; no `test/fixtures/` extraction.** If a future store-links consumer needs the same `ItemDisplay`-with-stores builder, extract then.

### 12.3 Complexity audit (on the carve-out source)

- [x] 12.3 Run `npm run lint` and confirm zero `sonarjs/cognitive-complexity` warnings or errors for `StoreLinks.tsx`. Record the measured complexity if surfaced (expected < 15; `computePlacement` is the peak).

### 12.4 Testability audit (on the carve-out source)

- [x] 12.4 Coverage report at universal `COVERAGE_FLOOR` or above for `StoreLinks.tsx`. Record per-file metrics from `coverage/coverage-summary.json`.
- [x] 12.5 `/* v8 ignore */` annotations: list each annotated region with its rationale. Expected candidate: the `computePlacement` `if (!trigger) return;` guard (the ref is always set when `open` is true and the effect fires) — disposition (a) write the test if reachable, else (c) annotate with rationale. Record the actual disposition.
- [x] 12.6 Source refactors taken in-place: list each with file + line + rationale. Expected: NONE (both testability points handled in-test). If any surfaces, record disposition (a)/(b)/(c) per the no-backdoor rule.

### 12.5 Invariant-elevation audit

- [x] 12.7 Confirm every ADDED `item-store-links` SHALL is asserted by at least one discrete `<State>_<Behavior>` `it()`:
  - Store-validity predicate → §3.2 / §3.3 / §3.4 / §3.5.
  - Empty-state fallback → §5.1 / §5.2.
  - Click-isolation → §11.1 / §11.2.
- [x] 12.8 Confirm no test asserts an invariant lacking a corresponding SHALL — every assertion maps to either an existing `item-store-links` requirement (the "+N" popover and hover-open requirements, the placement scenarios) or one of the three ADDED SHALLs. CSS-anatomy assertions (grid templates, breakpoints) are NOT made here (out of carve-out); where a JS proxy is used (`has-extras` class), it maps to the existing single-line requirement.

## 13. Config changes

- [x] 13.1 Append `app/(main)/items/ui/components/StoreLinks.tsx` to the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs`, under a comment header `// test-item-store-links (sub-proposal 4.4) — locked at universal COVERAGE_FLOOR.`
- [x] 13.2 Add one per-file threshold entry in `vitest.config.ts`'s `thresholds` map for `app/(main)/items/ui/components/StoreLinks.tsx`, referencing `COVERAGE_FLOOR`.
- [x] 13.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line added.

## 14. Apply spec deltas

- [x] 14.1 Leave the three ADDED Requirements in the change delta `specs/item-store-links/spec.md` only — do NOT pre-apply them to the active `openspec/specs/item-store-links/spec.md`. `openspec archive` applies ADDED ops to canonical and throws on a pre-existing header, so hand-applying now would abort the archive. Validate via `openspec validate item-store-links --strict`.
- [x] 14.2 Replace the active spec's placeholder `## Purpose` ("TBD — Update Purpose after archive.") with a real one-paragraph Purpose describing the `item-store-links` capability (the single-line store-chip row: primary buy-link + `+N` popover of all valid stores with prices, hover/click open, upward-with-flip placement, store-less fallback). This is a direct edit to the Purpose section (not a Requirement delta op).
- [x] 14.3 Confirm the carve-out bookkeeping spec at `openspec/changes/test-item-store-links/specs/testing-foundation/spec.md` stays archive-only — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md` (Tier 2 per `test-coverage` design D13).
- [x] 14.4 Leave `openspec/changes/test-coverage/tasks.md` §4.4 checkbox unchecked; it flips on archive of this sub-proposal (not at apply).

## 15. Pre-merge

- [x] 15.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files (the carry-forward set from prior carve-outs) are acceptable; this carve-out introduces zero new warnings or errors.
- [x] 15.2 `npx tsc --noEmit` exits 0 with zero errors.
- [x] 15.3 `npm run build` completes successfully — all routes generated.
- [x] 15.4 `npm run test:coverage` passes; coverage report for `StoreLinks.tsx` at universal `COVERAGE_FLOOR` (98/98/95/100 minimum) or above.
- [x] 15.5 `npm run test:e2e` — record outcome. If no e2e specs exist on this branch, "No tests found" is vacuously acceptable; the e2e gate lands with sub-proposal 6.x.

## 16. Audit disposition record

- [x] 16.1 Record final dispositions for §12.1–§12.8 (assertion-substance, duplication, complexity, testability incl. any `/* v8 ignore */` + refactors, invariant-elevation) and the §15 pre-merge gate outcomes, mirroring the disposition-record format used by prior carve-outs.

### Disposition record

**§12.1 Assertion-substance** — PASS. Every `it()` names observable output: exact `$X.XX` price strings via `.item-price`/`.storeLinks-menu-price` `textContent` (not regex), anchor `href`/`target`/`rel`, exact class strings (`has-extras`, `placement-above`/`placement-below`), popover row count + ascending `href` order, `aria-expanded`/`aria-label`/`+N` text, parent-spy call count `0` for click-isolation. No DOM snapshots, no internal-state assertions, no tautologies.

**§12.2 Duplication** — Inline; no `test/fixtures/` extraction. `makeItem`/`store` builders and `installGeometryStubs` stay local to the single test file (no second store-links consumer yet).

**§12.3 Complexity** — PASS. `npm run lint` reports **zero** `sonarjs/cognitive-complexity` findings for `StoreLinks.tsx` under the new `error`-level override (measured complexity < 15; `computePlacement` is the peak). The 9 carry-forward complexity warnings are all in unrelated, not-yet-carved-out files.

**§12.4 Testability (coverage)** — PASS. Per-file metrics from `coverage/coverage-summary.json` for `app/(main)/items/ui/components/StoreLinks.tsx`: **lines 100%, functions 100%, statements 98.41%, branches 97.29%** — at or above the universal `COVERAGE_FLOOR` (98/98/95/100).

**§12.5 `/* v8 ignore */`** — One annotation, disposition (c). `computePlacement`'s `if (!trigger) return;` guard is unreachable (the effect that calls it is gated on `open`, which only becomes true while the trigger Button — and thus `triggerRef.current` — is mounted). Annotated `/* v8 ignore next */` with rationale, mirroring the identical defensive-guard precedent in `Menu.tsx`.

**§12.6 Source refactors** — NONE. The only source touch is the §12.5 coverage annotation (a comment, not a behavior change). Both testability attention points were handled in-test: jsdom-layout via `getBoundingClientRect`/`getComputedStyle` stubs, the 220 ms hover grace via `vi.useFakeTimers()`.

**§12.7 Invariant-elevation** — PASS. Each ADDED SHALL is asserted by ≥1 discrete `<State>_<Behavior>` test: store-validity → `StoreMissingName_…` / `StoreMissingLink_Excluded` / `StoreNonNumericPrice_Excluded` / `MixedValidInvalid_OnlyValidSortedAndCounted`; empty-state → `NoValidStoreWithChildren_…` / `NoValidStoreNoChildren_RendersNull`; click-isolation → `ClickPrimaryChip_DoesNotBubbleToParent` / `ClickMoreTrigger_DoesNotBubbleToParent-AndToggles`.

**§12.8 No-orphan-assertion** — PASS. Every assertion maps to an existing `item-store-links` requirement (the `+N` `<Menu>` popover, hover-open, and the two placement scenarios) or one of the three ADDED SHALLs. No CSS grid-template/breakpoint assertions are made; the `has-extras` class is the JS proxy for the single-line two-column grid requirement.

### Deviations from the authored task text (recorded, not silent)

- **Placement default is `below`, not `above`.** `design.md` Decision 3 claimed the unstubbed jsdom default resolves `above` via `roomAbove >= roomBelow` with both `0`; this is an arithmetic error — jsdom's `window.innerHeight` is `768`, so `roomBelow = 768` and the unstubbed default actually resolves `below`. The placement tests therefore drive **both** ternary branches with explicit geometry stubs (a clipping ancestor + per-element rects) rather than relying on the default. Tests renamed accordingly: `RoomAbove_PlacementAbove`, `InsufficientRoomAbove_PlacementBelow`, `ClippingAncestor_PlacementUsesAncestorRect`, `OpenToggle_PlacementRecomputes`.
- **`<Menu>` renders inline (no portal).** Confirmed from source: `Menu.tsx` returns `<div className="menu-popover" role="menu">` directly (it does not `createPortal` to `document.body`). So §9.4 (`OpenPopover_AnchorWrapsTriggerAndMenu`) holds exactly as the spec's Hover-open requirement states — the open `.menu-popover` is a genuine descendant of the single `.storeLinks-more-anchor` wrapper. No spec/source discrepancy.
- **Test names converted to single-underscore form.** Several authored names (e.g. `AllValidStores_PrimaryIsCheapest_PriceRowShowsLowest`) carried two underscores; the `vitest/valid-title` lint rule permits exactly one `State_Behavior` underscore with dash-joined behavior facets, so multi-facet names use dashes (e.g. `AllValidStores_PrimaryIsCheapest-PriceRowShowsLowest`).

### §15 Pre-merge gate outcomes

- **15.1 lint** — PASS. 0 errors. Carve-out files (`StoreLinks.tsx`, `StoreLinks.test.tsx`) emit 0 warnings; the 11 carry-forward warnings are all in unrelated files.
- **15.2 tsc** — PASS. `npx tsc --noEmit`: no errors.
- **15.3 build** — PASS. `npm run build` completed; all routes generated. (Pre-existing multiple-lockfile workspace-root warning is unrelated.)
- **15.4 test:coverage** — PASS. 72 files / 855 tests passed; `StoreLinks.tsx` at the floor (see §12.4).
- **15.5 test:e2e** — "No tests found" — vacuously acceptable; the e2e gate lands with sub-proposal 6.x.
