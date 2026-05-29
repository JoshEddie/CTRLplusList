## ADDED Requirements

### Requirement: App-frame capability carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `app-frame` capability carve-out — comprising the seven executable source files `app/ui/components/AppFrame.tsx`, `app/ui/components/AppNav.tsx`, `app/ui/components/AppMenu.tsx`, `app/ui/components/AppLogo.tsx`, `app/ui/components/Logo.tsx`, `app/ui/components/Header.tsx`, `app/ui/components/Nav.tsx`, and `app/ui/hooks/useKeyboardOffset.ts` — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live under `__tests__/` directories mirroring their source file locations: seven under `app/ui/components/__tests__/` (`AppFrame.test.tsx`, `AppNav.test.tsx`, `AppMenu.test.tsx`, `AppLogo.test.tsx`, `Logo.test.tsx`, `Header.test.tsx`, `Nav.test.tsx`) and one under `app/ui/hooks/__tests__/` (`useKeyboardOffset.test.tsx`). All tests run under the jsdom project. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for all seven executable files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import `<AppFrame>`, `<AppNav>`, `<AppMenu>`, `<AppLogo>`, `<Logo>`, `<Header>`, `<Nav>`, or `useKeyboardOffset` SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `AppFrame.tsx`, `AppNav.tsx`, `AppMenu.tsx`, `AppLogo.tsx`, `Logo.tsx`, `Header.tsx`, `Nav.tsx`, and `useKeyboardOffset.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all seven per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the seven carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/ui/components/__tests__/AppFrame.test.tsx`, `app/ui/components/__tests__/AppNav.test.tsx`, `app/ui/components/__tests__/AppMenu.test.tsx`, `app/ui/components/__tests__/AppLogo.test.tsx`, `app/ui/components/__tests__/Logo.test.tsx`, `app/ui/components/__tests__/Header.test.tsx`, `app/ui/components/__tests__/Nav.test.tsx`, and `app/ui/hooks/__tests__/useKeyboardOffset.test.tsx`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `AppNav.tsx` removes any of the three mobile-menu dismissal triggers (route-change auto-close, outside-`mousedown` close, Escape close), broadens the dismissal listener attachment from `open`-scoped to always-on, or drops the `/lists/bookmarks` / `/lists/history` peer-route exclusion from the Lists-pill match
- **THEN** the corresponding colocated test in `AppNav.test.tsx` fails with an assertion naming the specific missing trigger, broadened scope, or restored false-positive activation
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change to `useKeyboardOffset.ts` renames the `--keyboard-offset` CSS variable, retargets it from `document.documentElement` to another element, drops the RAF coalescing, or drops the cleanup-on-disable behavior
- **THEN** the corresponding colocated test in `useKeyboardOffset.test.tsx` fails with an assertion naming the specific contract break
- **AND** the `test` pre-merge gate fails
