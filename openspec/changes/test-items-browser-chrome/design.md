## Context

Sub-proposal 4.5 of `test-coverage` adds unit coverage for the **items browser chrome** under `app/(main)/items/` and elevates the chrome's latent behavioral invariants to the existing `items-browser-chrome` capability spec. The foundation (1.1, 1.2), the housekeeping amendment (0.1), the pure-libs carve-out (2.1), the six primitive families (3.1–3.6), the misc primitives (3.8), and the app-frame capability (4.1) have archived. The runner (vitest 4.x, jsdom/node two-project split), RTL, the `__tests__/` convention, the universal `COVERAGE_FLOOR` constant, the four-audit obligation, the naming conventions, and the `sonarjs` warn→error-per-carve-out policy are all in place and authoritative.

The `items-browser-chrome` spec already exists (archived from `compact-items-mobile-chrome`) with five requirements, all describing CSS/viewport-adaptive layout of the toolbar, the grid/list view mode, and the floating pagination. None of those requirements describes the **data behavior** of the chrome — the filter→sort→paginate pipeline in `ItemsBrowser`, the URL-as-source-of-truth pattern, the `items_page_size` cookie contract, or the `buildRange` pagination windowing. Those behaviors are load-bearing, non-obvious, and currently locked by nothing. This carve-out tests them and elevates them.

The constraint that shapes the test design: **jsdom does not compute layout.** The existing five spec requirements are CSS media-query behaviors (`≤599px` single-column list, hidden view toggle, one-row toolbar, floating pagination). Unit tests cannot assert computed styles or breakpoint transitions. They CAN assert the DOM-level half of those requirements (the SegmentedControl is mounted at all viewports; the toolbar renders the search + filters-trigger + view cells; the chip row renders when chips exist; the pagination nav exists). The new behavioral requirements (Decision 3) are what jsdom can fully verify.

## Goals / Non-Goals

**Goals:**

- Seven colocated test files under `app/(main)/items/ui/components/__tests__/`, each meeting the universal `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) for its source file.
- Elevate five behavioral invariants to the `items-browser-chrome` spec as ADDED requirements (filter pipeline, page clamp + empty state, URL/default-param contract, cookie contract, pagination windowing).
- Lock the seven files' cognitive-complexity ceiling at `error`.
- Make the rest of the `app/(main)/items/` directory's coverage ownership explicit via three discovered sub-proposals.

**Non-Goals:**

- Testing the item card (`Item.tsx`), store links, purchase/claim modal, item form, or the `@dnd-kit` reorder view — those belong to 4.4 / 4.9 and are module-mocked here.
- Testing the filter popovers (`PriceFilterPopover`, `StoreFilterPopover`) — deferred to discovered sub-proposals; module-mocked in `ItemsToolbar.test.tsx`.
- Testing the page-level server/route shells (`ItemsContainer`, `ItemsPage`, `page.tsx`, `loading.tsx`) — deferred to a discovered shell sub-proposal that coordinates with §4.13 server-endpoint authorization.
- Asserting computed CSS layout or media-query breakpoints (jsdom cannot); E2E (6.x) covers viewport behavior.
- Re-testing the primitives (`SearchField`, `SelectField`, `PopoverTrigger`, `SegmentedControl`, `Chip`, `Button`) or `useKeyboardOffset` — already covered by 3.1–3.6 / 4.1 and rendered for real to exercise integration.

## Decisions

### Decision 1: One `*.test.{ts,tsx}` per executable source file; tests under `__tests__/` mirroring source.

Seven files initially: five `.test.tsx` (jsdom — the client components `ItemsBrowser`, `ItemsToolbar`, `Items`, `Pagination`, `PageSizeSelect`) and two `.test.ts` (node — the pure modules `itemFilters`, `paginationConstants`). This matches the two-project split in `vitest.config.ts` (`.test.tsx`→jsdom, `.test.ts`→node) and the `__tests__/` convention `test-housekeeping` established. `paginationConstants.ts` has no functions (functions:100 is vacuous) and is covered transitively by every importer; it still gets a one-file test asserting the constant values, because the cookie/normalize contract (Decision 3, R-D) depends on `PAGE_SIZE_OPTIONS` being exactly `[12,24,48,96]` and `DEFAULT_PAGE_SIZE` being `24` — that is a contract worth a direct assertion, not just transitive execution.

**Amendment (apply-time, complexity audit 9.3):** `ItemsToolbar.tsx` measured cognitive-complexity 32 — far above the 15 ceiling the carve-out promotes to `error`. Rather than a per-line disable, it was decomposed **in-place** into a co-located `itemsToolbar/` module: the orchestrator (`ItemsToolbar.tsx`), three presentational sub-components (`FiltersSheet`, `PurchasesSelect`, `SearchInputControl`), a pure-helper module (`utils.ts`), and a data module (`toolbarConstants.ts` — not `constants.ts`, which collides with Node's builtin `constants` in vite's resolver). The sub-components are presentational (props in, callbacks out), so their tests need no `next/navigation` mock; the orchestrator's test keeps the navigation mock and asserts end-to-end `router.replace` URLs (integration), while the sub-component/util tests assert callbacks and return values (unit) — a deliberate two-layer split, not duplication. Net: 12 executable source files and 11 test files (the original 6 components-dir tests plus five `itemsToolbar/__tests__/` tests: `ItemsToolbar`, `FiltersSheet`, `PurchasesSelect`, `SearchInputControl` `.test.tsx` and `utils.test.ts`). `types.ts` (type-only) and `index.ts` (barrel) are coverage-excluded.

**Alternative considered:** folding `paginationConstants` assertions into `Pagination.test.tsx`. Rejected — the per-file floor is enforced per file; a dedicated file keeps the constant's contract legible and the floor unambiguous.

### Decision 2: Out-of-carve-out children are module-mocked; in-carve-out children and tested primitives render for real.

`ItemsBrowser` renders `Items`, which renders `Item` (out of carve-out, heavy — store links, purchase state, owner actions). `ItemsToolbar` renders `PriceFilterPopover` and `StoreFilterPopover` (out of carve-out, deferred). These are `vi.mock`ed to small stubs:

- `./Item` → `<div data-testid="item-stub" data-item-id={item.id} data-user-id={user_id} data-archived-view={String(archivedView)} />` (surfaces forwarded props for `Items.test.tsx` assertions).
- `./PriceFilterPopover`, `./StoreFilterPopover` → minimal stubs that expose their `onApply`/`onClear`/`onToggle` callbacks via buttons, so `ItemsToolbar`'s wiring (`applyPrice`, `clearPrice`, `toggleStore`, `clearStores`) is exercised without the popovers' internals.

In-carve-out children (`ItemsToolbar`, `Items`, `Pagination`, `PageSizeSelect`) are NOT mocked — they render for real so the chrome's composition is exercised. Tested primitives (`SearchField`, `SelectField`, `PopoverTrigger`, `SegmentedControl`, `Chip`, `Button`) are NOT mocked — they render real DOM in jsdom, and asserting through them verifies the integration the chrome relies on. This mirrors `test-app-frame` Decision 2/7 (mock the out-of-carve-out `<User>`, render real `<AppNav>` / `<LinkButton>`).

**Alternative considered:** rendering the real `Item`. Rejected — it drags `item-store-links` / `list-item-management` source into this carve-out's tests, couples failures across capabilities, and inflates runtime.

### Decision 3: ADD five behavioral requirements to `items-browser-chrome`; MODIFY none.

The existing spec covers layout/viewport only. The source enforces five behavioral contracts that pass the elevation test — (a) non-obvious from name/signature/type, (b) survives a reasonable reimplementation, (c) protects a real failure mode:

#### 3a — Filter → sort → paginate pipeline (`ItemsBrowser.filteredSorted` + slice).
The browser filters by search `q` (matches `name` **and** `description`, lowercased substring), by `store` (item passes if ANY of its stores is in the selected set), by `purchases` (`only`→`hasPurchases`, `none`→`!hasPurchases`), and by price range (inclusive `[priceMin, priceMax]`, items with non-finite `displayPrice` excluded when a price filter is active); multiple active filters compose conjunctively; then sorts by the active key (`list_order` preserves input order, others via `compareItems`); then paginates by slicing `[(page-1)*pageSize, page*pageSize)`. **Failure mode:** a reimplementation that ORs filter types, or forgets the non-finite-price exclusion, silently shows wrong items — the user can't find a gift or sees one they filtered out. Non-obvious (the AND-across / OR-within-stores asymmetry and the NaN exclusion are not derivable from a `filter` signature).

#### 3b — Out-of-range page clamp + filtered-empty affordance.
`totalPages = max(1, ceil(n/pageSize))`; `page = min(max(1, requestedPage), totalPages)`; a `?page=` that is `≤0`, non-numeric, or beyond the last page resolves to a valid in-range page (not a blank screen). When the filtered result is empty, the browser renders the `.items-empty-filtered` state with a Clear-filters control that removes `q`/`store`/`purchases`/`price_min`/`price_max`/`page`. **Failure mode:** without the clamp, deep-linking `?page=999` or shrinking the result set via a filter strands the user on an empty page with no items and no obvious recovery.

#### 3c — URL is the source of truth; default values omit their param; filter changes reset `page`.
View, sort, and all filters live in the URL search params, written via `router.replace` (not `push`, so filter churn does not bloat history). Selecting a default value removes the param rather than serializing it: `view=grid` → no `view` param, `sort===defaultSort` → no `sort` param, `purchases==='hide'`/`show==='all'` → removed. The mode default is `list_order` for `mode='list'` and `created_desc` otherwise; an absent or invalid `sort` resolves to the default. Any filter/sort/search/page-size change removes `page` (so the user lands on page 1 of the new result set). Search commits on a trailing 200ms debounce. **Failure mode:** `push` instead of `replace` traps the back button; serializing defaults produces ugly shareable URLs and breaks "is a filter active?" checks; not resetting `page` strands the user past the end of a freshly-filtered list.

#### 3d — `items_page_size` cookie persistence + normalization.
Page size persists to the cookie `items_page_size` (`path=/`, `max-age=31536000`, `SameSite=Lax`); only `{12,24,48,96}` are valid; any other value (absent, NaN, off-list) normalizes to `DEFAULT_PAGE_SIZE` (24). The server-side shell reads the **same cookie name** to seed `initialPageSize`. **Failure mode:** a rename or option-set drift on either side silently resets the user's page-size preference every navigation — a cross-request contract between the client writer (`handlePageSizeChange`) and the server reader (`readPageSizeCookie` / `page.tsx`). The cookie name and option set are the API.

#### 3e — Windowed pagination range with disabled bounds.
`buildRange`: `totalPages ≤ 7` renders every page; `> 7` renders `1`, an ellipsis `gap` when `start > 2`, the `page-1 … page+1` window, a trailing `gap` when `end < totalPages-1`, and `totalPages`. Previous is disabled at page 1, Next at the last page; the current page is marked `aria-current="page"`; navigating to page 1 removes the `page` param. **Failure mode:** off-by-one in the window or a missing disabled-bound produces broken/duplicate page controls.

**No MODIFIED requirements.** Unlike `test-app-frame` (which found a drifted R2 mobile-nav scenario), the existing five layout requirements match current source. The tests lock their DOM-level half (Decision 4) without changing their wording.

**Alternative considered:** elevating fewer requirements (e.g. only the filter pipeline). Rejected — each of the five protects a distinct, real failure mode and is currently unspecced; the elevation requirement mandates adding an invariant when all three conditions hold, and they do for each. **Alternative considered:** elevating the exact 200ms debounce value and the chip-label strings. Rejected as non-elevations (recorded in tasks.md): the precise debounce ms is an impl detail (the *behavior* "search commits debounced and resets page" is in 3c), and the chip-row content is explicitly outside the `items-browser-chrome` scope statement ("SHALL NOT govern … the active-filter chip row").

### Decision 4: CSS/viewport requirements are locked at the DOM-presence level, not computed-style level.

The existing five requirements are media-query layout behaviors. jsdom returns no real layout, so the tests assert the **invariant DOM that the CSS acts on**, not the CSS result: the `SegmentedControl` view toggle is in the DOM at all rendered widths (CSS hides it ≤599px — the "still mounted in DOM" clause of the "Mobile view toggle hidden" requirement is directly assertable); the `PopoverTrigger` always passes `label="Filters"` and `aria-label="Open filters"` (the compact-icon requirement's a11y clause); the chip row renders when chips exist (the "active filter chips still render" clause); the `nav.items-pagination` exists (the floating-pagination requirement's reachability clause). The pixel/breakpoint behavior is verified by E2E (6.x), not here. This is the same boundary `test-app-frame` drew for the 700px nav breakpoint.

### Decision 5: Search debounce tested with fake timers.

`SearchInputControl` commits via a `setTimeout(…, 200)` in a `useEffect` keyed on `value`. The test uses `vi.useFakeTimers()`, types via `fireEvent.change`, advances `< 200ms` (asserts no commit), advances past 200ms (asserts exactly one `router.replace` with `q` set and `page` removed), and verifies a multi-keystroke burst within the window collapses to a single commit (the `clearTimeout` cleanup). Real timers restored in `afterEach`. Mirrors the documented debounce-test approach the `items-price-filter` spec references for the 400ms price debounce.

### Decision 6: The `filteredSorted` `useMemo` is tested behaviorally, not via its deps array.

`filteredSorted` carries an `eslint-disable react-hooks/exhaustive-deps` because it depends on `selectedStores` via the stable `selectedStoresKey = selectedStores.join('|')` projection (to avoid array-identity churn). The tests assert the *behavior* across store-set changes (rerender with a new `?store=` and assert the visible items recompute), never the deps array or the disable. The disable is the source's choice; the test guards that the projection actually tracks store changes.

### Decision 7: Branch coverage of the chip / filter-count matrix via parameterization.

`ItemsToolbar`'s chip builder and `filterCount` branch per filter type and per `mode` (`items`/`list`/`choose` change which filters apply — e.g. `purchases` only for non-`choose`, `show` only for `choose`). A parameterized matrix over `mode` × active-filter combinations drives `branches ≥ 95`. Parameterized `it()` names interpolate the mode/filter into the `<State>_<Behavior>` shape per the naming requirement (e.g. `ModeItemsPurchasesOnly_RendersPurchasesChip`).

### Decision 8: Three discovered sub-proposals record the boundary decisions.

The carve-out deliberately scopes out the filter popovers and the page shells. Per the foundation's "new sub-proposals discovered mid-flight … added as new top-level checkboxes" rule, three checkboxes are appended to `test-coverage/tasks.md` §4: `test-items-price-filter` (existing `items-price-filter` spec), `test-items-store-filter` (no spec yet — creates a `store-filter` family spec or elevates to one), and `test-items-library-shell` (the server/route shells, coordinating with §4.13). Their addition is the canonical record that these files are owned, not forgotten — satisfying governance close-out §7.1 in advance.

**Alternative considered:** absorbing the filter popovers and shells into this carve-out. Rejected — the popovers have their own capability concerns (and `items-price-filter` already has a rich spec this carve-out must not re-own), and the shells bundle DAL/auth/redirect/form-mount concerns owned by §4.9 and §4.13. Absorbing them would couple unrelated failures and exceed the spec's "chrome within `ItemsBrowser`" scope.

## Risks / Trade-offs

- **`ItemsBrowser` transitively renders `Item`** → mock `./Item` to a prop-surfacing stub (Decision 2); assert ids/forwarded props, not card internals.
- **Search-debounce flakiness under real timers** → fake timers + explicit advance, restored in `afterEach` (Decision 5).
- **`filteredSorted` deps-array disable could mask a stale-memo bug** → test the recompute behavior across store/sort/price changes, not the deps array (Decision 6).
- **Chip/filter-count branch matrix is wide** → parameterized matrix over `mode` × filters to reach `branches ≥ 95` (Decision 7); if a branch is genuinely unreachable, dispose via `/* v8 ignore */` + named reason, never by lowering the floor.
- **`ItemsBrowser`/`ItemsToolbar` complexity near-but-under 15** → if apply measures ≥15, the testability/complexity audit extracts the URL-param helper(s) in-place (single-file, behavior-preserved by the new tests) or applies a named per-line disable; the file is never skipped.
- **Over-elevation of the spec** → each of the five ADDED requirements is justified against the three-part elevation test in Decision 3; non-elevated invariants (exact debounce ms, chip-label strings, `firstStoreName` tie-break) are recorded with rationale in tasks.md.

## Migration Plan

Additive: new test files, two config edits (`vitest.config.ts` thresholds, `eslint.config.mjs` overrides), five ADDED spec requirements, one archive-only `testing-foundation` Tier-2 record, three governance checkboxes. No runtime source change unless an audit surfaces a behavior-preserving in-place refactor. Rollback = revert the change; no production code path depends on it.

## Open Questions

- `test-items-store-filter`: does a `store-filter` capability spec exist, or does the discovered sub-proposal create a minimal family spec? Resolved at that sub-proposal's proposal time, not here.
- `test-items-library-shell`: the `redirect()`-on-unauthenticated behavior in `page.tsx` / `ItemsContainer` overlaps §4.13 (server-endpoint authorization). Whether the shell sub-proposal or §4.13 asserts the redirect is a coordination decision deferred to those proposals.
