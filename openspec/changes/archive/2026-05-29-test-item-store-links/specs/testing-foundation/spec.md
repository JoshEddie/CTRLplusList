## ADDED Requirements

### Requirement: item-store-links capability carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `item-store-links` capability carve-out — comprising the single executable source file `app/(main)/items/ui/components/StoreLinks.tsx` — SHALL be covered by a colocated test file meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). The test file SHALL live at `app/(main)/items/ui/components/__tests__/StoreLinks.test.tsx` and run under the jsdom project. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for `StoreLinks.tsx` via an `eslint.config.mjs` per-file override. Subsequent sub-proposals that render `<StoreLinks>` (e.g. through `Item.tsx` in the items-browser-chrome and list-item-management flows) SHALL inherit the assumption that the module is tested and complexity-locked, and any future raise of its cognitive complexity above 15 SHALL fail lint. There are no store-specific reads (DAL/server-action) in this carve-out: `item.stores` is populated upstream by item reads owned by other capability flows.

#### Scenario: The carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows `app/(main)/items/ui/components/StoreLinks.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** the per-file threshold entry in `vitest.config.ts` references the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in the carve-out file

- **WHEN** a contributor edits `StoreLinks.tsx` to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out test lives in `__tests__/`

- **WHEN** a contributor opens `app/(main)/items/ui/components/StoreLinks.tsx`
- **THEN** a test file exists at `app/(main)/items/ui/components/__tests__/StoreLinks.test.tsx`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `StoreLinks.tsx` relaxes the store-validity predicate (allowing stores without a name, without a link, or with a non-numeric price), drops the no-valid-store `children`-in-`.item-action-row` / `null` fallback, or removes the `stopPropagation` calls on the primary buy-link or the `+N` trigger
- **THEN** the corresponding colocated test in `StoreLinks.test.tsx` fails with an assertion naming the specific contract break
- **AND** the `test` pre-merge gate fails
