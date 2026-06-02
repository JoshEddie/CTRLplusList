## ADDED Requirements

### Requirement: PGlite test database SHALL be booted at most once per test file, with per-test isolation via a shared schema-derived reset helper

Every `*.test.ts` DB-integration test file SHALL boot the PGlite instance via `test/helpers/db.ts#bootPglite` at most once per file (in a `beforeAll` hook), and SHALL NOT call `bootPglite` inside an `it()` / `test()` body or inside a per-test `beforeEach`. Per-test isolation SHALL be achieved by resetting table rows between tests, NOT by re-booting and re-migrating.

The row reset SHALL be performed by a single shared helper exported from `test/helpers/db.ts` (e.g. `resetDb`) that issues one `TRUNCATE … RESTART IDENTITY CASCADE` over the database. The set of tables truncated SHALL be derived from the drizzle schema at `db/schema.ts` — iterating the schema module's exports and selecting drizzle table objects (via `is(value, PgTable)`), resolving each name with `getTableName` — and SHALL NOT be a hand-maintained SQL table-name literal. A table newly added to `db/schema.ts` SHALL therefore be reset automatically without editing the helper.

Test files that mutate rows SHALL call this shared reset helper (and `vi.restoreAllMocks()` where they install per-test `db` spies) in `beforeEach` before reseeding, so that no row or spy leaks from one test into the next now that the database instance is shared across a file's tests. Files that only seed read-only fixtures once and never mutate MAY seed in `beforeAll` and skip the reset.

This requirement completes the existing "extract the connection-swap + seed glue to `test/helpers/`" expectation into a binding boot-frequency contract; it does not change the migration-replay logic of `bootPglite` itself — only how often callers invoke it.

#### Scenario: Reset helper leaves all schema tables empty

- **WHEN** a test seeds rows into multiple tables and a subsequent `beforeEach` calls the shared `resetDb` helper
- **THEN** selecting from every table defined in `db/schema.ts` returns zero rows
- **AND** the truncation set was derived from the schema (not a hardcoded table-name list), so a table absent from any prior hand-rolled `TRUNCATE` literal is also emptied

#### Scenario: No DB-integration test file boots PGlite per test

- **WHEN** the repository's `*.test.ts` files are inspected
- **THEN** no `bootPglite()` call appears inside an `it()` / `test()` body or inside a `beforeEach` hook
- **AND** every file that uses `bootPglite` calls it from a `beforeAll` hook exactly once

#### Scenario: Converted file stays green under the full parallel suite, not just in isolation

- **WHEN** a file converted from per-test boot to per-file boot + `resetDb` runs as part of the full `pool: 'forks'` node suite
- **THEN** every test passes with no cross-test row or mock leakage
- **AND** the per-test boot-timeout flake described in issue #97 no longer occurs

#### Scenario: TRUNCATE literal is de-duplicated

- **WHEN** `app/actions/__tests__/items.test.ts` and `lists.test.ts` are inspected after this change
- **THEN** neither contains a hand-rolled `TRUNCATE TABLE …` SQL literal
- **AND** both reset rows between tests by calling the shared schema-derived reset helper from `test/helpers/db.ts`
