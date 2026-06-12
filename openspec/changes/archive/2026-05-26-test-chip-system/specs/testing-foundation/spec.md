## ADDED Requirements

### Requirement: Chip-system primitive carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The chip-system primitive carve-out — comprising `app/ui/components/chip/Chip.tsx` and `app/ui/components/chip/chipClasses.ts` — SHALL be covered by colocated test files (under `app/ui/components/chip/__tests__/`) meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). `app/ui/components/chip/index.ts` (re-exports only, zero executable statements after TS erasure) SHALL remain excluded from coverage via the existing `app/ui/components/*/index.ts` glob in `vitest.config.ts`'s `coverage.exclude` — no per-file `exclude` entry is added. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for `Chip.tsx` and `chipClasses.ts` via `eslint.config.mjs` `overrides`. Subsequent sub-proposals that import `<Chip>` or `chipClasses` SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows `app/ui/components/chip/Chip.tsx` and `app/ui/components/chip/chipClasses.ts` each at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** both per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: index.ts is excluded from the report

- **WHEN** the coverage report is generated
- **THEN** `app/ui/components/chip/index.ts` does NOT appear as a file with a coverage percentage
- **AND** the existing `app/ui/components/*/index.ts` pattern in `vitest.config.ts`'s `coverage.exclude` is the mechanism (no new per-file exclude entry was added)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits `app/ui/components/chip/Chip.tsx` to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/ui/components/chip/__tests__/Chip.test.tsx` (jsdom project) and `app/ui/components/chip/__tests__/chipClasses.test.ts` (node project)

#### Scenario: aria-label derivation and stopPropagation contracts are regression-locked

- **WHEN** a future change to `Chip.tsx` removes the `typeof children === 'string'` guard so non-string children produce `Remove [object Object]`, OR removes the `e.stopPropagation()` call so the × click bubbles to a parent handler, OR drops the explicit `type="button"` so the chip submits an enclosing form
- **THEN** the colocated test file fails with an assertion naming the missing attribute, missing stopPropagation outcome, or unwanted form-submit
- **AND** the `test` pre-merge gate fails
