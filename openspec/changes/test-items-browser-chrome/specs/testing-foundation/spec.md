## ADDED Requirements

### Requirement: Items-browser-chrome carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `items-browser-chrome` chrome carve-out — comprising the seven executable source files `app/(main)/items/ui/components/ItemsBrowser.tsx`, `app/(main)/items/ui/components/ItemsToolbar.tsx`, `app/(main)/items/ui/components/Items.tsx`, `app/(main)/items/ui/components/Pagination.tsx`, `app/(main)/items/ui/components/PageSizeSelect.tsx`, `app/(main)/items/ui/components/itemFilters.ts`, and `app/(main)/items/ui/components/paginationConstants.ts` — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live under `app/(main)/items/ui/components/__tests__/` mirroring their source: five `.test.tsx` under the jsdom project (`ItemsBrowser`, `ItemsToolbar`, `Items`, `Pagination`, `PageSizeSelect`) and two `.test.ts` under the node project (`itemFilters`, `paginationConstants`). The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for all seven executable files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that render `ItemsBrowser`, `ItemsToolbar`, `Items`, `Pagination`, or `PageSizeSelect`, or import `compareItems` / `displayPrice` / `firstStoreName` / `DEFAULT_PAGE_SIZE` / `PAGE_SIZE_OPTIONS`, SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

This record is Tier 2 (sub-proposal-archive only) per `test-coverage` design D13: it lives in this sub-proposal's delta directory only, does NOT roll into the parent `test-coverage` accumulator, and does NOT modify the active `openspec/specs/testing-foundation/spec.md`.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `ItemsBrowser.tsx`, `ItemsToolbar.tsx`, `Items.tsx`, `Pagination.tsx`, `PageSizeSelect.tsx`, `itemFilters.ts`, and `paginationConstants.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all seven per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the seven carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/(main)/items/ui/components/__tests__/ItemsBrowser.test.tsx`, `ItemsToolbar.test.tsx`, `Items.test.tsx`, `Pagination.test.tsx`, `PageSizeSelect.test.tsx`, `itemFilters.test.ts`, and `paginationConstants.test.ts`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `ItemsBrowser.tsx` ORs the filter types instead of ANDing them, drops the non-finite-price exclusion, removes the out-of-range page clamp, or stops resetting `page` on a filter change
- **THEN** the corresponding colocated test in `ItemsBrowser.test.tsx` fails with an assertion naming the specific broken contract
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change renames the `items_page_size` cookie, changes the `{12,24,48,96}` option set, or breaks the `buildRange` windowing / disabled-bounds behavior
- **THEN** the corresponding colocated test (`ItemsBrowser.test.tsx`, `paginationConstants.test.ts`, or `Pagination.test.tsx`) fails with an assertion naming the specific contract break
- **AND** the `test` pre-merge gate fails

#### Scenario: Out-of-carve-out children are mocked, not co-owned

- **WHEN** `ItemsBrowser.test.tsx` / `Items.test.tsx` render the grid, or `ItemsToolbar.test.tsx` renders the toolbar
- **THEN** `Item`, `PriceFilterPopover`, and `StoreFilterPopover` are module-mocked (they belong to other carve-outs), while the in-carve-out children and the already-tested primitives render for real
- **AND** no coverage credit for those out-of-carve-out files is claimed by this sub-proposal
