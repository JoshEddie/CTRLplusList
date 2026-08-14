---
review: spec-review
target: profiles-schema-phase-1
anchor: 7822e95928227aa3db815c935e78af6b23c7eb07
diff-source: git diff --staged
round: 2
---

## Round 1 — spec-review (2026-08-14)

Schema, migration, auth hook and seed work is coherent, additive, and matches the delta spec's data model; the gaps are traceability (four backfill scenarios and both seed scenarios have no named test), three copies of the self-profile id scheme, and an undocumented drizzle-kit env-precedence change.

**Scope:** `git diff --staged` · profiles-schema-phase-1 (active)

### Alignment

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| A1+B2+C3 | Minor | [drizzle.config.ts:1](drizzle.config.ts:1) | dotenv load changed from `import 'dotenv/config'` to `config({ path: ['.env.local', '.env'] })`, flipping which file resolves `DATABASE_URL` for every drizzle-kit command. No task, design line, or spec requirement covers it; `.env.local` holds the Neon string, so DATABASE.md's "Apply locally" step 4 and its "Production migrations" step now resolve to the same DB with nothing distinguishing them, and drizzle-kit has no localhost boot guard. `scripts/seed-dev-users.ts:24` still uses bare `dotenv/config`, so the two DB entry points load env differently. | Fix now — revert, or record it as required tooling support under tasks section 2 and reconcile with DATABASE.md's migration steps | tasks.md (no covering task); DATABASE.md § Migrations step 4 + "Production migrations" |

### Boundary

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| B4 | Minor | [lib/auth.ts:55](lib/auth.ts:55) | Self-profile identity scheme written three times — `self-${user.id}`, `selfProfileId()` in the seed, `'self-' \|\| u."id"` in the migration — plus the `UNTITLED` sentinel in two of them. The two TS copies are identical by design (the seed asserts the coupling in a comment, not in code) and would drift silently, leaving seeded and backfilled self-profiles as different rows with no failure. Export the id helper + sentinel from `lib/auth.ts` and import in the seed. | Fix now | CLAUDE.md § Duplication (3+ copies; silent-drift hazard) |
| B5 | Minor | [lib/auth.ts:152](lib/auth.ts:152) | New `process.env.BYPASS_ACTIVE_PROFILE` read has no `.env.example` entry, though that file's own contract is to stay in sync with every `process.env.*` reference and already documents sibling `BYPASS_SESSION_USER`. | Fix now | `.env.example` header + dev-bypass block |
| B6 | Minor | [scripts/seed-dev-users.ts:680](scripts/seed-dev-users.ts:680) | New deterministic fixtures (`dev-profile-kiddo`, `owner`/`manager` memberships) gain no entry in LOCALDEV.md § Seeded data coverage — the doc's home for exactly these states. The id `BYPASS_ACTIVE_PROFILE` is meant to take is discoverable only from source. | Fix now | LOCALDEV.md § Seeded data coverage (unchanged by this diff) |

### Convention

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| C7 | Minor | [lib/auth.ts:53](lib/auth.ts:53) | `createSelfProfile` does two independent inserts (profiles, then profile_members) with no cross-statement atomicity; neon-http has no transactions, so a crash between them leaves an account with a self-profile and no `self` membership, and nothing re-heals it — the migration backfill is a point-in-time SELECT that never re-runs. Neither backstopped at the DB layer nor recorded as accepted residual. | Fix now — backstop or record as accepted residual in design.md | DATABASE.md § driver limits (no transactions) |
| C8 | Minor | [scripts/seed-dev-users.ts:709](scripts/seed-dev-users.ts:709) | Profile/membership inserts use `.onConflictDoNothing()`, so reseeds do not pick up edits to a seeded profile's name or role, but the log line reports them as "upserted" — the message states behavior the code lacks. | Fix now | LOCALDEV.md contract distinguishing `onConflictDoUpdate` ("reseeds pick up edits") from `onConflictDoNothing` |

### Testing

| # | Severity | Location | Finding | Disposition | Citation |
|---|----------|----------|---------|-------------|----------|
| T9 | Major | [drizzle/0010_late_chamber.sql:96](drizzle/0010_late_chamber.sql:96) | Four backfill scenarios (idempotent backfill, nameless→`UNTITLED`, backfilled self membership, backfill copies current owner) have no named test. `bootPglite` replays migrations against an empty DB, so all four statements run over zero rows and nothing asserts their result; `profiles.test.ts` covers only the runtime `createSelfProfile` path, a different code path. The backfill is re-runnable by design, so a test can seed pre-migration-shaped rows and re-execute the 0010 statements. | Fix now — add a backfill test in `db/__tests__/` | 4 backfill scenarios in specs/profiles-data-model/spec.md; TESTING.md § Test quality bar |
| T10 | Major | [scripts/seed-dev-users.ts:632](scripts/seed-dev-users.ts:632) | Both local-mode seed scenarios unpinned — nothing exercises the seed script. Not trivial glue: the reset branch carries a stated ordering hazard (profiles deleted before seeded users, else `SET NULL` + cascade strands rows) and an `or(..., in(subquery over profile_members))` reachability query. A regression strands profiles silently — reseed's `onConflictDoNothing` leaves stale rows rather than failing. | Fix now — extract the reset/seed step for a pglite-backed test, or record seed scripts as a deliberate test exclusion on the change and downgrade the scenarios | 2 local-mode seed scenarios in specs/profiles-data-model/spec.md |
| T11 | Minor | [db/schema.ts](db/schema.ts) | "Tables exist and are empty after migration" and the preferences cascade clause (value rows cascade when profile or catalog entry is deleted) have no named test; `profiles.test.ts` never touches `preferences`/`profile_preferences`. It is the only behavior these tables have this phase and is cheap to pin in the existing pglite fixture. | Fix now — add a preferences cascade test | preferences requirement + scenario in specs/profiles-data-model/spec.md |
| T12 | Minor | [db/__tests__/profiles.test.ts:62](db/__tests__/profiles.test.ts:62) | `SecondManagedProfile_Inserts` inserts two managed profiles but asserts only that exactly one row is named 'Kiddo' — the test passes unchanged if the second insert failed, so it does not constrain the behavior its name implies (partial unique index does not bind NULL `user_id`). | Fix now — assert both ids persist; name for the NULL-not-bound behavior | TESTING.md § Test quality bar, Precision principle |
| T13 | Minor | specs/profiles-data-model/spec.md | "Existing schema untouched" has no named test, but is structurally evidenced: migrations replay in order for the whole suite, and 0010 contains only `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / `ADD CONSTRAINT` / `CREATE INDEX` — no DROP, no retype. | Drop — no dedicated test warranted | additive-only scenario in specs/profiles-data-model/spec.md |

### What looks good

- Migration is strictly additive and idempotent-by-construction (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `WHERE ... IS NULL` guards) — safe to re-run.
- No `db.transaction` anywhere; atomicity sought via partial-unique indexes + `ON CONFLICT`, per the driver rule.
- `openspec validate profiles-schema-phase-1 --strict` passes; every `tasks.md` item is `[x]`.
- New `db/__tests__/profiles.test.ts` pins the constraint surface (one-self-profile-per-user, role CHECK) against real pglite migration replay rather than mocks.

**Verdict:** findings remain — blockers: A1+B2+C3, B4, B5, B6, C7, C8, T9, T10, T11, T12. CI unverified (non-PR invocation) — re-check before archive.

### Adjudications (2026-08-14)

| # | Old → New | Rationale |
|---|-----------|-----------|
| A1+B2+C3 | Fix now → Drop | No `.env` file exists, so the prior `import 'dotenv/config'` resolved nothing — the change gives drizzle-kit a connection string it never had, rather than flipping precedence. `dev-local.sh`/`setup-e2e-db.sh` export `DATABASE_URL` into the environment and dotenv never overrides, so the Docker path is untouched; DATABASE.md needs no reconciliation (design.md step 3 already states `db:migrate` runs against Neon, never the container). |
| B4 | Fix now → Drop | [#192](https://github.com/JoshEddie/CTRLplusList/issues/192) already owns the permanent home for profile creation, and its carry-over comment records the `self-<userId>` scheme, the `UNTITLED` sentinel and the move into `createProfile`. No action left to take here. |
| B5 | Fix now → Drop | Local-mode-only dormant seam; LOCALDEV.md § Active profile documents it and `.env.example`'s dev-bypass block declares no bypass keys at all. |
| C7 | Fix now → File issue | Whether the two-insert window is closed depends on the shape `createProfile` takes in [#192](https://github.com/JoshEddie/CTRLplusList/issues/192); recorded there with the single-statement CTE option — [comment](https://github.com/JoshEddie/CTRLplusList/issues/192#issuecomment-5295624889). |
| C8 | Fix now → File issue | Same carry-over: if #192 changes how seeded profiles are written, the `upserted` wording is fixed with it — [comment](https://github.com/JoshEddie/CTRLplusList/issues/192#issuecomment-5295624889). |
| T9 | Fix now → Drop | Backfills run once, on one migration. A permanent test over immutable forward-only SQL spends suite time testing nothing; task 2.8 rehearsed the statements against Docker on pre-change data, and the `createSelfProfile` tests pin the same semantics on the path that does re-run. |
| T10 | Fix now → Drop | Seed scripts are tested by what they were designed for — e2e runs and visual click-through, not unit tests. `scripts/**` is already outside `coverage.include`; this change does not move that line. |
| T11 | Fix now → Drop | Both preference tables ship empty with no writer and no reader this phase; the feature that puts contents in them owns testing them. |
| T12 | Fix now → Drop | The managed-profile test surface is [#192](https://github.com/JoshEddie/CTRLplusList/issues/192)'s work, not this change's. (The review's stated failure mode also does not exist: both rows go in one batched INSERT, which throws as a whole if the second is rejected.) |

**Verdict:** findings remain — blocker: B6.

## Round 2 — recheck (2026-08-14)

Round 1's single remaining open `Fix now` (B6) is resolved — `LOCALDEV.md` § Seeded data coverage now carries a `### Profile coverage` subsection whose every claim checks out against `scripts/seed-dev-users.ts`. No new findings.

**Scope:** `git diff` (unstaged working tree, on anchor `7822e95`) · profiles-schema-phase-1 (active)

### Prior findings

| # | Prior finding | Status | Notes |
|---|---------------|--------|-------|
| B6 | LOCALDEV.md § Seeded data coverage missing the new profile fixtures | resolved | [LOCALDEV.md:46](LOCALDEV.md:46) adds `### Profile coverage` under `## Seeded data coverage`. Verified against source, not diff: `self-<userId>` matches `selfProfileId` ([scripts/seed-dev-users.ts:91](scripts/seed-dev-users.ts:91)), `dev-profile-kiddo` matches `KIDDO_PROFILE_ID` (:92), viewer `owner` + alice `manager` memberships match the insert (:709), `name = the user's` matches `name: u.name`, empty preference tables match (no `preferences` insert), and the `.onConflictDoNothing()` / `db:reset:dev` contrast matches the reset branch (:632). Names the id `BYPASS_ACTIVE_PROFILE` takes, closing the "discoverable only from source" gap. |
| A1+B2+C3, B4, B5, C7, C8, T9, T10, T11, T12 | — | not re-litigated | Effective disposition set by Round 1 § Adjudications (`Drop` / `File issue`); never blocking. |

**Verdict:** clear to land.
