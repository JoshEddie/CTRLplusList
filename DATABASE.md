# Database notes

Read this file before adding or modifying DB queries, DAL functions, or schema migrations.

## Driver: no transactions

The DB layer uses `drizzle-orm/neon-http` over Neon's HTTP API. **Interactive transactions are not supported on this driver.** Do not introduce `db.transaction(async (tx) => { … })`, `SELECT … FOR UPDATE`, or any code that assumes a multi-statement session — every query is its own HTTP round-trip with its own connection.

Concrete implications:

- Race conditions that need cross-statement atomicity must be backstopped at the DB layer (unique indexes, partial unique indexes, `ON CONFLICT` clauses), or accepted as residual.
- **Two or more writes that need atomicity go in one data-modifying CTE** — one statement is one implicit transaction, so a constraint violation anywhere in it rolls back every branch, the inner INSERT included, and FK triggers fire at end of statement so a child row may reference a parent created alongside it. Drizzle expresses it as `db.$with()` over an INSERT body; `createSelfProfile` in [lib/data/profile.self.ts](lib/data/profile.self.ts) is the worked example. The uniqueness backstop then raises rather than returns, so a caller wanting idempotency catches the SQLSTATE narrowed to the index it means.
- **A cross-row cardinality floor is a guard folded into the mutating statement, never a read-then-write.** "At least one owner survives" cannot be expressed by a unique index — uniques bound a set from above, not below — and a count read followed by a delete decides on state that has already moved by the time the delete lands. Write it as `DELETE … AND EXISTS (SELECT 1 … WHERE <the survivor condition>)` over an alias of the same table, with zero rows affected as the refusal, so the check evaluates at statement time. The residual window under true concurrency stays open, so this shape is only chosen where the state it lands in is one the application already tolerates by another route. `removeMember` in [lib/data/profile.members.actions.ts](lib/data/profile.members.actions.ts) is the worked example.
- **Never replace a uniqueness constraint by drop-then-create.** With no interactive transaction to hold the pair, the window between them is unprotected, and a duplicate that lands in it is recorded permanently — the new index cannot be created over data that already violates it. Add the replacement beside the old one, then drop the old one in a later statement.
- Do not propose switching to `drizzle-orm/neon-serverless` / WebSocket Pool without explicit owner approval — it's been considered and declined.
- If you find code claiming to use a transaction here, it's broken; convert it to single-statement + DB-constraint enforcement instead.

See [db/index.ts](db/index.ts) for the driver instantiation.

## Migrations

The migration workflow uses Drizzle Kit against the schema declared in [db/schema.ts](db/schema.ts).

**Authoring a migration:**

1. Edit the schema file (e.g. add a column, table, or index).
2. Generate SQL: `npm run db:generate`. This writes a new `drizzle/NNNN_<slug>.sql` plus a `meta/_journal.json` entry.
3. **Review the generated SQL before running it.** Drizzle 0.45 occasionally emits over-broad statements (e.g. unnecessary column rewrites) and never adds the safety wrappers we want (pre-flight `DO $$ ... $$` assertions, `IF [NOT] EXISTS` guards on DDL, explicit `ON CONFLICT` clauses, idempotent backfills). Hand-edit the file if needed — see [drizzle/0001_black_legion.sql](drizzle/0001_black_legion.sql) for the conventions (forward-only, no DROPs, `IF [NOT] EXISTS` on every `CREATE`/`ALTER`/`DROP` so a migration still applies cleanly if a table or column was added manually out-of-band, pre-flight assertion blocks, inline rollback notes in comments).
4. Apply locally: `npm run db:migrate`. Then restart the dev server so any `'use cache'`-tagged DAL functions re-fetch.
5. Re-run `npm run db:seed:dev` if the schema change broke the seed (the seed refuses to run on prod via the same `NODE_ENV` guardrail as the bypass).

**Driver caveat:** the migration runtime uses the same Neon HTTP driver as the app — see the "Driver: no transactions" section above. **A single migration file cannot wrap multiple statements in `BEGIN ... COMMIT` and expect atomicity across them.** Each `--> statement-breakpoint`-separated chunk runs as its own HTTP round-trip. If you need cross-statement atomicity (e.g. "create constraint only if no violating rows exist"), encode it in a single `DO $$ ... $$` block, or split the migration into two PRs with a soak between them.

**Order every schema change additive first, backfill, then tighten.** Add the new column or index nullable and unconstrained, backfill it idempotently (each statement touching only rows still unset, so a re-run is a no-op), and only then `SET NOT NULL` or add the constraint — each tightening gated on its own backfill having left nothing behind. A tighten that runs before its backfill fails against production data volumes that local testing never reproduces.

**Preserved legacy artifacts:** migration `0001_black_legion.sql` deliberately preserves the pre-1.0 `saved_lists` table and `lists.shared` column for a soak period, backfilling pre-1.0 saves into `list_visits` as bookmarks. `saved_lists` was dropped once the soak ended, by `0011_illegal_wind_dancer.sql`; `lists.shared` remains. Returning users see a one-time `BookmarkMigrationToast` on `/` explaining the social-model change (share-lists → follow-users).

**Production migrations:** run via `npm run db:migrate` against the prod connection string, after a snapshot. The `drizzle/meta/_journal.json` is the source of truth for which migrations have applied.
