## ADDED Requirements

### Requirement: List-collections page-UI carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `list-collections` page-UI carve-out — comprising the four source files `app/ui/components/ListCard.tsx`, `app/ui/components/ListCardRow.tsx`, `app/ui/components/MoreCard.tsx`, and `app/ui/components/ListCollectionsNav.tsx` — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live under `app/ui/components/__tests__/` mirroring their source locations: `ListCard.test.tsx`, `ListCardRow.test.tsx`, `MoreCard.test.tsx`, and `ListCollectionsNav.test.tsx`. All tests run under the jsdom project. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for all four files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import `<ListCard>`, `<ListCardRow>`, `<MoreCard>`, or `<ListCollectionsNav>` SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `ListCard.tsx`, `ListCardRow.tsx`, `MoreCard.tsx`, and `ListCollectionsNav.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all four per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the four carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/ui/components/__tests__/ListCard.test.tsx`, `app/ui/components/__tests__/ListCardRow.test.tsx`, `app/ui/components/__tests__/MoreCard.test.tsx`, and `app/ui/components/__tests__/ListCollectionsNav.test.tsx`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `ListCard.tsx` drops the `timeZone: 'UTC'` date-formatting option, removes the `aria-hidden` subtitle placeholder, removes the `aria-label="Bookmarked"` from the bookmark indicator, or broadens the `showOwner && list.user?.name` byline gating
- **THEN** the corresponding colocated test in `ListCard.test.tsx` fails with an assertion naming the specific contract break
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change to `ListCardRow.tsx` renders the "+N more" affordance without requiring both a positive count and a see-all href, or drops the `role="list"` / `role="listitem"` semantics or the empty-state branch
- **THEN** the corresponding colocated test in `ListCardRow.test.tsx` fails
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change to `ListCollectionsNav.tsx` changes the tab set, the exact-match active rule, or the `.list-collections-actions` slot behavior
- **THEN** the corresponding colocated test in `ListCollectionsNav.test.tsx` fails
- **AND** the `test` pre-merge gate fails
