# testing-foundation — delta

Two concerns: (1) path re-pointing — the data-layer source moves from `lib/dal.ts` + `app/actions/*.ts` to per-domain `lib/data/` modules (see `data-layer-organization`); no testing behavior, harness mechanics, or assertion bars change. (2) One ADDED requirement: the repo-wide file-size bands become lint-enforced (this capability owns lint-config governance, per the cognitive-complexity precedent).

## ADDED Requirements

### Requirement: File size SHALL be lint-enforced as three bands

Production source files SHALL be held to the repo-wide size bands, enforced in `eslint.config.mjs`. Both rules count **lines of code** — comments and blank lines are free (`sonarjs/max-lines` counts code lines natively; the core rule is configured with `skipBlankLines`/`skipComments` to match, so the two thresholds measure the same thing):

- **Red — over 500 lines is an error.** Core `max-lines` configured at `['error', { max: 500, skipBlankLines: true, skipComments: true }]`. A red file blocks merge; the only disposition is decomposition (for data-layer modules, by table cohesion per `data-layer-organization`) — never an `eslint-disable`.
- **Yellow — 300–500 lines is a warning.** `sonarjs/max-lines` configured at `['warn', { maximum: 300 }]`. Yellow is advisory: pull easy wins where a clean extraction exists; a cohesive file MAY remain yellow indefinitely.
- **Green — under 300 lines.** The goal; no diagnostics.

Scope: the rules SHALL apply to production source (`app/**`, `lib/**`, `hooks/**`, `db/**`) and SHALL NOT apply to test files (`**/*.test.*`, `**/__tests__/**`, `test/**`, `e2e/**`), `scripts/**`, or data-literal modules already carved out of coverage (e.g. `app/changelog/releases.ts`). Test-file size remains governed by this capability's structural conventions (one lane per source module), not a line count.

Gate interaction: the pre-merge "zero warnings" lint bar SHALL be read as zero warnings **outside the yellow band** — yellow size advisories are the single deliberate warning class and do not block merge. Per-file or per-line `eslint-disable` for either size rule SHALL NOT be added.

#### Scenario: Red file blocks at lint

- **WHEN** a production source file reaches 501+ lines
- **THEN** `npm run lint` reports a `max-lines` error and pre-merge fails until the file is decomposed

#### Scenario: Yellow file warns without blocking

- **WHEN** a production source file sits between 300 and 500 lines
- **THEN** lint emits a `sonarjs/max-lines` warning, visible in lint output, and merge is not blocked

#### Scenario: Test files are exempt

- **WHEN** a `__tests__/` suite or e2e spec exceeds 500 lines
- **THEN** neither size rule fires; test structure is governed by the one-lane-per-source-module convention, not a line count

#### Scenario: No escape hatches

- **WHEN** a PR adds an `eslint-disable` (file- or line-level) for `max-lines` or `sonarjs/max-lines`
- **THEN** the PR is rejected at review; the disposition is decomposition (red) or accepting the visible warning (yellow)

## MODIFIED Requirements

### Requirement: DAL reads and server actions SHALL be integration-tested against a migrated pglite instance via a shared harness

Data-layer reads (`lib/data/*.ts`) and server actions (`lib/data/*.actions.ts`) SHALL be tested under the **node** vitest project against a real migrated database, not against mocked query builders. Tier classification: **Tier 1** (per `test-coverage` design D13) — this requirement is a cross-cutting data-layer test contract, not carve-out bookkeeping, and was first established by the `test-following` sub-proposal (4.2).

Data-layer reads (`lib/data/*.ts`) and server actions (`lib/data/*.actions.ts`) run under the **node** vitest project (`*.test.ts`) against a real, migrated in-process Postgres provided by `bootPglite()` (`test/helpers/db.ts`), NOT against mocked query builders. The test SHALL:

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

- **WHEN** the relocated action suites under `lib/data/__tests__/` (`item.actions.test.ts`, `purchase.actions.test.ts`, `list.actions.test.ts`, `listItems.actions.test.ts`, `visit.actions.test.ts`) are inspected after this change
- **THEN** none contains a hand-rolled `TRUNCATE TABLE …` SQL literal
- **AND** all reset rows between tests by calling the shared schema-derived reset helper from `test/helpers/db.ts`

### Requirement: Test files SHALL colocate with source under a consistent layout

Test files SHALL be colocated with the source they test, but SHALL live inside a `__tests__/` directory adjacent to the source module — NOT alongside it. The colocation principle (tests stay next to the code they exercise) is preserved; the `__tests__/` folder keeps source-directory listings focused on production files and groups multiple tests for the same module without polluting the parent directory. The file-naming pattern remains `<source>.test.<ext>` (e.g., `Button.tsx` → `__tests__/Button.test.tsx`).

End-to-end tests SHALL live under a top-level `e2e/` directory. Cross-module shared fixtures SHALL live under `test/fixtures/`. Cross-module shared helpers and custom matchers SHALL live under `test/helpers/`. Test-only helpers used by tests within a single `__tests__/` directory SHALL live inside that same `__tests__/` directory (e.g., `app/ui/components/button/__tests__/test-helpers.ts`); they SHALL NOT be hoisted to `test/helpers/` unless a second `__tests__/` directory begins importing them. Per-test-file fixtures or helpers that are not reused SHALL stay inline; only repeated patterns extract.

Test-only files inside `__tests__/` directories (including local `test-helpers.*` modules) SHALL NOT appear in coverage reports — `vitest.config.ts`'s `coverage.exclude` SHALL contain a `**/__tests__/**` glob that covers them.

#### Scenario: Component test colocation under __tests__/

- **WHEN** a contributor adds tests for `app/ui/components/button/Button.tsx`
- **THEN** the tests live at `app/ui/components/button/__tests__/Button.test.tsx`
- **AND** the test imports the production module via a parent-relative specifier (`import { Button } from '../Button'`)

#### Scenario: Hook test colocation under __tests__/

- **WHEN** a contributor adds tests for `hooks/use-media-query.ts`
- **THEN** the tests live at `hooks/__tests__/use-media-query.test.tsx`
- **AND** server-side variants live at `hooks/__tests__/use-media-query.server.test.ts`

#### Scenario: Local test helper colocation

- **WHEN** two test files inside `app/ui/components/button/__tests__/` need the same render helper
- **THEN** the helper lives at `app/ui/components/button/__tests__/test-helpers.ts`
- **AND** both tests import it via `import { ... } from './test-helpers'`
- **AND** the helper is NOT reported in coverage (matched by `**/__tests__/**` exclude)

#### Scenario: Cross-module helper extraction

- **WHEN** the same helper is needed by tests inside two different `__tests__/` directories (e.g., a DB fixture used by both `lib/__tests__/visibility.test.ts` and `lib/data/__tests__/list.actions.test.ts`)
- **THEN** the helper extracts to `test/helpers/` (or `test/fixtures/` for fixture data) and both tests import from the extracted location

#### Scenario: E2E test placement

- **WHEN** a contributor adds a Playwright test for the list-creation flow
- **THEN** the spec lives under `e2e/` (e.g., `e2e/list-creation.spec.ts`)
- **AND** it does NOT live under any `__tests__/` directory

### Requirement: Per-file thresholds SHALL reference a single shared COVERAGE_FLOOR constant

`vitest.config.ts` SHALL define exactly one coverage-floor object — `const COVERAGE_FLOOR = { lines: 98, statements: 98, branches: 95, functions: 100 } as const;` — at module scope. `test.coverage.thresholds` SHALL apply this constant universally by spreading it alongside `perFile: true` (`thresholds: { perFile: true, ...COVERAGE_FLOOR }`); per-file threshold entries SHALL NOT exist. Per-file numeric variation SHALL NOT exist: a contributor reading the config SHALL be able to answer "what is the bar" in one read.

If a future need arises to vary thresholds by file (e.g., a file class with a documented exception), the variation SHALL be introduced as a SECOND named constant with a comment naming the exception's rationale — never as inline numeric overrides scattered across the threshold list.

#### Scenario: Single source of truth

- **WHEN** a contributor reads `vitest.config.ts`
- **THEN** exactly one `COVERAGE_FLOOR` (or named-variant) constant is visible at module scope
- **AND** the `thresholds` block reads as `{ perFile: true, ...COVERAGE_FLOOR }` with no per-file entries

#### Scenario: Inline numeric override rejected

- **WHEN** a PR introduces a per-file entry like `'lib/foo.ts': { lines: 95, statements: 95, branches: 80, functions: 90 }`
- **THEN** the PR is rejected at review
- **AND** the contributor either (a) writes the tests/annotations needed to use `COVERAGE_FLOOR` or (b) introduces a named-exception constant with a rationale comment

#### Scenario: Adding a new tested file requires no config edit

- **WHEN** a future change lands tests for `lib/data/list.actions.ts`
- **THEN** no `vitest.config.ts` edit is needed — the universal floor already gates the file via `coverage.include`
- **AND** the contributor makes no judgment call on threshold values
