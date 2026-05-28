## ADDED Requirements

### Requirement: DAL reads and server actions SHALL be integration-tested against a migrated pglite instance via a shared harness

DAL functions (`lib/dal.ts`) and server actions (`app/actions/*.ts`) SHALL be tested under the **node** vitest project against a real migrated database, not against mocked query builders. Tier classification: **Tier 1** (per `test-coverage` design D13) — this requirement rolls into the parent accumulator (`openspec/changes/test-coverage/specs/testing-foundation/spec.md`) at apply and into the active `testing-foundation` spec at the governing change's archive. It is a cross-cutting data-layer test contract, not carve-out bookkeeping.

DAL functions (`lib/dal.ts`) and server actions (`app/actions/*.ts`) run under the **node** vitest project (`*.test.ts`) against a real, migrated in-process Postgres provided by `bootPglite()` (`test/helpers/db.ts`), NOT against mocked query builders. The test SHALL:

1. Boot a fresh migrated pglite instance per test (isolating rows, not just files) and module-mock `@/db` so the module-under-test's `import { db } from '@/db'` resolves to that instance.
2. Apply `mockNextCache()` (`test/helpers/next-cache.ts`) so the `'use cache'` directive's `cacheTag(...)` calls are no-ops and `updateTag` / `revalidateTag` are spies whose calls can be asserted.
3. Mock `@/lib/auth`'s `auth()` to control the viewer session — this is the NextAuth network boundary the foundation already permits mocking.

Tests SHALL assert observable database state (rows present / absent / counted) and the cache-tag side effects (`updateTag` called on the success path, NOT called on early-return or error paths), per the assertion-substance bar. A module whose static `@/db` import cannot be cleanly swapped MAY introduce a minimal `getDb()` indirection in the source as a testability refactor (per the refactor-authority requirement) rather than lowering the coverage floor.

#### Scenario: A server action is tested against pglite with cache-tag assertions

- **WHEN** a server-action test boots pglite, mocks `@/db` to it, mocks `auth()` to a viewer session, and invokes the action
- **THEN** the test asserts the resulting row state in pglite AND asserts the `updateTag(...)` spy was called exactly on the success path and not on the unauthorized / validation-failure / DB-error paths
- **AND** the test does NOT mock the Drizzle query builder

#### Scenario: A `'use cache'` DAL read runs under the node project

- **WHEN** a DAL read carrying the `'use cache'` directive is invoked from a node-project test after `mockNextCache()`
- **THEN** the function body executes against pglite, `cacheTag(...)` is a no-op, and the returned rows are asserted against the seeded fixture

#### Scenario: Downstream data-layer carve-outs inherit the harness

- **WHEN** a later data-layer sub-proposal (e.g. home-digest, list-item-management, list-visibility, server-endpoint-authorization, visit-history, user-actions) tests a DAL read or server action
- **THEN** it uses this pglite + `mockNextCache()` + auth-boundary-mock pattern rather than re-deriving a data-layer test strategy

### Requirement: Following capability carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `following` capability carve-out SHALL be covered by colocated tests meeting the universal `COVERAGE_FLOOR`, with `sonarjs/cognitive-complexity` promoted to `error` for its executable files. Tier classification: **Tier 2** (per `test-coverage` design D13) — this requirement lives ONLY in this sub-proposal's delta and its archive directory. It does NOT roll into the parent accumulator and does NOT modify the active `testing-foundation` spec.

The `following` capability carve-out — the server action `app/actions/follows.ts`; the DAL reads `getFollowingByUser`, `getFollowersOfUser`, `getFollowingFeedUsers`, `isFollowing`, `isBlocked`, `viewerHasAnyFollows` (in `lib/dal.ts`); the page UI `app/(main)/following/FollowingPage.tsx` and `app/(main)/following/page.tsx`; the components `FollowButton`, `FollowControls`, `FollowContainer`, `FollowDisclosureDialog`, `FollowPrompt`, `ProfileHeader`, `PublicListsGrid`, `Avatar`, `UserCard`, `UserCardGrid` under `app/(main)/users/ui/components/`; and the extracted `app/(main)/users/ui/utils.ts` helper — SHALL be covered by colocated `__tests__/` test files meeting the universal per-file `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`). The DAL and server-action files run under the node project (`*.test.ts`); the component and page files run under jsdom (`*.test.tsx`). The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for the carve-out's executable files via `eslint.config.mjs` per-file overrides. Subsequent sub-proposals that import these modules SHALL inherit the assumption that they are tested and complexity-locked.

Because `lib/dal.ts` aggregates many capabilities' reads in one file, the `vitest.config.ts` per-file threshold for `lib/dal.ts` is NOT raised to the floor by this change — only the enumerated function-level coverage is asserted by the carve-out's tests; the file-level `lib/dal.ts` floor entry is deferred until the data-layer carve-outs that share the file collectively cover it (tracked by the parent `test-coverage` governance).

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs after this change archives
- **THEN** the per-file coverage report shows each enumerated carve-out file (excluding the multi-capability `lib/dal.ts` aggregate) at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** every per-file threshold entry added to `vitest.config.ts` references the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any executable carve-out file to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error and the pre-merge `lint` gate fails

#### Scenario: Elevated invariant is regression-locked

- **WHEN** a future change drops the `onConflictDoNothing()` clause from `followUser`, removes the `user_follows` composite primary key, or changes `blockUser` so a `updateTag` fires before all writes succeed
- **THEN** the corresponding colocated test in `app/actions/__tests__/follows.test.ts` fails with an assertion naming the specific broken backstop or ordering
- **AND** the `test` pre-merge gate fails
