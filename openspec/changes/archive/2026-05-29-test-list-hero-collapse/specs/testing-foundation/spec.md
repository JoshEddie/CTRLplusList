## ADDED Requirements

### Requirement: list-hero-collapse capability carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `list-hero-collapse` capability carve-out — comprising the five executable source files `app/(main)/lists/ui/components/HeroCollapseShell.tsx`, `app/(main)/lists/ui/components/HeroCollapsedItems.tsx`, `app/(main)/lists/ui/components/HeroCollapsedItemsContainer.tsx`, `app/(main)/lists/ui/components/ListActionsMenu.tsx`, and `app/(main)/lists/ui/components/visibility-rows.tsx` — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live under `__tests__/` directories mirroring their source file locations: all five under `app/(main)/lists/ui/components/__tests__/` (`HeroCollapseShell.test.tsx`, `HeroCollapsedItems.test.tsx`, `HeroCollapsedItemsContainer.test.tsx`, `ListActionsMenu.test.tsx`, `visibility-rows.test.tsx`). All tests run under the jsdom project. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for all five executable files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that compose `<HeroCollapseShell>`, the `HeroCollapsedItems` factories, `<HeroCollapsedOwnerItems>`/`<HeroCollapsedViewerItems>`, `<ListActionsMenu>`, or the `VISIBILITY_ROWS` table SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint. This record is archive-only (Tier 2 per `test-coverage` design D13); it does NOT roll into the parent `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md`.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `HeroCollapseShell.tsx`, `HeroCollapsedItems.tsx`, `HeroCollapsedItemsContainer.tsx`, `ListActionsMenu.tsx`, and `visibility-rows.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all five per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the five carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/(main)/lists/ui/components/__tests__/HeroCollapseShell.test.tsx`, `app/(main)/lists/ui/components/__tests__/HeroCollapsedItems.test.tsx`, `app/(main)/lists/ui/components/__tests__/HeroCollapsedItemsContainer.test.tsx`, `app/(main)/lists/ui/components/__tests__/ListActionsMenu.test.tsx`, and `app/(main)/lists/ui/components/__tests__/visibility-rows.test.tsx`

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to `HeroCollapseShell.tsx` removes the collapsed-strip `onKeyDown` handler, drops the `role="button"`/`tabIndex={0}` focusability, swaps `window.history.replaceState` for `pushState`/`router.push`, or stops removing the `hero` param on expand
- **THEN** the corresponding colocated test in `HeroCollapseShell.test.tsx` fails with an assertion naming the specific contract break (keyboard activation, focusability, history pollution, or stale param)
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change to `ListActionsMenu.tsx` stops suppressing owner-only items when `isOwner === false`, or stops rendering `prependedItems` at the top of the menu
- **THEN** the corresponding colocated test in `ListActionsMenu.test.tsx` fails with an assertion naming the leaked owner item or the wrong prepend order
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change to `HeroCollapsedItemsContainer.tsx` drops the block-gating that suppresses the Follow row when either party blocks the other
- **THEN** the corresponding colocated test in `HeroCollapsedItemsContainer.test.tsx` fails with an assertion naming the un-gated Follow row
- **AND** the `test` pre-merge gate fails
