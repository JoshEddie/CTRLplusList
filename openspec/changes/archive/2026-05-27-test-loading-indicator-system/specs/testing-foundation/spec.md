## ADDED Requirements

### Requirement: Loading-indicator-system primitive carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The loading-indicator-system primitive carve-out — comprising the executable component at `app/ui/components/LoadingIndicator.tsx` — SHALL be covered by a colocated test file meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). The test file SHALL live at `app/ui/components/__tests__/LoadingIndicator.test.tsx` (jsdom project). `app/ui/components/loading-indicator.css` (CSS) SHALL NOT appear in the JS coverage report — CSS files are not measured by v8 coverage. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the file via `eslint.config.mjs` per-file override. Subsequent sub-proposals that import `<LoadingIndicator>` SHALL inherit the assumption that the module is tested and complexity-locked, and any future raise of complexity above 15 in the file SHALL fail lint.

#### Scenario: Carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows `LoadingIndicator.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** the per-file threshold entry in `vitest.config.ts` references the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: CSS file is excluded from the JS coverage report

- **WHEN** the coverage report is generated
- **THEN** `app/ui/components/loading-indicator.css` does NOT appear as a file with a coverage percentage (CSS is not part of v8 JS coverage measurement)

#### Scenario: Complexity ceiling fails lint in the carve-out file

- **WHEN** a contributor edits `app/ui/components/LoadingIndicator.tsx` to raise the function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out test lives in `__tests__/`

- **WHEN** a contributor opens the carve-out source file
- **THEN** a colocated test file exists at `app/ui/components/__tests__/LoadingIndicator.test.tsx`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `LoadingIndicator.tsx` drops the base `'loading-indicator'` token from the outer `className`, merges the base and variant tokens into a single hyphen-joined class, reorders the tokens, accepts and forwards a `className` prop, replaces the spinner or label `<span>` with a different element type, reverses the child order, drops `aria-hidden="true"` from the spinner, or replaces the U+2026 ellipsis character in the label with three ASCII dots
- **THEN** the colocated test file fails with an assertion naming the specific token, element type, attribute value, child order, or text-content regression
- **AND** the `test` pre-merge gate fails
