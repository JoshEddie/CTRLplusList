## ADDED Requirements

### Requirement: The `lib/dal.ts` remainder and `lib/auth.ts` SHALL be whole-covered at the universal COVERAGE_FLOOR against the real test database

The **whole of `lib/dal.ts`** SHALL be brought to the universal floor, because `vitest.config.ts` enforces coverage `perFile`. The reads not reached by the sibling data-layer carve-outs (4.2 / 4.3 / 4.6 / 4.9 / 4.11 / 4.14) — `getUserById`, `getList`, `getLists`, `getListsByUser`, `getItemsByUser`, `getItemById`, `getItemsByPurchased`, `getItemsByListId`, `getListsSharedByUser`, `getBlockedByUser`, `getPublicListsByUser`, `getProfileForUser` — together with the `sanitizePurchases` / `firstNameOf` projection branches and every throwing read's `catch`, SHALL be covered by colocated `*.test.ts` files under the **node** vitest project. The reads SHALL be exercised as the REAL production functions (imported and invoked, NOT re-implemented) against the PGlite test database (`bootPglite()` from `test/helpers/db.ts`), with `next/cache` mocked via `mockNextCache()` and `@/db` module-mocked to the PGlite instance — per the established data-layer harness contract. Internal modules SHALL NOT be mocked.

The sibling-covered reads' happy paths SHALL NOT be re-tested; however the uncovered branches those siblings left short — chiefly each read's `catch` error path — SHALL be backfilled here, because the per-file gate measures the whole file and cannot pass while those branches are red. The backfill SHALL add only the missing branch tests, not duplicate the siblings' happy-path suites.

`lib/auth.ts` SHALL be covered to the universal floor: the local-mode bypass surface (`auth()` zero-argument behavior for the default-viewer, `guest`, and other-seeded-id identities; `synthesizeSession`) and the NextAuth `signIn` / `jwt` / `session` callbacks. The callbacks MAY be extracted to named exports as a within-carve-out testability refactor so they are directly invocable; any single line that genuinely cannot be unit-reached (e.g. the `auth(req, ctx)` pass-through to real NextAuth) SHALL be disposed of with a `/* v8 ignore */` carrying a one-line rationale — never by lowering the floor.

On completion, `lib/dal.ts` and `lib/auth.ts` SHALL be enumerated in `vitest.config.ts` per-file `thresholds` at the shared `COVERAGE_FLOOR` constant, and SHALL have `sonarjs/cognitive-complexity` promoted to `error` via `eslint.config.mjs`. The deferral comments in `vitest.config.ts` that excluded `lib/dal.ts` (from sub-proposals 4.2 / 4.3 / 4.14) SHALL be removed.

#### Scenario: The DAL remainder and lib/auth.ts meet the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows `lib/dal.ts` and `lib/auth.ts` each at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** both per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)
- **AND** `eslint.config.mjs` sets `sonarjs/cognitive-complexity` to `error` for both files

#### Scenario: Whole-file floor backfills sibling-covered reads' uncovered branches

- **WHEN** this carve-out lands and `lib/dal.ts` is enumerated at `COVERAGE_FLOOR` with `perFile: true`
- **THEN** the `catch` error path of every throwing read — including `getFollowingByUser`, `getFollowersOfUser`, `isFollowing`, `viewerHasAnyFollows`, `isBlocked`, and `getFollowingFeedUsers` (covered only on their happy paths by sibling carve-outs) — is exercised by a test
- **AND** no sibling read's happy-path suite is duplicated
- **AND** the per-file gate passes only because the whole file, not merely the twelve previously-untested reads, meets the floor

#### Scenario: DAL reads are tested against the real test database, not mocked

- **WHEN** a `lib/dal.ts` read is exercised
- **THEN** the test runs the real production function against PGlite (`bootPglite()`)
- **AND** the function is NOT re-implemented in the test and the Drizzle query builder is NOT mocked
- **AND** only `next/cache` and `@/db` (to the PGlite instance) are mocked

#### Scenario: The getListsByUser updated_at sort is regression-locked

- **WHEN** a future change makes `getListsByUser` order by `created_at` instead of `updated_at DESC`
- **THEN** the corresponding test fails with an assertion naming the wrong ordering
- **AND** the `test` pre-merge gate fails

### Requirement: The multi-capability-shared-file coverage deferral SHALL be resolved for the final shared file

With `lib/dal.ts` whole-covered and enumerated, the §7.7 / §7.10 deferral for multi-capability shared files SHALL be resolved: the chosen mechanism is whole-file enumeration at the universal floor once every function is covered (NOT a per-function coverage tool, NOT splitting the file). `app/actions/lists.ts` and `app/actions/items.ts` were resolved earlier by sub-proposal 4.9; `lib/dal.ts` was the last outstanding shared file. After this change, no shared multi-capability file remains deferred from the per-file coverage gate.

#### Scenario: No shared file remains deferred from the per-file gate

- **WHEN** the governing `test-coverage` change audits multi-capability shared files at close-out
- **THEN** `lib/dal.ts`, `app/actions/lists.ts`, and `app/actions/items.ts` are each enumerated in `vitest.config.ts` `thresholds` at `COVERAGE_FLOOR`
- **AND** no `vitest.config.ts` comment defers a shared file's per-file gate
- **AND** §7.7 and §7.10 in `test-coverage/tasks.md` are unblocked
