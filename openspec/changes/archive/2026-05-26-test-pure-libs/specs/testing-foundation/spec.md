## ADDED Requirements

### Requirement: Pure-libs carve-out SHALL be tested at the 95% per-file floor with complexity locked at error

The pure-libs carve-out — comprising `lib/visibility.ts`, `lib/listAccess.ts`, `hooks/use-media-query.ts`, and `app/ui/components/button/buttonClasses.ts` — SHALL be covered by colocated test files meeting the testing-foundation `Pure logic` per-file floor of 95% line coverage. `lib/types.ts` is type-only (zero executable statements after TS erasure) and SHALL be added to `vitest.config.ts`'s `coverage.exclude` patterns so the report is unambiguous. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the four carve-out files via `eslint.config.mjs` `overrides`. Subsequent sub-proposals that import from any of these four files SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets its 95% floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows `lib/visibility.ts`, `lib/listAccess.ts`, `hooks/use-media-query.ts`, and `app/ui/components/button/buttonClasses.ts` each at 95% line coverage or higher
- **AND** the gate passes

#### Scenario: Type-only file is excluded from the report

- **WHEN** the coverage report is generated
- **THEN** `lib/types.ts` does NOT appear as a file with a coverage percentage
- **AND** `vitest.config.ts`'s `coverage.exclude` list includes `lib/types.ts`

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits `lib/listAccess.ts` to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live colocated

- **WHEN** a contributor opens the carve-out source files
- **THEN** a `*.test.ts` (for `.ts` source) or `*.test.tsx` (for jsdom-requiring source) file exists alongside each one — at `lib/visibility.test.ts`, `lib/listAccess.test.ts`, `hooks/use-media-query.test.tsx`, and `app/ui/components/button/buttonClasses.test.ts`
