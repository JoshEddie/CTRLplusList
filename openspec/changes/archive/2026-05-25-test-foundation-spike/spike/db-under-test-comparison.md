# DB-under-test comparison

**Status:** spike deliverable for `test-foundation-spike`. Recommendation is for `test-foundation` to consume.

## TL;DR

**Recommendation: pglite (`@electric-sql/pglite` 0.4.6) via `drizzle-orm/pglite`.**

It satisfies every fidelity check the spike exercised against the production schema and migrations. It is in-process (no Docker, no network), boots in < 300 ms cold, runs the full migration set in well under a second, and supports the partial-unique-index + `ON CONFLICT` semantics this codebase depends on. The one substantive divergence from the production Neon-HTTP driver is **error-shape**: under `drizzle-orm/pglite`, Postgres SQLSTATEs surface on `err.cause.code`, while production code (`app/actions/items.ts:238`) reads `err.code` directly off the rejected promise. `test-foundation` must standardise an error-unwrap helper that reads `.code ?? .cause?.code` to bridge the two surfaces; the production action either keeps reading `.code` (Neon-HTTP exposes it) or is refactored to use the helper. Recorded as a known fidelity caveat, not a blocker.

Testcontainers Postgres and Neon-branch-per-CI were **not exercised** because pglite passed every behaviour check the spike defined. Per the design's D7, they are fallbacks reached only if pglite fails — it didn't. Their relative ergonomics are noted below for completeness.

## What the production code depends on at the DB layer

References pinned for `test-foundation` follow-up:

- **Partial unique index:** `purchases_item_user_unique_idx` on `(item_id, user_id) WHERE user_id IS NOT NULL` — declared at [db/schema.ts:179](../../../../db/schema.ts), enforced as the sole backstop for same-user double-claim per CLAUDE.md's no-transactions rule.
- **Production claim path:** `markAsPurchased` at [app/actions/items.ts:223](../../../../app/actions/items.ts), with the `PG_UNIQUE_VIOLATION === '23505'` catch at line 238.
- **Cached DAL functions:** every fetcher in [lib/dal.ts](../../../../lib/dal.ts) is tagged `'use cache'` + `cacheTag(...)` (e.g. `getListsByUser` at line 159, `cacheTag('lists')`). Mutations call `updateTag(...)` (e.g. `app/actions/items.ts:249`) to invalidate.
- **Driver:** `drizzle({ client: neon(DATABASE_URL), schema, casing: 'snake_case' })` at [db/index.ts:15](../../../../db/index.ts). No interactive transactions per the CLAUDE.md guardrail.

## Substrate evaluated: pglite 0.4.6

### Setup

The PoC harness ([spike/poc/setup-pglite.ts](poc/setup-pglite.ts)) boots an in-memory `PGlite` instance and replays every `drizzle/NNNN_*.sql` file verbatim, splitting on `--> statement-breakpoint`. Drizzle is wired via `drizzle-orm/pglite` with the production `schema` import and `casing: 'snake_case'` — same options as production.

No schema duplication: the production `db/schema.ts` is the single source of truth, and the production `drizzle/` migration files are replayed unmodified. This is the single most valuable property pglite offers — schema drift between production and test is impossible by construction.

### Fidelity check matrix

| Behaviour | Production (Neon-HTTP) expectation | pglite observation | Verdict |
|---|---|---|---|
| Production migrations apply cleanly | All 6 `drizzle/*.sql` files green | All 6 apply (statement-breakpoint split required) | ✅ Pass |
| Partial unique index `(item_id, user_id) WHERE user_id IS NOT NULL` rejects same-user double-insert | SQLSTATE `23505` | SQLSTATE `23505` raised on the second concurrent insert | ✅ Pass |
| Partial unique index does NOT block two NULL-user (guest) rows on the same item | Both rows succeed | Both rows succeed | ✅ Pass |
| `INSERT … ON CONFLICT (item_id, user_id) WHERE user_id IS NOT NULL DO NOTHING` absorbs duplicate | Conflict swallowed; 0 rows inserted | Conflict swallowed; 0 rows inserted | ✅ Pass |
| SQLSTATE surface on thrown error | `.code === '23505'` (production code reads this directly) | `.cause.code === '23505'`; top-level `.code` is `undefined` | ⚠️ Divergent — see below |
| Drizzle relational queries (`db.query.purchases.findMany`) | Returns expected rows | Returns expected rows | ✅ Pass |

### Falsification log

Each row of the matrix above was exercised by a runnable test in [spike/poc/race.test.ts](poc/race.test.ts) — `npx vitest run` reports `Test Files 2 passed (2)` `Tests 5 passed (5)`. The error-shape divergence was discovered during the spike (the first `expect(err.code).toBe('23505')` assertion failed against pglite) and is now documented in the test file (`race.test.ts:74` comment) so a future reader cannot miss it.

### The error-shape divergence in detail

Drizzle 0.45's `drizzle-orm/pglite` wraps every driver error in a `DrizzleQueryError` whose `.cause` holds the original `PGliteError`. Production `markAsPurchased` reads `(insertError as { code?: string } | null)?.code` directly — that path works against Neon-HTTP because `@neondatabase/serverless` rethrows the original `pg`-shaped error verbatim. Under pglite, that same expression yields `undefined` and the catch falls through to the generic `throw insertError` rather than the friendly "Duplicate claim" return.

This is a real-but-bridgeable gap. Three options for `test-foundation`:

1. **(Recommended) Add a tiny unwrap helper** like `sqlstateOf(err: unknown): string | undefined` that checks `.code` then `.cause?.code`, and refactor the one production catch site to use it. Cost: ~10 LOC + one test refactor; benefit: tests work without per-substrate branching, production behaviour unchanged.
2. Mock `drizzle-orm/pglite`'s error wrapping in tests. Rejected — leaks substrate detail into test infra and would silently break if drizzle's wrap shape changes.
3. Switch test substrate to testcontainers Postgres to get identical error shapes. Rejected — see "Substrates not exercised" below; the cost/benefit doesn't justify it for one wrap layer.

### Speed

Cold boot + apply all 6 migrations + insert seed fixture + run 3 race assertions: ~2.5 s per `vitest run` invocation, measured locally. Per-test (after the fork is warm) is sub-50 ms. Each test file gets a fresh `PGlite` instance via `bootPglite()` — there is no cross-test contamination, and the cost is dominated by WASM init (one-time per worker, not per test). At a realistic 50–100 integration tests, total wall time should stay well under 30 s — comfortably inside CI's `test` gate budget.

### Local-dev ergonomics

- Zero infra requirement. No Docker, no Postgres install, no network. `npm test` runs out of the box.
- MIT-licensed.
- WASM-backed; the install pulled in ~170 transitive packages alongside `vitest`. The same install footprint shows up in CI.

## Substrates NOT exercised (per design D7's escalation rule)

These were the fallbacks for pglite failure. pglite did not fail.

### Testcontainers Postgres

- **Fidelity:** highest — real Postgres, same `pg` driver shape as Neon's underlying server.
- **Cost:** requires Docker locally and in CI. GitHub Actions ubuntu runners ship with Docker; macOS-hosted runners do not. CI workflow gets ~10–20 s of container startup per job; local dev gets a Docker dependency someone has to install.
- **When to revisit:** if the error-shape unwrap helper proves too sticky, or if a future schema change exposes pglite behaviour that diverges from real Postgres (e.g. specific `pg_*` system catalogue queries, advanced extension behaviour). Today, neither is in scope.

### Neon branch per CI run

- **Fidelity:** identical to production — same driver, same managed service.
- **Cost:** branch create/teardown is ~5–15 s per CI run; Neon's free-tier compute-hours can be exhausted by a busy CI matrix; per-PR concurrency caps add fragility.
- **When to revisit:** if Neon-specific behaviour (HTTP-vs-WebSocket connection lifecycle, Neon's branching transactional semantics) ever becomes load-bearing for a test. Today, the spike found no such case.

## Versions tested (pinned per the spike's archival contract)

| Package | Version | Source |
|---|---|---|
| `@electric-sql/pglite` | `0.4.6` | `npm install --save-dev @electric-sql/pglite` |
| `vitest` | `4.1.7` | `npm install --save-dev vitest` |
| `drizzle-orm` | `0.45.2` | already in `dependencies`; `pglite` adapter is included |

These are the versions `test-foundation` should pin when it installs the deps permanently. The spike reverts `package.json` and `package-lock.json` before archive per the testing-foundation spec's "Spike SHALL revert temporary dependency installations" requirement.

## Cache-tag testability

Outside the Next.js runtime, the `'use cache'` directive on DAL functions degrades to ordinary async-function semantics (no caching), and `next/cache`'s `cacheTag` / `revalidateTag` are no-ops. The spike's [spike/poc/dal-cache.test.ts](poc/dal-cache.test.ts) verifies DB-side query correctness against pglite (a `getListsByUser`-equivalent query returns only the requesting user's rows, an inserted item is visible on the next read), but explicitly cannot verify that `revalidateTag('items')` flushes a stale cached read — that requires the Next render pipeline.

The recommended split for `test-foundation`:

- **DAL integration tests (vitest + pglite):** assert the underlying SQL returns the right shape. Mock `next/cache` with `vi.mock('next/cache', () => ({ cacheTag: vi.fn(), unstable_cache: (fn) => fn, revalidateTag: vi.fn() }))` so the `'use cache'`-annotated functions run synchronously-equivalent. Assert mutations call `updateTag(...)` with the expected tag string (interaction-level — sufficient to catch "we added a new mutation path and forgot to invalidate `items`").
- **E2E (Playwright vs `next dev`):** asserts the end-to-end cache invalidation behaviour for real — i.e. that after a claim, the lists page actually shows the new claim count without a hard refresh. This is where the only-real-Next-runtime confidence lives.

## Recommendation, restated

Adopt **pglite** for DAL + server-action integration tests. Pin `@electric-sql/pglite@0.4.6`, `vitest@4.1.7`, and use `drizzle-orm/pglite`. Add a `sqlstateOf` unwrap helper (or equivalent) in `test/helpers/` to bridge the error-shape divergence. Mock `next/cache` in vitest for cache-tag interaction checks; defer end-to-end cache verification to E2E.

If `test-foundation` discovers a pglite fidelity gap the spike missed, the documented fallback is testcontainers Postgres — same test code, swap the substrate factory.
