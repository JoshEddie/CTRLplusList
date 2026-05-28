## ADDED Requirements

### Requirement: Home-digest capability carve-out SHALL be tested at the universal COVERAGE_FLOOR with complexity locked at error

The `home-digest` capability carve-out (sub-proposal 4.3) — comprising the executable source files `app/(main)/HomePage.tsx`, `app/(main)/page.tsx`, the four rail components `app/(main)/lists/ui/components/rails/MyListsRail.tsx`, `FollowingRail.tsx`, `BookmarksRail.tsx`, `RecentlyVisitedRail.tsx`, the extracted helper `app/(main)/lists/ui/components/rails/capRail.ts`, and the two client components `app/(main)/lists/ui/components/CollapsibleRail.tsx` and `app/(main)/lists/ui/components/BookmarkMigrationToast.tsx` — SHALL be covered by colocated test files under `__tests__/` directories meeting the universal per-file `COVERAGE_FLOOR` defined in `vitest.config.ts` (`lines:98 / statements:98 / branches:95 / functions:100`). The `sonarjs/cognitive-complexity` rule SHALL be promoted from `warn` to `error` for these executable files via `eslint.config.mjs` per-file overrides. Async-server-component carve-out files (`HomePage.tsx`, the four rails) are tested in the node project by direct async invocation and React-element prop-inspection (no jsdom render); the two client components and the `page.tsx` shell are tested in the jsdom project via React Testing Library. Subsequent sub-proposals that import these modules SHALL inherit the assumption that they are tested and complexity-locked.

The DAL read `lib/dal.ts#getUserIdByEmail` (the only DAL read imported directly by `HomePage.tsx`) is exercised by a behavioral integration test against the PGlite test database, but `lib/dal.ts` SHALL NOT be enumerated in `vitest.config.ts`'s per-file `thresholds` map by this carve-out: vitest's per-file coverage gate cannot isolate a single exported function of the 708-line shared `lib/dal.ts`, whose other functions are owned by sibling carve-outs. The `lib/dal.ts` per-file coverage-attribution strategy is deferred to a governance checkbox in `openspec/changes/test-coverage/tasks.md`.

#### Scenario: Each carve-out file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `HomePage.tsx`, `page.tsx`, `MyListsRail.tsx`, `FollowingRail.tsx`, `BookmarksRail.tsx`, `RecentlyVisitedRail.tsx`, `capRail.ts`, `CollapsibleRail.tsx`, and `BookmarkMigrationToast.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** every per-file threshold entry references the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)
- **AND** `lib/dal.ts` is NOT among the enumerated per-file threshold entries

#### Scenario: Complexity ceiling fails lint in carve-out files

- **WHEN** a contributor edits any executable carve-out file to raise a function's cognitive complexity to 16
- **THEN** `npm run lint` reports a `sonarjs/cognitive-complexity` error (not a warning)
- **AND** the pre-merge `lint` gate fails

#### Scenario: Elevated invariant is regression-locked

- **WHEN** a future change to `BookmarkMigrationToast.tsx` changes the un-hydrated `useSyncExternalStore` snapshot from *dismissed* to *visible* (reintroducing the flash-of-toast on cold load)
- **THEN** the colocated test in `BookmarkMigrationToast.test.tsx` fails with an assertion naming the pre-hydration visibility contract
- **AND** the `test` pre-merge gate fails

### Requirement: DAL functions SHALL be integration-tested against PGlite by swapping the @/db connection, not by mocking the function

The repository's DB-under-test mechanism (PGlite, chosen by `test-foundation-spike`) SHALL be applied to DAL functions by booting a PGlite instance via `test/helpers/db.ts#bootPglite`, applying the migrations, seeding rows, and substituting the `@/db` module's exported connection with the PGlite-backed Drizzle client for the duration of the test. This honors the testing-foundation rule "DAL functions SHALL NOT be mocked — integration tests SHALL exercise them against the real test database": only the database *connection/driver* (`@/db`, normally `drizzle-orm/neon-http`) is swapped, and the DAL function under test runs its real query logic against the real (PGlite) database. This carve-out establishes the pattern for the first time; later DAL carve-outs (`test-following`, `test-list-collections`, `test-visit-history`, `test-list-item-management`, `test-list-visibility`) SHALL reuse it, extracting the connection-swap + seed glue to `test/helpers/` once a second DAL test file needs it.

#### Scenario: getUserIdByEmail integration test runs against PGlite

- **WHEN** `lib/__tests__/getUserIdByEmail.test.ts` runs in the node project
- **THEN** it boots PGlite, applies migrations, seeds `users` rows, swaps `@/db` to the PGlite client, and asserts that a matching email returns the seeded row, a non-matching email returns `null`, and the DAL function itself is NOT mocked or stubbed

#### Scenario: Pattern is reused, not re-invented, by later DAL carve-outs

- **WHEN** a later DAL carve-out adds a second DAL integration test
- **THEN** the `@/db` connection-swap + seed harness is extracted to `test/helpers/` and imported by both consumers
- **AND** no DAL function is mocked from any DAL or action test
