## ADDED Requirements

### Requirement: Form-field-system primitive carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The form-field-system primitive carve-out — comprising the ten executable component files at `app/ui/components/field/`: `FormField.tsx`, `TextField.tsx`, `TextareaField.tsx`, `SelectField.tsx`, `DateField.tsx`, `DatalistField.tsx`, `PriceField.tsx`, `SearchField.tsx`, `CheckboxField.tsx`, and `FieldError.tsx` — SHALL be covered by colocated test files (under `app/ui/components/field/__tests__/`) meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). One `.test.tsx` SHALL exist per executable component file, running under the jsdom project. `app/ui/components/field/index.ts` (re-exports only) SHALL remain excluded from coverage via the existing `app/ui/components/*/index.ts` glob in `vitest.config.ts`'s `coverage.exclude` (no per-file `exclude` entry is added). `app/ui/components/field/types.ts` (type-only, zero runtime content) SHALL be implicitly excluded by having no executable output. `app/ui/components/field/field-icons.tsx` (a constant data table of pre-built `aria-hidden` icon ReactNodes; no executable function) SHALL be excluded by a new explicit entry in `vitest.config.ts`'s `coverage.exclude` with a one-line comment naming this carve-out's design Decision 2. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the ten executable files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import any `form-field-system` primitive (`<FormField>`, `<TextField>`, `<TextareaField>`, `<SelectField>`, `<DateField>`, `<DatalistField>`, `<PriceField>`, `<SearchField>`, `<CheckboxField>`, `<FieldError>`) SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of the ten executable field component files at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all ten per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: index.ts and types.ts are excluded from the report

- **WHEN** the coverage report is generated
- **THEN** `app/ui/components/field/index.ts` does NOT appear as a file with a coverage percentage (excluded via the existing `app/ui/components/*/index.ts` glob)
- **AND** `app/ui/components/field/types.ts` does NOT appear (type-only file has no runtime content to measure)

#### Scenario: field-icons.tsx is explicitly excluded as a constant data table

- **WHEN** the coverage report is generated
- **THEN** `app/ui/components/field/field-icons.tsx` does NOT appear as a file with a coverage percentage
- **AND** `vitest.config.ts`'s `coverage.exclude` contains an entry for `app/ui/components/field/field-icons.tsx` accompanied by a one-line comment naming the design decision (D2 of test-form-field-system)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the ten executable field component files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist under `app/ui/components/field/__tests__/`, one `.test.tsx` per executable source file

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `FormField.tsx` removes the `Children.only` call OR removes the `displayName && !KNOWN_CHILD_DISPLAY_NAMES.has(displayName)` dev warning, OR a change to `PriceField.tsx` drops the trailing-`-` `isNegative`-clearing branch, OR a change to `SearchField.tsx` reorders the trailing-slot decision so the auto clear button wins over a provided `trailing` ReactNode
- **THEN** the corresponding colocated test file fails with an assertion naming the specific missing branch, missing warning, or wrong-precedence outcome
- **AND** the `test` pre-merge gate fails
