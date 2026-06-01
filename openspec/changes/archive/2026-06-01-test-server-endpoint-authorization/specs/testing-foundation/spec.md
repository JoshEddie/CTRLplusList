## ADDED Requirements

### Requirement: Server-endpoint-authorization carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The server-endpoint-authorization carve-out — comprising the five executable source files `app/actions/lists.ts`, `app/actions/items.ts`, `app/actions/follows.ts`, `app/actions/user.ts`, and `app/api/image-search/route.ts` — SHALL be covered by colocated test files meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). Test files SHALL live under `__tests__/` directories mirroring their source file locations: four under `app/actions/__tests__/` (`lists.test.ts`, `items.test.ts`, `follows.test.ts`, `user.test.ts`) and one under `app/api/image-search/__tests__/` (`route.test.ts`). All five run under the **node** project (`.test.ts`), as DB-integration tests against a real pglite-backed database; `@/lib/auth` (NextAuth) and the image-search upstream provider `fetch` are mocked as network boundaries, while internal modules (`lib/dal`, `lib/listAccess`, `lib/sqlstate`, `lib/visibility`) run real. The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for all five files via `eslint.config.mjs` per-file overrides (with any justified per-line disables carrying a reason comment). Subsequent sub-proposals that invoke any of these server actions or the image-search route SHALL inherit the assumption that those modules are authorization-tested and complexity-locked, and any future raise of complexity above 15 in those files SHALL fail lint.

This is a Tier 2 carve-out bookkeeping record per the parent `test-coverage` change's design D13 two-tier rollup: it lives ONLY in this sub-proposal's archive directory and does NOT roll into the parent `test-coverage` accumulator, nor does it modify the active `openspec/specs/testing-foundation/spec.md`.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `app/actions/lists.ts`, `app/actions/items.ts`, `app/actions/follows.ts`, `app/actions/user.ts`, and `app/api/image-search/route.ts` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** the gate passes
- **AND** all five per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any of the five carve-out files to raise a function's cognitive complexity to 16 without a justified per-line disable
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Carve-out tests live in `__tests__/`

- **WHEN** a contributor opens the carve-out source files
- **THEN** test files exist at `app/actions/__tests__/lists.test.ts`, `app/actions/__tests__/items.test.ts`, `app/actions/__tests__/follows.test.ts`, `app/actions/__tests__/user.test.ts`, and `app/api/image-search/__tests__/route.test.ts`

#### Scenario: Caller-class authorization is regression-locked

- **WHEN** a future change to any covered action removes or weakens its ownership check (so an authenticated non-owner can mutate another user's resource), drops the `auth()` rejection on the unauthenticated path, or calls `updateTag(...)` on a rejected request
- **THEN** the corresponding colocated test fails with an assertion naming the specific broken caller-class guarantee (owner / authenticated non-owner / unauthenticated) — including the DB-row-unchanged and `updateTag`-not-called assertions on the rejection path
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change to `app/api/image-search/route.ts` removes the auth gate, the per-user rate limit, or the query-length cap, allowing the upstream provider `fetch` to run on a request that should have been rejected
- **THEN** the `route.test.ts` assertion `expect(fetch).not.toHaveBeenCalled()` on the corresponding negative path fails
- **AND** the `test` pre-merge gate fails
