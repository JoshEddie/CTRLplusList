## ADDED Requirements

### Requirement: Items-browser-chrome carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `items-browser-chrome` chrome carve-out SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`).

The carve-out comprises twelve executable source files. Six live directly under `app/(main)/items/ui/components/`: `ItemsBrowser.tsx`, `Items.tsx`, `Pagination.tsx`, `PageSizeSelect.tsx`, `itemFilters.ts`, and `paginationConstants.ts`. The seventh original file, `ItemsToolbar.tsx`, exceeded the cognitive-complexity ceiling (measured 32) and was decomposed in-place during apply (complexity audit 9.3) into a co-located `app/(main)/items/ui/components/itemsToolbar/` module — `ItemsToolbar.tsx` (orchestrator), `FiltersSheet.tsx`, `PurchasesSelect.tsx`, `SearchInputControl.tsx` (presentational sub-components), `utils.ts` (pure URL-param / chip / sort helpers), and `toolbarConstants.ts` (label and sort-key tables). The module's `types.ts` is type-only (excluded from coverage via the `**/types.ts` rule) and `index.ts` is a re-export barrel. The bare filename `constants.ts` is avoided because it collides with Node's builtin `constants` module in vite's resolver; the descriptive `toolbarConstants.ts` (paralleling the existing `paginationConstants.ts`) is used instead.

Test files SHALL live under `__tests__/` directories colocated with their source. Under `app/(main)/items/ui/components/__tests__/`: four `.test.tsx` (jsdom — `ItemsBrowser`, `Items`, `Pagination`, `PageSizeSelect`) and two `.test.ts` (node — `itemFilters`, `paginationConstants`). Under `app/(main)/items/ui/components/itemsToolbar/__tests__/`: four `.test.tsx` (jsdom — `ItemsToolbar`, `FiltersSheet`, `PurchasesSelect`, `SearchInputControl`) and one `.test.ts` (node — `utils`).

The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for all twelve executable files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that render `ItemsBrowser`, the `ItemsToolbar` module, `Items`, `Pagination`, or `PageSizeSelect`, or import `compareItems` / `displayPrice` / `firstStoreName` / `DEFAULT_PAGE_SIZE` / `PAGE_SIZE_OPTIONS`, SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

This record is Tier 2 (sub-proposal-archive only) per `test-coverage` design D13: it lives in this sub-proposal's delta directory only, does NOT roll into the parent `test-coverage` accumulator, and does NOT modify the active `openspec/specs/testing-foundation/spec.md`.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `ItemsBrowser.tsx`, `Items.tsx`, `Pagination.tsx`, `PageSizeSelect.tsx`, `itemFilters.ts`, `paginationConstants.ts`, and the `itemsToolbar/` files (`ItemsToolbar.tsx`, `FiltersSheet.tsx`, `PurchasesSelect.tsx`, `SearchInputControl.tsx`, `utils.ts`, `toolbarConstants.ts`) at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** every per-file threshold entry in `vitest.config.ts` references the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the twelve carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/(main)/items/ui/components/__tests__/{ItemsBrowser,Items,Pagination,PageSizeSelect}.test.tsx` and `{itemFilters,paginationConstants}.test.ts`, and at `app/(main)/items/ui/components/itemsToolbar/__tests__/{ItemsToolbar,FiltersSheet,PurchasesSelect,SearchInputControl}.test.tsx` and `utils.test.ts`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `ItemsBrowser.tsx` ORs the filter types instead of ANDing them, drops the non-finite-price exclusion, removes the out-of-range page clamp, or stops resetting `page` on a filter change
- **THEN** the corresponding colocated test in `ItemsBrowser.test.tsx` fails with an assertion naming the specific broken contract
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change renames the `items_page_size` cookie, changes the `{12,24,48,96}` option set, or breaks the `buildRange` windowing / disabled-bounds behavior
- **THEN** the corresponding colocated test (`ItemsBrowser.test.tsx`, `paginationConstants.test.ts`, or `Pagination.test.tsx`) fails with an assertion naming the specific contract break
- **AND** the `test` pre-merge gate fails

#### Scenario: Out-of-carve-out children are mocked, not co-owned

- **WHEN** `ItemsBrowser.test.tsx` / `Items.test.tsx` render the grid, or the `ItemsToolbar` module tests render the toolbar
- **THEN** `Item`, `PriceFilterPopover`, and `StoreFilterPopover` are module-mocked (they belong to other carve-outs), while the in-carve-out children and the already-tested primitives render for real
- **AND** no coverage credit for those out-of-carve-out files is claimed by this sub-proposal
