## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Confirm the `COVERAGE_FLOOR` constant and the per-file `thresholds` map exist in `vitest.config.ts`, and the jsdom/node two-project split routes `.test.tsx`→jsdom and `.test.ts`→node.
- [ ] 1.2 Confirm `test/helpers/setup.ts` is loaded for the jsdom project (RTL matchers, cleanup). Confirm the per-file `sonarjs/cognitive-complexity = error` override array exists in `eslint.config.mjs`.
- [ ] 1.3 Confirm the carve-out boundary against the live tree: `Item.tsx`, `StoreLinks.tsx`, `Purchase.tsx`, `ItemPhoto.tsx`, `SortItems.tsx`, `SortItemsContainer.tsx`, `PriceFilterPopover.tsx`, `StoreFilterPopover.tsx`, the `itemform/` and `purchasemodal/` trees, `DeleteItemButton.tsx`, `EditItemButton.tsx`, `[id]/*`, `returnTo.ts`, and the page shells (`ItemsContainer.tsx`, `ItemsPage.tsx`, `page.tsx`, `loading.tsx`) are NOT in this carve-out.

## 2. Write `app/(main)/items/ui/components/__tests__/itemFilters.test.ts` (node, universal COVERAGE_FLOOR)

- [ ] 2.1 `displayPrice` — `LowestFiniteAcrossValidStores_ReturnsMin`, `StoreMissingNameOrLink_Ignored`, `NonNumericPrice_Ignored`, `NoQualifyingStore_ReturnsNaN`.
- [ ] 2.2 `firstStoreName` — `MultipleStores_ReturnsAlphabeticallyFirst`, `NoStores_ReturnsEmptyString`.
- [ ] 2.3 `compareItems` — one `it()` per `SortKey`: `CreatedAsc_OrdersByTimestampAscending`, `CreatedDesc_OrdersByTimestampDescending`, `NameAsc_OrdersByLocaleCompare`, `NameDesc_OrdersByReverseLocaleCompare`, `StoreAsc_MissingStoreSortsLast`, `StoreDesc_MissingStoreSortsLast`, `PriceAsc_MissingPriceSortsLast`, `PriceDesc_MissingPriceSortsLast`, `ListOrder_ReturnsZero`. Each asserts the sign/ordering, not just a non-zero number.

## 3. Write `app/(main)/items/ui/components/__tests__/paginationConstants.test.ts` (node, universal COVERAGE_FLOOR)

- [ ] 3.1 `Constants_LockPageSizeContract` — `DEFAULT_PAGE_SIZE === 24` and `PAGE_SIZE_OPTIONS` deep-equals `[12, 24, 48, 96]` (locks the cookie/normalize option set per spec R-D; also covered transitively by importing tests).

## 4. Write `app/(main)/items/ui/components/__tests__/PageSizeSelect.test.tsx` (jsdom, universal COVERAGE_FLOOR)

- [ ] 4.1 `Options` — `RendersOnePerPageSizeOption`: one `<option>` per `PAGE_SIZE_OPTIONS` with label `"${n} / page"`; the select reflects `value`.
- [ ] 4.2 `Change` — `Selection_CallsOnChangeWithNumber`: changing the select calls `onChange` with a `number` (not the string event value).
- [ ] 4.3 `Accessibility` — `Render_HasItemsPerPageLabelAndSmallSize`: `aria-label="Items per page"` and `fieldSize="sm"` reach the field.

## 5. Write `app/(main)/items/ui/components/__tests__/Items.test.tsx` (jsdom, universal COVERAGE_FLOOR)

- [ ] 5.1 `ModuleMocks` — `./Item` mocked to a prop-surfacing stub (`data-item-id`, `data-user-id`, `data-archived-view`).
- [ ] 5.2 `ViewMode` — `ViewList_RendersItemListClass`, `ViewGrid_RendersItemGridClass`, `ViewOmitted_DefaultsToItemGrid`; the outer `.item-grid-container` always renders.
- [ ] 5.3 `ItemMapping` — `MultipleItems_RendersOneStubPerItemInOrder` (keyed by id, input order preserved); `ForwardedProps_ReachEachItem` (asserts `user_id` / `showArchiveAction` / `archivedView` surfaced by the stub).

## 6. Write `app/(main)/items/ui/components/__tests__/Pagination.test.tsx` (jsdom, universal COVERAGE_FLOOR)

- [ ] 6.1 `ModuleMocks` — `next/navigation` (`useRouter`/`usePathname`/`useSearchParams`) controlled per test; real `PageSizeSelect` and `Button`.
- [ ] 6.2 `Range` — `SevenOrFewerPages_RendersEveryPageNoGap`, `MoreThanSevenMidRange_RendersFirstGapWindowGapLast`, `WindowNearStart_OmitsLeadingGap`, `WindowNearEnd_OmitsTrailingGap` (drives every `buildRange` branch).
- [ ] 6.3 `CurrentPage` — `CurrentPage_HasAriaCurrentAndPrimaryVariant`; other page buttons are ghost.
- [ ] 6.4 `Bounds` — `FirstPage_PreviousDisabled`, `LastPage_NextDisabled`.
- [ ] 6.5 `Navigation` — `ClickPageGreaterThanOne_ReplaceSetsPageParam`, `PreviousFromPageTwo_ReplaceRemovesPageParam`.
- [ ] 6.6 `Composition` — `Render_PageSizeSelectInsidePaginationNav` (`nav.items-pagination` contains the page-size select).

## 7. Write `app/(main)/items/ui/components/__tests__/ItemsToolbar.test.tsx` (jsdom, universal COVERAGE_FLOOR)

- [ ] 7.1 `ModuleMocks` — `next/navigation` controlled per test; `./PriceFilterPopover` and `./StoreFilterPopover` stubbed (out of carve-out, callback-exposing); primitives and `useKeyboardOffset` NOT mocked.
- [ ] 7.2 `Search` — `TypingBurst_CommitsOnceAfterDebounceWithPageRemoved` (fake timers; one `router.replace`, `q` set, `page` removed); `SubDebounceWindow_NoCommit`.
- [ ] 7.3 `FiltersTrigger` — `Render_HasFiltersLabelOpenFiltersAriaAndDialogHaspopup`; `ActiveFilters_CountBadgeEqualsActiveFilterCount`; `Click_OpensSheetWithDialogRole`.
- [ ] 7.4 `SheetDismiss` — `CloseButton_ClosesSheet`, `ScrimClick_ClosesSheet`, `EscapeKeydown_ClosesSheet`; `EscapeListenerAttachedOnlyWhileOpen` (spy `document.addEventListener`/`removeEventListener`, balanced across open/close and on unmount).
- [ ] 7.5 `Selects` — `SortNonDefault_ReplaceSetsSortRemovesPage`, `SortDefaultChosen_ReplaceRemovesSortParam`, `PurchasesHide_ReplaceRemovesPurchasesParam`, `ShowAll_ReplaceRemovesShowParam` (the `choose`-mode `show` select); each removes `page`.
- [ ] 7.6 `ViewToggle` — `ShowGridToggleDefault_RendersSegmentedControl`, `ShowGridToggleFalse_NoViewCell`, `SelectGrid_ReplaceRemovesViewParam`, `SelectList_ReplaceSetsViewList`.
- [ ] 7.7 `ChipMatrix` — parameterized over `mode ∈ {items, list, choose}` × active-filter combinations (Decision 7): `…_RendersExpectedChips` (one `Chip` per active filter, expected label string, remove handler calls the right param removal), `NoActiveFilters_RendersNoChipRow`. Drives `branches ≥ 95`.
- [ ] 7.8 `DefaultsAndOptions` — `ModeList_DefaultSortListOrder`, `ModeItems_DefaultSortCreatedDesc`; `NoStoreSort_ExcludesStoreSortOptions`, `NoPriceSort_ExcludesPriceSortOptions`.
- [ ] 7.9 `PopoverWiring` — `PriceStub_OnApplyCallsUpdateParamsWithPriceAndPageRemoved`, `PriceStub_OnClearRemovesPriceParams`, `StoreStub_OnToggleAppendsOrRemovesStoreParam`, `StoreStub_OnClearRemovesStoreParam` (exercises `applyPrice`/`clearPrice`/`toggleStore`/`clearStores` via the stubs' exposed callbacks).

## 8. Write `app/(main)/items/ui/components/__tests__/ItemsBrowser.test.tsx` (jsdom, universal COVERAGE_FLOOR)

- [ ] 8.1 `ModuleMocks` — `next/navigation` controlled per test; `./Item` stubbed (transitively rendered via `Items`); real `ItemsToolbar` (with its own out-of-carve-out children stubbed via the same `vi.mock` setup), `Items`, `Pagination`.
- [ ] 8.2 `Filter` — `SearchQuery_MatchesNameAndDescriptionCaseInsensitive`, `StoreFilter_OrWithinAndAcrossOtherFilters`, `PurchasesOnly_KeepsHasPurchases`, `PurchasesNone_KeepsNotHasPurchases`, `PriceRange_InclusiveExcludesNonFinitePrice`, `MultipleFilters_ComposeConjunctively` (spec R-A).
- [ ] 8.3 `Sort` — `SortPriceAsc_OrdersFilteredResult`, `ListOrder_PreservesInputOrder` (sort applied after filter).
- [ ] 8.4 `Paginate` — `PageTwo_RendersCorrectSlice`, `TotalPages_CeilOfCountOverPageSize` (spec R-A slice).
- [ ] 8.5 `PageClamp` — `OverRangePage_ClampsToLastPage`, `NonPositiveOrNonNumericPage_ResolvesToPageOne` (spec R-B).
- [ ] 8.6 `EmptyFiltered` — `NoItemsMatch_RendersEmptyFilteredState`, `ClearFilters_RemovesQStorePurchasesPricePageParams` (spec R-B).
- [ ] 8.7 `ViewMode` — `ViewListParam_PassesListToItems`, `ViewParamAbsentOrOther_PassesGridToItems` (spec R-C view derivation).
- [ ] 8.8 `PageSize` — `ChangePageSize_WritesItemsPageSizeCookieWithAttrsAndRemovesPage`, `OffListSize_NormalizesToDefault24`, `ValidOption_KeptAsIs` (spec R-D; assert cookie name, value, `path=/`, `max-age=31536000`, `SameSite=Lax` via a `document.cookie` spy/inspection).
- [ ] 8.9 `MemoBehavior` — `StoreSetChange_RecomputesVisibleItems` (Decision 6: behavioral assertion across `?store=` change, not the deps array).

## 9. Audits (performed and recorded BEFORE coverage validation)

### 9.1 Assertion-substance audit (on the seven new test files)

- [ ] 9.1 For each `it()`, record in one sentence the observable behavior asserted (return value / rendered DOM / `router.replace` argument / cookie write / thrown value). Confirm no test asserts on a value the test itself constructed, a tautology, or a smoke-execute. Fix any finding in-place (assertion audit is always fixed in-place, never deferred).

### 9.2 Duplication audit (across the new test files)

- [ ] 9.2 Identify repeated setup: the `next/navigation` mock (`useRouter`/`usePathname`/`useSearchParams`) appears in `ItemsBrowser`, `ItemsToolbar`, and `Pagination` tests; an `ItemDisplay` fixture builder appears in `ItemsBrowser` and `itemFilters` tests. **Disposition:** if a mock/factory is reused across 3+ files, extract to `test/helpers/` (mock) or `test/fixtures/` (`ItemDisplay` builder) per the foundation's colocation rule; otherwise keep inline. Record the disposition with file references.

### 9.3 Complexity audit (on the carve-out source)

- [ ] 9.3 Measure `sonarjs/cognitive-complexity` for all seven files. Expected: `ItemsBrowser.tsx` and `ItemsToolbar.tsx` are the only non-trivial files (~8–12). **Disposition:** any function at ≥15 is fixed in-place (single-file extraction of a URL-param helper, behavior preserved by the new tests) OR given a named per-line disable; the file is never skipped and the floor is never lowered. Record the measured values.

### 9.4 Testability audit (on the carve-out source)

- [ ] 9.4 Attention points: (1) `ItemsBrowser`/`ItemsToolbar`/`Pagination` depend on `next/navigation` hooks — disposition: mock `next/navigation` per test (framework boundary, allowed). (2) `ItemsBrowser` transitively renders `Item` — disposition: module-mock `./Item` (out of carve-out). (3) `ItemsToolbar` renders `PriceFilterPopover`/`StoreFilterPopover` — disposition: module-mock both (out of carve-out, deferred). (4) `handlePageSizeChange` writes `document.cookie` — disposition: inspect/spy `document.cookie` in jsdom (no refactor). (5) `useKeyboardOffset` no-ops under jsdom (no `visualViewport`) — disposition: leave unmocked; the no-op is the contract 4.1 locked. Record each disposition; confirm none requires a cross-file refactor (if one does, defer per 9.6).

### 9.5 Invariant-elevation audit

- [ ] 9.5 **Elevated** (added to `items-browser-chrome` spec, all pass the three-part test): (a) filter→sort→paginate pipeline; (b) page clamp + filtered-empty affordance; (c) URL-as-source-of-truth + default-param omission + `page` reset; (d) `items_page_size` cookie normalization contract; (e) windowed pagination range + disabled bounds.
- [ ] 9.5b **NOT elevated** (tested, with rationale): the exact 200ms search debounce value (impl detail — the debounce *behavior* + page reset is elevated in R-C); the active-filter chip-row content/labels and `filterCount` (the `items-browser-chrome` scope statement explicitly excludes "the active-filter chip row"); `firstStoreName`'s alphabetical tie-break (derivable from the function name/return type); the `.item-grid`/`.item-list` class string (the behavioral half of the existing "Mobile view mode" requirement — tested, not a new elevation); the CSS/viewport breakpoints (jsdom cannot assert computed layout; covered by E2E 6.x — Decision 4).

### 9.6 Deferred-findings record (discovered sub-proposals)

- [ ] 9.6 Append three checkboxes to `openspec/changes/test-coverage/tasks.md` §4 (the canonical record of the boundary decisions): `test-items-price-filter` (`PriceFilterPopover.tsx` vs the existing `items-price-filter` spec); `test-items-store-filter` (`StoreFilterPopover.tsx`; create/elevate a `store-filter` family spec); `test-items-library-shell` (`ItemsContainer.tsx`, `ItemsPage.tsx`, `app/(main)/items/page.tsx`, `app/(main)/items/loading.tsx`; coordinate the `redirect()`-on-unauthenticated paths with §4.13). Confirm no finding is left as a TODO/issue-only note.

## 10. Config changes

- [ ] 10.1 `vitest.config.ts` — add seven per-file `thresholds` entries (each `= COVERAGE_FLOOR`), under a comment `// test-items-browser-chrome (sub-proposal 4.5) — locked at universal COVERAGE_FLOOR.`: `ItemsBrowser.tsx`, `ItemsToolbar.tsx`, `Items.tsx`, `Pagination.tsx`, `PageSizeSelect.tsx`, `itemFilters.ts`, `paginationConstants.ts`.
- [ ] 10.2 `eslint.config.mjs` — add the same seven paths to the per-file `sonarjs/cognitive-complexity = error` override array, under the matching comment.

## 11. Apply spec deltas

- [ ] 11.1 Apply the five ADDED requirements to `openspec/specs/items-browser-chrome/spec.md` (filter pipeline; page clamp + empty state; URL/default-param + page reset; cookie contract; pagination windowing). Confirm no existing requirement is changed.
- [ ] 11.2 Confirm the `testing-foundation` Tier-2 carve-out record stays in this change's delta dir only (archive-only) — NOT rolled into the parent `test-coverage` accumulator and NOT written to the active `openspec/specs/testing-foundation/spec.md`.

## 12. Coverage validation

- [ ] 12.1 `npm test -- --coverage` — confirm each of the seven carve-out files meets `lines ≥ 98 / statements ≥ 98 / branches ≥ 95 / functions = 100`. Close any gap via a test OR `/* v8 ignore */` with a named reason — never by lowering the floor.

## 13. Pre-merge (four-gate)

- [ ] 13.1 `npm run lint` passes with zero errors and zero warnings (the `sonarjs/cognitive-complexity = error` promotion in effect for the seven files; assertion-substance lint rules pass).
- [ ] 13.2 `npx tsc --noEmit` passes with zero errors.
- [ ] 13.3 `npm run build` completes successfully.
- [ ] 13.4 `npm test` passes (all seven new files green under both jsdom and node projects).

## 14. Audit disposition record

- [ ] 14.1 Record the final disposition of every audit finding (9.1–9.6) in this file: each is fixed-in-place (with file reference) or deferred-as-new-sub-proposal (with the §4 checkbox name). Confirm zero findings remain as TODO comments or unaddressed notes.
