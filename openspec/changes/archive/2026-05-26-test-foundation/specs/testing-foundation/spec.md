## ADDED Requirements

### Requirement: Test runner SHALL be vitest 4.1.x pinned per the spike

The repository SHALL use `vitest` as the test runner, installed at version `4.1.7` (the version validated by the `test-foundation-spike` PoC). Coverage SHALL be measured via `@vitest/coverage-v8` matched to the installed vitest minor version. Vitest configuration SHALL live in a single `vitest.config.ts` at repo root using `environmentMatchGlobs` to route `**/*.test.tsx` to `jsdom` and `**/*.test.ts` to `node`, with `pool: 'forks'` for per-file isolation. No alternative runner (jest, mocha, ava) SHALL be added alongside vitest unless a future spec amendment retires vitest first.

#### Scenario: Pinned version matches spike

- **WHEN** a contributor runs `npm ls vitest` against the repo
- **THEN** the reported version is `4.1.7` (or a later patch in the same minor line)
- **AND** `npm ls @vitest/coverage-v8` reports a version compatible with the installed vitest

#### Scenario: jsdom and node environments coexist

- **WHEN** a `*.test.tsx` file in the suite calls `document.createElement(...)` from inside a test body
- **THEN** the test passes (jsdom is active)
- **AND** a `*.test.ts` file performing only Node-API work (no DOM globals) runs in the same `npm test` invocation without environment cross-contamination

#### Scenario: Forks pool isolates pglite

- **WHEN** two integration test files each call the canonical pglite boot helper
- **THEN** each file gets its own pglite instance
- **AND** mutations in one file do not leak into the other

### Requirement: Postgres-under-test SHALL be pglite 0.4.x via drizzle-orm/pglite

DB integration tests SHALL use `@electric-sql/pglite` at version `0.4.6` (the version validated by the spike PoC) wired through `drizzle-orm/pglite`. The substrate boot SHALL replay every `drizzle/*.sql` migration file in the order declared by `drizzle/meta/_journal.json`, splitting each on `--> statement-breakpoint`, applied against an in-memory pglite instance. Testcontainers Postgres and Neon-branch-per-CI are documented fallbacks per the spike; switching substrates SHALL require a new sub-proposal that records the failure mode of the pglite path that motivated the switch.

#### Scenario: Pinned pglite version

- **WHEN** `npm ls @electric-sql/pglite` is run against the repo
- **THEN** the reported version is `0.4.6` (or a later patch in the same minor line)

#### Scenario: Migrations replay from journal

- **WHEN** a test calls the canonical pglite boot helper
- **THEN** the helper reads `drizzle/meta/_journal.json` to determine migration order
- **AND** every entry's corresponding `drizzle/NNNN_*.sql` file is applied
- **AND** statements separated by `--> statement-breakpoint` are applied as independent statements

#### Scenario: Substrate switch requires sub-proposal

- **WHEN** a contributor wants to switch DB-under-test substrate (e.g., to testcontainers)
- **THEN** a new sub-proposal is added to `openspec/changes/test-coverage/tasks.md`
- **AND** the proposal records the pglite failure mode that motivates the switch
- **AND** the substrate is NOT switched in an existing carve-out sub-proposal

### Requirement: Canonical test helpers SHALL live at three known paths

The repository SHALL provide three helper modules. Sub-proposals SHALL import from these paths and SHALL NOT inline equivalent logic in `*.test.*` files.

1. **`test/helpers/db.ts`** — exports `bootPglite()` returning a drizzle client wired against an in-memory pglite instance with all production migrations applied. Uses the production `db/schema.ts` import and `casing: 'snake_case'`.
2. **`lib/sqlstate.ts`** — exports `sqlstateOf(err: unknown): string | undefined`, reading `.code` first and `.cause?.code` second to bridge the Neon-HTTP / pglite error-shape divergence documented in the spike. Lives under `lib/` (not `test/helpers/`) because the production catch site in `app/actions/items.ts` imports it — production code SHALL NOT import from `test/`. Its colocated smoke test is `lib/sqlstate.test.ts`.
3. **`test/helpers/next-cache.ts`** — exports `mockNextCache()` invoking `vi.mock('next/cache', ...)` with `cacheTag` as a no-op, `unstable_cache: (fn) => fn`, and `revalidateTag` / `revalidatePath` as `vi.fn()` spies. The factory also stubs `updateTag` (Next 16's successor API to `revalidateTag`, which production currently uses) so that server-action modules under test do not crash on import.

Each helper module SHALL have a colocated `*.test.ts` smoke test. Helpers themselves are excluded from per-file coverage threshold enforcement (treated as test infrastructure per the testing-foundation exclusion list).

#### Scenario: Sub-proposal imports the canonical helper

- **WHEN** a sub-proposal writes a DAL integration test that needs a database
- **THEN** the test imports `bootPglite` from `test/helpers/db.ts`
- **AND** the test does NOT define its own pglite boot logic

#### Scenario: Helper smoke test is colocated

- **WHEN** any helper module under `test/helpers/` exists
- **THEN** a `*.test.ts` file colocated with it asserts its observable behavior
- **AND** the smoke test runs in the same `npm test` invocation as the rest of the suite

#### Scenario: sqlstateOf bridges error shape

- **WHEN** a thrown DB error has `.code === '23505'`
- **THEN** `sqlstateOf(err)` returns `'23505'`
- **AND WHEN** a thrown DB error has `.code === undefined` and `.cause.code === '23505'`
- **THEN** `sqlstateOf(err)` returns `'23505'`
- **AND WHEN** an unrelated value is passed (no `.code`, no `.cause`)
- **THEN** `sqlstateOf(err)` returns `undefined`

### Requirement: CI workflow SHALL run four parallel jobs on GitHub Actions

The repository SHALL include a CI workflow at `.github/workflows/ci.yml` running on `pull_request` events and on `push` to branches matching `main`, `dev`, and `1.*.x`. The workflow SHALL define four independent jobs — `lint`, `typecheck`, `build`, `test` — each running on `ubuntu-latest` with Node `20`, using `actions/checkout@v4` and `actions/setup-node@v4` with `cache: 'npm'`. Each job SHALL run `npm ci` then its corresponding gate command:

| Job | Command |
|---|---|
| `lint` | `npm run lint` |
| `typecheck` | `npx tsc --noEmit` |
| `build` | `npm run build` with `DATABASE_URL` set to a placeholder Postgres URL |
| `test` | `npm test -- --coverage` |

The workflow SHALL set `permissions: contents: read` at the workflow level.

#### Scenario: Four-gate quartet runs per push

- **WHEN** a contributor pushes a branch with an open PR against `main`
- **THEN** four GitHub Actions jobs run in parallel: `lint`, `typecheck`, `build`, `test`
- **AND** each job's failure independently blocks the PR

#### Scenario: Build job has placeholder DATABASE_URL

- **WHEN** the `build` job runs
- **THEN** `DATABASE_URL` is set to a non-empty Postgres-shaped placeholder value
- **AND** the `next build` step completes without requiring a real DB connection

#### Scenario: Topology can collapse without test changes

- **WHEN** a future operator decides to collapse the four parallel jobs to one job with four steps for billing reasons
- **THEN** the change does NOT require modifying any `*.test.*` file
- **AND** the four gate commands run unchanged

### Requirement: ESLint additions SHALL enforce expect-presence and complexity

The repository SHALL register `eslint-plugin-sonarjs` and `eslint-plugin-vitest` in `eslint.config.mjs`. The `sonarjs/cognitive-complexity` rule SHALL be configured at threshold 15 with severity `warn` globally (per-file promotion to `error` is each sub-proposal's job). The vitest rules `vitest/expect-expect`, `vitest/valid-expect`, and `vitest/no-standalone-expect` SHALL be configured at severity `error` scoped to `**/*.test.{ts,tsx}` from the moment this change archives — there SHALL NOT be a warn-then-promote ramp, because the repository contains zero pre-existing tests requiring grandfathering. `eslint-plugin-testing-library` recommended rules SHALL also be registered at severity `error` scoped to `**/*.test.tsx`.

#### Scenario: Test with no expect fails lint

- **WHEN** a contributor writes a `*.test.ts` file containing a single `it('...', () => { someFn(); })` with no `expect` call
- **THEN** `npm run lint` reports an `expect-expect` error
- **AND** the lint gate fails

#### Scenario: Complexity exceedance emits a warning

- **WHEN** a contributor adds a function with cognitive complexity 16 anywhere in the source tree
- **THEN** `npm run lint` emits a `sonarjs/cognitive-complexity` warning
- **AND** the lint gate stays green (warning, not error)

### Requirement: Seed-as-fixture SHALL be extended per the spike audit and SHALL carry a fixture header

The seed script at `scripts/seed-dev-users.ts` SHALL be extended to add: one friend-owned `VISIBILITY.OWNER` list (assigned to an existing friend the viewer does NOT follow), one friend-owned `VISIBILITY.LINK` list (assigned to an existing friend the viewer does NOT follow), and one new friend `kim` owning one `VISIBILITY.FOLLOWERS` list with no `list_visits` row for the viewer. The script SHALL carry a header comment naming it as the canonical E2E fixture and declaring that edits to seeded-entity identity or visibility are breaking changes to the E2E suite requiring concurrent review of dependent E2E specs.

#### Scenario: Friend-owned private list exists post-seed

- **WHEN** `npm run db:seed:dev` is run against a clean local DB
- **THEN** at least one list with `visibility = 'private'` and `owner_id <> 'dev-test-viewer'` exists in the `lists` table

#### Scenario: Friend-owned unlisted list exists post-seed

- **WHEN** `npm run db:seed:dev` is run against a clean local DB
- **THEN** at least one list with `visibility = 'unlisted'` and `owner_id <> 'dev-test-viewer'` exists in the `lists` table

#### Scenario: Kim exists with no visit row

- **WHEN** `npm run db:seed:dev` is run against a clean local DB
- **THEN** a user with name slug `kim` exists in `users`
- **AND** kim owns at least one list with `visibility = 'public'` (per the FOLLOWERS alias)
- **AND** no `list_visits` row exists where `user_id = 'dev-test-viewer'` and `list_id` references a kim-owned list

#### Scenario: Header declares seed-as-fixture

- **WHEN** a contributor opens `scripts/seed-dev-users.ts`
- **THEN** the first JSDoc comment in the file names the file as the canonical E2E fixture
- **AND** declares that adds/removes/visibility-changes are breaking changes to dependent E2E specs

### Requirement: openspec/config.yaml tasks rule SHALL enforce the four-gate pre-merge

The `tasks:` rule block in `openspec/config.yaml` SHALL require that every `tasks.md` written under this schema include a pre-merge verification section with four separately-checkable tasks: `npm run lint` (zero errors, zero warnings), `npx tsc --noEmit` (zero errors), `npm run build` (completes), and `npm test` (zero failing tests). The rule SHALL forbid collapsing the four gates into a single combined task.

#### Scenario: Four-gate section is required

- **WHEN** a contributor drafts a new `tasks.md` under the spec-driven schema after this change archives
- **THEN** the pre-merge section contains four separately-checkable tasks (one per gate)
- **AND** linting against the rule succeeds

#### Scenario: Collapsed gates fail the rule

- **WHEN** a contributor drafts a pre-merge section listing a single "all gates pass" checkbox instead of four
- **THEN** the rule is violated
- **AND** the change SHALL NOT proceed until the section is corrected

### Requirement: Production catch-site SHALL use the sqlstate unwrap helper

The catch block in `app/actions/items.ts` that reads SQLSTATE off thrown DB errors SHALL use `sqlstateOf` from `lib/sqlstate.ts` so production code is substrate-agnostic with respect to error shape. The helper SHALL read `.code` first to preserve the existing Neon-HTTP behavior; the `.cause?.code` fallback is non-load-bearing for production but unblocks the integration-test substrate.

#### Scenario: Catch site delegates SQLSTATE read

- **WHEN** `app/actions/items.ts` catches an insert error and checks for unique-violation
- **THEN** it reads the SQLSTATE via `sqlstateOf(err) === '23505'` rather than indexing `.code` directly
- **AND** the existing Neon-HTTP production behavior is preserved (`.code` is still checked first)
