## ADDED Requirements

### Requirement: list-hero-header capability carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `list-hero-header` capability carve-out — comprising the executable source files `app/(main)/lists/ui/components/ListDetails.tsx`, `app/(main)/lists/ui/components/ShareButton.tsx`, and `app/(main)/lists/ui/components/EditListAction.tsx`, plus the new `resolveListVisibility` export added to `lib/visibility.ts` — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Component/helper test files SHALL live under `__tests__/` directories mirroring their source locations (`app/(main)/lists/ui/components/__tests__/ListDetails.test.tsx`, `ShareButton.test.tsx`, `EditListAction.test.tsx`), run under the jsdom project. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the three carve-out component files via `eslint.config.mjs` per-file overrides. A reusable WCAG contrast helper SHALL exist at `test/helpers/contrast.ts` (with its own test under `test/helpers/__tests__/`), and the `list-hero-header` contrast invariant (R8) SHALL be enforced by an automated test at `app/(main)/lists/ui/styles/__tests__/hero-contrast.test.ts` that reads the gradient and text-color tokens from `app/ui/styles/global.css` and `app/(main)/lists/ui/styles/list.css`. Subsequent sub-proposals that import `ListDetails`, `ShareButton`, or `EditListAction` SHALL inherit the assumption that those modules are tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `ListDetails.tsx`, `ShareButton.tsx`, `EditListAction.tsx`, and the `resolveListVisibility` export in `lib/visibility.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** every per-file threshold entry added by this change references the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of `ListDetails.tsx`, `ShareButton.tsx`, or `EditListAction.tsx` to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/(main)/lists/ui/components/__tests__/ListDetails.test.tsx`, `app/(main)/lists/ui/components/__tests__/ShareButton.test.tsx`, and `app/(main)/lists/ui/components/__tests__/EditListAction.test.tsx`
- **AND** a shared contrast helper exists at `test/helpers/contrast.ts` with a colocated test, and the hero contrast invariant is enforced at `app/(main)/lists/ui/styles/__tests__/hero-contrast.test.ts`

#### Scenario: Contrast invariant is regression-locked against the CSS tokens

- **WHEN** a future change to `app/ui/styles/global.css` or `app/(main)/lists/ui/styles/list.css` lightens the `--hero-gradient` lightest stop or changes a hero text-role color so a role drops below its WCAG AA threshold (3:1 large / 4.5:1 normal) against the worst-case gradient pixel
- **THEN** `hero-contrast.test.ts` fails with an assertion naming the failing role and its computed ratio
- **AND** the `test` pre-merge gate fails

#### Scenario: Elevated invariant is regression-locked

- **WHEN** a future change to `ListDetails.tsx` reintroduces a redundant or empty `.list-hero-share-wrapper` on viewer or preview views
- **THEN** the colocated `ListDetails.test.tsx` fails with an assertion naming the unexpected wrapper element
- **AND** the `test` pre-merge gate fails
