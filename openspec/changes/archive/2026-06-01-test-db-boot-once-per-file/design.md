## Context

`test/helpers/db.ts#bootPglite()` boots a fresh PGlite WASM Postgres and replays every drizzle migration on each call (2.4–5.0s). Under `pool: 'forks'`, concurrent boots contend for CPU and one occasionally crosses the 5000ms default `testTimeout` — failing the harness, not the assertion (issue #97).

Current caller landscape (verified by grep over `*.test.ts` calling `bootPglite`):

- **Boot once per file (already correct):** `app/actions/__tests__/items.test.ts`, `lists.test.ts` (`beforeAll` boot + hand-rolled `TRUNCATE … CASCADE` reseed in `beforeEach`); `app/api/image-search/__tests__/route.test.ts`, `app/(main)/lists/[id]/__tests__/page.generateMetadata.test.ts`, `lib/__tests__/listAccess.test.ts` (`beforeAll` boot, seed-once read-only).
- **Boot per test via `beforeEach` (pays full cost):** the four rails tests, `app/(main)/__tests__/HomePage.test.ts`, `app/actions/__tests__/follows.test.ts`, `visitHistory.actions.test.ts`, `lib/__tests__/dal.following.test.ts`, `visitHistory.dal.test.ts`, `getUserIdByEmail.test.ts`.
- **Boot per `it()` inline (the observed flake source):** `db/__tests__/list-subtitle.test.ts`, `test/helpers/db.test.ts`.

The `testing-foundation` spec already requires the PGlite `@/db` connection-swap + seed glue to be "extracted to `test/helpers/` … and imported by both consumers." The boot-frequency fix is the completion of that single-source glue, so the reset helper lives in the same module.

The Neon-HTTP driver constraint (no interactive transactions) means the reset cannot be a rolled-back transaction; it must be a `TRUNCATE`.

## Goals / Non-Goals

**Goals:**

- Each DB-integration test file boots PGlite at most once (per file), not per `it()` / per `beforeEach`.
- Per-test isolation preserved via a single shared row-reset helper whose truncation set is derived from the drizzle schema (no hand-maintained table list).
- Remove the duplicated `TRUNCATE … CASCADE` literal in `items.test.ts` / `lists.test.ts`.
- The full node suite gets faster, and the boot-storm race disappears.

**Non-Goals:**

- No change to `bootPglite()`'s migration-replay algorithm (it still replays migrations — just once per file).
- No application code, cache-tag, or interactive-surface changes.
- No switch to a per-worker singleton across files, no DB driver change, no neon-serverless. Per-file boot is sufficient and keeps each file independently runnable.
- Not leading with a `testTimeout` bump — that is a documented fallback only.

## Decisions

### Decision 1: Add `resetDb(db)` (truncate-based) rather than per-test re-boot

Add `resetDb(db)` to `test/helpers/db.ts` that issues a single `TRUNCATE TABLE <all tables> RESTART IDENTITY CASCADE`. Callers boot once in `beforeAll`, then `resetDb` + reseed in `beforeEach`. This mirrors the pattern already proven in `items.test.ts`/`lists.test.ts`.

- **Why TRUNCATE, not transaction rollback:** the production driver constraint forbids interactive transactions; the test helper uses `drizzle-orm/pglite` (which *does* support them), but standardizing on `TRUNCATE` keeps the reset uniform, matches the existing working files, and avoids per-test transaction wrapping of arbitrary caller setup. `RESTART IDENTITY` resets any sequences so identity columns don't drift across tests.
- **Alternative rejected — per-worker singleton shared across files:** larger blast radius (file ordering coupling, cross-file leakage) for marginal gain over per-file boot; the race already disappears at per-file granularity.

### Decision 2: Derive the truncation table set from the drizzle schema, not a literal

`resetDb` SHALL compute its table list by iterating `import * as schema from '@/db/schema'`, filtering to drizzle table objects with `is(value, PgTable)` (from `drizzle-orm`), and resolving each name via `getTableName(value)`. The existing hand-rolled literal (`"user", lists, items, list_items, item_stores, purchases, list_visits`) omits `accounts`, `saved_lists`, `user_follows`, `user_blocks` — it only works today because `CASCADE` happens to clear dependents. A schema-derived set means a newly added table is reset automatically and no future contributor has to remember to edit a SQL string.

- **Quoting:** table names are interpolated into one `TRUNCATE` statement, each wrapped in double quotes (`"user"` is a reserved word and already quoted in the current literal). The set is closed (schema-derived, not user input), so static interpolation is acceptable.
- **Alternative rejected — keep the literal:** duplicated across two files, silently incomplete, and drifts when the schema grows. Fails the repo's single-source bar.

### Decision 3: Standardize the per-file harness shape; keep each file's mock wiring inline

Converted files follow the `items.test.ts` template: `beforeAll` boots, assigns the shared `db`, sets the `@/db` getter-holder, and dynamic-imports the module under test; `beforeEach` calls `vi.restoreAllMocks()` (per-test `db` spies must not leak now that `db` is shared), `resetDb(db)`, reseeds, and re-applies auth/cache mocks. The `vi.mock` holder pattern stays inline per file because `vi.mock` is hoisted per module — only the boot+reset+seed glue is shared. Files needing the single boot under contention set `vi.setConfig({ hookTimeout: 60000 })` as `items.test.ts` already does.

- **Read-only files unchanged:** `listAccess.test.ts`, `route.test.ts`, `page.generateMetadata.test.ts` already boot once; they are left as-is (or adopt `resetDb` only where they already truncate).

### Decision 4: `testTimeout` bump is a fallback, gated on measurement

Only if, after the conversion, the node suite still flakes do we add an explicit `testTimeout` to the node project in `vitest.config.ts`. The conversion removes ~13 per-test boots, so the remaining boots are one-per-file in `beforeAll` (already covered by the 60s `hookTimeout`, not `testTimeout`). The expectation is the bump is unnecessary; it is recorded so a reviewer doesn't re-derive it.

## Risks / Trade-offs

- **Cross-test leakage replaces the flake** → every converted file must `resetDb` + reseed in `beforeEach` and `vi.restoreAllMocks()` so a spy or row from one `it()` can't bleed into the next. The spec locks an empty-tables-after-reset scenario; conversions are verified by running each file's full suite (not just in isolation).
- **`TRUNCATE … CASCADE` clears more than a file seeded** → intended: each `beforeEach` starts from empty and reseeds exactly what it needs, so over-clearing is safe and deterministic.
- **Schema-derived table set could include a future view/non-table export** → the `is(value, PgTable)` filter excludes `relations()` exports and anything that isn't a table, so only real tables are truncated.
- **Identity/sequence drift across tests** → mitigated by `RESTART IDENTITY`.
- **Per-file boot still costs one boot per file** → acceptable and covered by the 60s `hookTimeout`; the goal is eliminating the per-`it()` storm, not the single boot.
