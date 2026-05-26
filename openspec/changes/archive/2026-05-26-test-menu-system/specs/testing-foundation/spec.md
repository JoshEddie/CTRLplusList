## ADDED Requirements

### Requirement: Menu-system primitive carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The menu-system primitive carve-out — comprising the four executable component files at `app/ui/components/menu/`: `Menu.tsx`, `MenuItem.tsx`, `MenuItemRadio.tsx`, `MenuLinkItem.tsx`, plus the pure helper `menuClasses.ts` — SHALL be covered by colocated test files (under `app/ui/components/menu/__tests__/`) meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). One `.test.tsx` SHALL exist per executable component file, running under the jsdom project; one `.test.ts` SHALL exist for `menuClasses.ts`, running under the node project. `app/ui/components/menu/index.ts` (re-exports only, zero executable statements after TS erasure) SHALL remain excluded from coverage via the existing `app/ui/components/*/index.ts` glob in `vitest.config.ts`'s `coverage.exclude` — no per-file `exclude` entry is added. `app/ui/components/menu/types.ts` (type-only, a single exported union with zero runtime content) SHALL be implicitly excluded by having no executable output. `app/ui/components/menu/menu.css` (CSS) SHALL NOT appear in the JS coverage report. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the five files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import any `menu-system` primitive (`<Menu>`, `<MenuItem>`, `<MenuLinkItem>`, `<MenuItemRadio>`, `menuItemClasses`) SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `Menu.tsx`, `MenuItem.tsx`, `MenuItemRadio.tsx`, `MenuLinkItem.tsx`, and `menuClasses.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all five per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: index.ts and types.ts are excluded from the report

- **WHEN** the coverage report is generated
- **THEN** `app/ui/components/menu/index.ts` does NOT appear as a file with a coverage percentage (excluded via the existing `app/ui/components/*/index.ts` glob)
- **AND** `app/ui/components/menu/types.ts` does NOT appear (type-only file has no runtime content to measure)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the five menu carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist under `app/ui/components/menu/__tests__/`: four `.test.tsx` files (one per executable component, running under jsdom) and one `.test.ts` file (`menuClasses.test.ts`, running under node)

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `Menu.tsx` drops the `anchorRef?.current?.contains(target)` early-return in the outside-click handler OR drops the `{ preventScroll: true }` argument on the initial-focus call, OR a change to `MenuItemRadio.tsx` reorders the click handler so `onSelect` runs before `onClick` OR drops the `defaultPrevented` short-circuit, OR a change to `menuClasses.ts` reorders the token composition so `extra` precedes `tone-danger`
- **THEN** the corresponding colocated test file fails with an assertion naming the specific missing branch, missing focus option, wrong-order call, or wrong-position token
- **AND** the `test` pre-merge gate fails
