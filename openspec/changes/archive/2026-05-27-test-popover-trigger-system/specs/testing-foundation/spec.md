## ADDED Requirements

### Requirement: Popover-trigger-system primitive carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The popover-trigger-system primitive carve-out — comprising the executable component at `app/ui/components/popover-trigger/PopoverTrigger.tsx`, the pure helper at `app/ui/components/popover-trigger/triggerClasses.ts`, and the component-scoped hook at `app/ui/hooks/usePopoverDismiss.ts` — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live under `__tests__/` directories mirroring their source file locations: `app/ui/components/popover-trigger/__tests__/PopoverTrigger.test.tsx` (jsdom project) and `app/ui/components/popover-trigger/__tests__/triggerClasses.test.ts` (node project) for the family directory; `app/ui/hooks/__tests__/usePopoverDismiss.test.tsx` (jsdom project, since the hook uses `document.addEventListener`) for the hook. `app/ui/components/popover-trigger/index.ts` (re-exports only) SHALL remain excluded from coverage via the existing `app/ui/components/*/index.ts` glob in `vitest.config.ts`'s `coverage.exclude` — no per-file `exclude` entry is added. `app/ui/components/popover-trigger/types.ts` (type-only) SHALL be implicitly excluded by having no executable output. `app/ui/components/popover-trigger/popover-trigger.css` (CSS) SHALL NOT appear in the JS coverage report. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the three files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import `<PopoverTrigger>`, `triggerClasses`, or `usePopoverDismiss` SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `PopoverTrigger.tsx`, `triggerClasses.ts`, and `usePopoverDismiss.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all three per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: index.ts and types.ts are excluded from the report

- **WHEN** the coverage report is generated
- **THEN** `app/ui/components/popover-trigger/index.ts` does NOT appear as a file with a coverage percentage (excluded via the existing `app/ui/components/*/index.ts` glob)
- **AND** `app/ui/components/popover-trigger/types.ts` does NOT appear (type-only file has no runtime content to measure)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the three popover-trigger carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/ui/components/popover-trigger/__tests__/PopoverTrigger.test.tsx`, `app/ui/components/popover-trigger/__tests__/triggerClasses.test.ts`, and `app/ui/hooks/__tests__/usePopoverDismiss.test.tsx`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `PopoverTrigger.tsx` drops the `count !== undefined && count > 0` zero-suppression half of the count-badge gate OR drops the chevron `aria-hidden="true"` attribute, OR a change to `triggerClasses.ts` reorders the token composition so `active` precedes `tone-on-dark` or `extra` precedes `active`, OR a change to `usePopoverDismiss.ts` drops the `ref.current &&` half of the outside-click composite
- **THEN** the corresponding colocated test file fails with an assertion naming the specific missing branch, missing attribute, wrong-position token, or unguarded ref call
- **AND** the `test` pre-merge gate fails
