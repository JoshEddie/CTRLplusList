## ADDED Requirements

### Requirement: Misc-primitives carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The misc-primitives carve-out — comprising the executable components at `app/ui/components/ConfirmDialog.tsx`, `app/ui/components/TooltipWrapper.tsx`, `app/ui/components/Empty.tsx`, and `app/ui/components/FormShell.tsx` (which exports both `FormShell` and `FormShellFooter` plus the internal `useDismiss` hook) — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live at `app/ui/components/__tests__/ConfirmDialog.test.tsx`, `app/ui/components/__tests__/TooltipWrapper.test.tsx`, `app/ui/components/__tests__/Empty.test.tsx`, and `app/ui/components/__tests__/FormShell.test.tsx` (all jsdom project). The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the four executable files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import `<ConfirmDialog>`, `<TooltipWrapper>`, `<Empty>`, `<FormShell>`, `<FormShellFooter>`, or `useDismiss` SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint. This carve-out's `testing-foundation` delta is Tier 2 per `test-coverage` design D13 — it does NOT roll into the parent's `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md`.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `ConfirmDialog.tsx`, `TooltipWrapper.tsx`, `Empty.tsx`, and `FormShell.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all four per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Carve-out tests live in __tests__

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/ui/components/__tests__/ConfirmDialog.test.tsx`, `app/ui/components/__tests__/TooltipWrapper.test.tsx`, `app/ui/components/__tests__/Empty.test.tsx`, and `app/ui/components/__tests__/FormShell.test.tsx`

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the four carve-out files to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: New family specs are active after archive

- **WHEN** this sub-proposal archives
- **THEN** the four new active specs exist at `openspec/specs/confirm-dialog-system/spec.md`, `openspec/specs/tooltip-system/spec.md`, `openspec/specs/empty-state-system/spec.md`, and `openspec/specs/form-shell-system/spec.md`
- **AND** each spec has a Purpose paragraph written (not "TBD")
- **AND** each spec's SHALLs are regression-locked by ≥ 1 colocated `<State>_<Behavior>` test in the corresponding test file

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change to any of the four carve-out files alters a SHALL-locked behavior — including (but not limited to): removes the `isOpen` short-circuit from `<ConfirmDialog>`; changes the Cancel or Confirm variant; breaks the Confirm-then-onClose call order; alters the `tooltip-container` wrapper-class trailing-space; renders the tooltip span unconditionally; emits a different title or description for `type === 'purchase'`; changes the `<Empty>` CTA branch selection; renders the wrong inner-class variant in `<FormShell>`; removes the overlay-self-target dismiss guard; alters the `useDismiss` three-branch priority (onClose → router.back if history > 1 → router.push closeHref); detaches the `isPending` → `isLoading` passthrough on `<FormShellFooter>`'s Submit
- **THEN** the corresponding colocated test file fails with an assertion naming the specific divergence
- **AND** the `test` pre-merge gate fails
