## ADDED Requirements

### Requirement: Segmented-control-system primitive carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The segmented-control-system primitive carve-out — comprising the executable components at `app/ui/components/segmented-control/SegmentedControl.tsx` and `app/ui/components/segmented-control/SegmentedOption.tsx`, and the pure helper module at `app/ui/components/segmented-control/segmentedClasses.ts` (exporting `segmentedGroupClasses` and `segmentedOptionClasses`) — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live under `__tests__/` directories mirroring their source file locations: `app/ui/components/segmented-control/__tests__/SegmentedControl.test.tsx` (jsdom project), `app/ui/components/segmented-control/__tests__/SegmentedOption.test.tsx` (jsdom project), and `app/ui/components/segmented-control/__tests__/segmentedClasses.test.ts` (node project). `app/ui/components/segmented-control/index.ts` (re-exports only) SHALL remain excluded from coverage via the existing `app/ui/components/*/index.ts` glob in `vitest.config.ts`'s `coverage.exclude` — no per-file `exclude` entry is added. `app/ui/components/segmented-control/types.ts` (type-only) SHALL be implicitly excluded by having no executable output. `app/ui/components/segmented-control/segmented-control.css` (CSS) SHALL NOT appear in the JS coverage report. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the three executable files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import `<SegmentedControl>`, `<SegmentedOption>`, `useSegmentedContext`, `segmentedGroupClasses`, or `segmentedOptionClasses` SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `SegmentedControl.tsx`, `SegmentedOption.tsx`, and `segmentedClasses.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all three per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: index.ts and types.ts are excluded from the report

- **WHEN** the coverage report is generated
- **THEN** `app/ui/components/segmented-control/index.ts` does NOT appear as a file with a coverage percentage (excluded via the existing `app/ui/components/*/index.ts` glob)
- **AND** `app/ui/components/segmented-control/types.ts` does NOT appear (type-only file has no runtime content to measure)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the three segmented-control carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/ui/components/segmented-control/__tests__/SegmentedControl.test.tsx`, `app/ui/components/segmented-control/__tests__/SegmentedOption.test.tsx`, and `app/ui/components/segmented-control/__tests__/segmentedClasses.test.ts`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `segmentedClasses.ts` drops the always-emit-tone behavior of `segmentedGroupClasses` (e.g. by making `tone-light` conditional like `triggerClasses`) OR reorders the token composition of either function, OR a change to `SegmentedControl.tsx` removes the descriptive throw from `useSegmentedContext`, broadens the keydown listener scope from the container to `document`/`window`, or changes the effect deps from `[onChange]` to `[]` or `[onChange, value]`
- **THEN** the corresponding colocated test file fails with an assertion naming the specific missing tone token, wrong-position token, missing throw, broadened listener scope, or unexpected re-attachment
- **AND** the `test` pre-merge gate fails
