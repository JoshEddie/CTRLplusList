## ADDED Requirements

### Requirement: User-actions carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The user-account server-actions carve-out — comprising the single source file `app/actions/user.ts` and its two exported server actions `signInUser` and `signOutUser` — SHALL be covered by a colocated test file meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). The test file SHALL live at `app/actions/__tests__/user.test.ts` and run under the node vitest project (the source is a `.ts` module with no DOM surface). The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for `app/actions/user.ts` via an `eslint.config.mjs` per-file override. The per-file threshold entry in `vitest.config.ts` SHALL reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation).

This record is archive-only (Tier 2 per the `test-coverage` design D13 two-tier rollup): it does NOT roll into the parent `test-coverage` accumulator at `openspec/changes/test-coverage/specs/testing-foundation/spec.md` and does NOT modify the active `openspec/specs/testing-foundation/spec.md`.

#### Scenario: Carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows `app/actions/user.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** the per-file threshold entry in `vitest.config.ts` for `app/actions/user.ts` references the shared `COVERAGE_FLOOR` constant

#### Scenario: Complexity ceiling fails lint in the carve-out file

- **WHEN** a contributor edits `app/actions/user.ts` to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out test lives in `__tests__/`

- **WHEN** a contributor opens `app/actions/user.ts`
- **THEN** a test file exists at `app/actions/__tests__/user.test.ts`

#### Scenario: Tested invariants are regression-locked

- **WHEN** a future change to `app/actions/user.ts` alters `signInUser` to use a provider other than `'google'` or to pass a second argument to `signIn`
- **THEN** the colocated test in `user.test.ts` fails with an assertion naming the expected `signIn('google')` single-argument call
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change alters `signOutUser` to drop `{ redirect: false }` from the `signOut` call, change the post-sign-out `redirect` target away from `/sign-in`, or invoke `redirect` before `signOut`
- **THEN** the colocated test fails with an assertion naming the specific contract break (the `signOut` options object, the `/sign-in` target, or the `signOut`-before-`redirect` ordering)
- **AND** the `test` pre-merge gate fails
