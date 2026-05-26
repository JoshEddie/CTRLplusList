## ADDED Requirements

### Requirement: Button-system primitive carve-out SHALL be tested at the 90% per-file floor with complexity locked at error

The button-system primitive carve-out — comprising `app/ui/components/button/Button.tsx` and `app/ui/components/button/LinkButton.tsx` — SHALL be covered by colocated test files meeting the testing-foundation `Primitive components` per-file floor of 90% line coverage. `app/ui/components/button/types.ts` (type-only) and `app/ui/components/button/index.ts` (re-exports only, zero executable statements after TS erasure) SHALL be added to `vitest.config.ts`'s `coverage.exclude` patterns so the report is unambiguous. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for `Button.tsx` and `LinkButton.tsx` via `eslint.config.mjs` `overrides`. Subsequent sub-proposals that import `<Button>` or `<LinkButton>` SHALL inherit the assumption that those components are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets its 90% floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows `app/ui/components/button/Button.tsx` and `app/ui/components/button/LinkButton.tsx` each at 90% line coverage or higher
- **AND** the gate passes

#### Scenario: Type-only and re-export files are excluded from the report

- **WHEN** the coverage report is generated
- **THEN** neither `app/ui/components/button/types.ts` nor `app/ui/components/button/index.ts` appears as a file with a coverage percentage
- **AND** `vitest.config.ts`'s `coverage.exclude` list includes both paths

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits `app/ui/components/button/Button.tsx` to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live colocated

- **WHEN** a contributor opens the carve-out source files
- **THEN** a `*.test.tsx` file exists inside the colocated `__tests__/` directory — at `app/ui/components/button/__tests__/Button.test.tsx` and `app/ui/components/button/__tests__/LinkButton.test.tsx`

#### Scenario: Loading-state and toggle-state contracts are regression-locked

- **WHEN** a future change to `Button.tsx` removes the `aria-busy` translation when `isLoading={true}`, OR removes the `pressed === undefined ? undefined : pressed` ternary so `pressed={false}` no longer emits `aria-pressed="false"`
- **THEN** the colocated test file fails with an assertion naming the missing attribute
- **AND** the `test` pre-merge gate fails
