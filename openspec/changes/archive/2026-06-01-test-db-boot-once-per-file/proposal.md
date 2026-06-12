## Why

The `test` CI job flakes: a `*.test.ts` DB-integration test intermittently exceeds the 5000ms `testTimeout` inside `bootPglite()` rather than on any assertion (issue #97; observed run 26789521887, `db/__tests__/list-subtitle.test.ts`, boot took 5083ms). The root cause is that `test/helpers/db.ts#bootPglite()` spins up a fresh PGlite WASM Postgres and replays *every* drizzle migration statement-by-statement on *each* `it()`. Per-test boot cost is 2.4–5.0s; under `pool: 'forks'` the concurrent boots contend for CPU and one occasionally crosses the 5s default, so the harness — not the test that loses the race — fails.

The proven remedy already exists in the repo: `app/actions/__tests__/items.test.ts` and `lists.test.ts` boot once per file (`beforeAll`) and `TRUNCATE … CASCADE` + reseed between tests (`beforeEach`), eliminating the per-test boot. But ~13 of the ~20 DB-integration files still pay the per-test cost — booting either inside each `it()` (`db/__tests__/list-subtitle.test.ts`, `test/helpers/db.test.ts`) or in a per-test `beforeEach` (the rails, `HomePage`, the DAL tests, `follows`, `visitHistory.actions`, `getUserIdByEmail`). The two `items`/`lists` files also hand-roll the `TRUNCATE` table list, duplicating a brittle, schema-coupled SQL literal.

This change extends the `testing-foundation` capability, which already requires the PGlite `@/db` connection-swap + seed glue to be "extracted to `test/helpers/` … and imported by both consumers" (Requirement: *DAL functions SHALL be integration-tested against PGlite by swapping the @/db connection*). Booting once per file and resetting rows between tests is the natural completion of that single-source glue.

## What Changes

- Add a reusable reset helper to `test/helpers/db.ts` that truncates all test-DB rows between tests, with the table set derived from the drizzle schema (single source) rather than a hand-maintained SQL literal — so a new table never silently escapes the reset.
- Convert every DB-integration `*.test.ts` file that currently boots per-`it()` or per-`beforeEach` to the boot-once-per-file pattern: boot + migrate in `beforeAll`, reset rows + reseed in `beforeEach`.
- Replace the duplicated hand-rolled `TRUNCATE … CASCADE` literal in `items.test.ts` / `lists.test.ts` with the shared helper.
- **Fallback only (not led with):** if measured per-test boot cost cannot be driven down enough to make the race disappear, set an explicit `testTimeout` on the node project in `vitest.config.ts`. This masks rather than fixes and is a last resort.
- No application code changes. No change to `bootPglite()`'s migration-replay logic itself — only how often callers invoke it and how they reset between tests.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `testing-foundation`: add a requirement that the PGlite test database SHALL be booted at most once per test file (never per `it()` / per `beforeEach`), with per-test isolation achieved by a shared row-reset helper in `test/helpers/db.ts` whose truncation set is derived from the drizzle schema. This sharpens the existing "extract the connection-swap + seed glue to `test/helpers/`" expectation into a binding boot-frequency contract.

## Impact

- **Modified:** `test/helpers/db.ts` (new reset helper; `bootPglite` contract documented as boot-once-per-file).
- **Modified test files (per-test → per-file boot):** `db/__tests__/list-subtitle.test.ts`, `test/helpers/db.test.ts`, `app/(main)/__tests__/HomePage.test.ts`, the four rail tests under `app/(main)/lists/ui/components/rails/__tests__/`, `app/actions/__tests__/follows.test.ts`, `app/actions/__tests__/visitHistory.actions.test.ts`, `lib/__tests__/dal.following.test.ts`, `lib/__tests__/visitHistory.dal.test.ts`, `lib/__tests__/getUserIdByEmail.test.ts`.
- **Modified (de-duplicate TRUNCATE literal):** `app/actions/__tests__/items.test.ts`, `app/actions/__tests__/lists.test.ts`.
- **Possibly modified (fallback only):** `vitest.config.ts` `testTimeout`.
- **Unaffected:** all application code; `app/api/image-search/__tests__/route.test.ts`, `app/(main)/lists/[id]/__tests__/page.generateMetadata.test.ts`, and `lib/__tests__/listAccess.test.ts` already boot once per file.
- **Risk:** files where each `it()` previously got a pristine DB now share one instance — every converted file must reset all mutated rows in `beforeEach` (and restore any per-test `db` spies) or cross-test leakage replaces the flake. No cache tags or interactive surfaces are touched.
