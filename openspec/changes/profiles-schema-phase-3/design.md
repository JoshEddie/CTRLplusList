## Context

See proposal.md — Why. What shapes the approach here is one fact and one constraint.

The fact: `drizzle/0010_late_chamber.sql` and `drizzle/0011_illegal_wind_dancer.sql` are on `dev` only — not on `origin/main`, no tags — and the owner's Neon dev branches are reset from production at each release. Nothing that survives carries phase-1 data. That makes phase 1 *editable* rather than *appendable*, which is the lever every decision below turns on.

The constraint: `drizzle-orm/neon-http` offers no interactive transactions and no `SELECT … FOR UPDATE` (`DATABASE.md`). Atomicity has to come from the database layer or be accepted as residual.

Two facts about the toolchain were verified rather than assumed, because both would have silently broken things:

- **PGlite 0.4.6 has no `pgcrypto`.** `CREATE EXTENSION pgcrypto` fails outright, and `test/helpers/db.ts:35-53` replays every migration file on every test-file boot — so `gen_random_bytes()` in a migration would fail the whole suite at boot. `gen_random_uuid()`, `decode`, `get_byte`, and `LANGUAGE sql` functions all work.
- **Drizzle never compares migration hashes.** `drizzle/meta/_journal.json` records `idx`/`version`/`when`/`tag`/`breakpoints` and no hash; `drizzle-orm/pg-core/dialect.js:56-69` reads only the newest applied row and applies a file iff `last.created_at < file.folderMillis`. Editing an applied migration is silently skipped, never an error.

## Goals / Non-Goals

**Goals:**

- End state where no account-valued superseded column, and no `profiles.user_id`, exists in the schema or in any migration's output.
- Self-profile ids indistinguishable from app-minted ones — same generator alphabet, same length.
- `profile_members` as the single, constrained profile↔account link.
- Active specs that describe the shipped schema.

**Non-Goals:**

- **Membership containment for *switching*.** This change makes `profile_members` the identity link. It does not add "profiles this account may act as" resolution, an active-profile seam, or owner/manager authorization — that is [#193](https://github.com/JoshEddie/CTRLplusList/issues/193)/[#194](https://github.com/JoshEddie/CTRLplusList/issues/194).
- **Branded `AccountId`/`ProfileId` types.** The cross-kind silent-mismatch hazard is real and is [#304](https://github.com/JoshEddie/CTRLplusList/issues/304)'s, whose scout runs once every chunk has landed.
- **The wider spec-hygiene sweep.** Only requirements this change falsifies are touched; migration-mechanics requirements that remain technically true stay grandfathered.
- **Relocating `createSelfProfile`.** [#199](https://github.com/JoshEddie/CTRLplusList/issues/199) moves it out of the NextAuth event into the onboarding submit action. This change alters what it writes, not where it is called from.

## Decisions

### D1 — Rewrite phase 1 in place; ship no re-id migration

The proposal originally planned a forward re-id: mint new ids and update eight FK columns. Rewriting `drizzle/0010_late_chamber.sql:95` instead means no row ever carries a `self-` id, so there is nothing to re-id.

*Alternatives.* A **forward re-id migration** buys "never edit an applied migration" and costs a cross-FK update with no transaction available — the exact atomicity problem this change otherwise never has. **Both** (rewrite plus a `WHERE id LIKE 'self-%'` guarded re-id) is the correct answer only if some database that cannot be wiped already ran the old `0010`; the owner confirmed none does, which makes the guarded path dead code against every database that matters.

*Consequence.* Any local database that already applied the old `0010` will **not** pick up the edit — drizzle skips it by timestamp. `npm run db:reset:dev` is data-only and does not replay DDL, so such a database needs a full rebuild, not a reseed. This is the single operational cost of D1 and it is named in the migration plan.

### D2 — Mint nanoid-shaped ids in SQL, from `gen_random_uuid()`

Two `gen_random_uuid()` calls concatenated give 32 random bytes; masking each byte to 6 bits (`& 63`) indexes nanoid's 64-character alphabet with no modulo bias, and 21 characters out matches the JS generator exactly. Wrapped in a `LANGUAGE sql VOLATILE` function that the migration creates, uses, and drops.

*Why a function and not an inline expression.* A non-correlated `LATERAL` is hoisted into an InitPlan and returns **the same id for every row** — verified, 100 rows and 1 distinct id. Correlating it works but is a trap for the next reader; a `VOLATILE` function sidesteps the whole class.

*Alternatives.* **`gen_random_bytes(21)`** is the natural call and is unavailable (see Context). **`gen_random_uuid()::text`** is one line but yields a 36-char hex id beside 21-char nanoids — a visible second id shape, which is the thing being removed. **Keeping the function as a column `DEFAULT`** would make one generator serve migrated and app-created rows forever; rejected because `profiles` would become the only table in `db/schema.ts` whose id comes from the database while `users`, `items`, `lists` and `purchases` all mint theirs in JS, and because the owner trusts the JS `nanoid` over a hand-rolled SQL one for the live path.

*On the duplicated alphabet.* The 64-character string exists in the migration and in the `nanoid` package. It is inert: it runs once, over accounts existing at migration time, and never again. The alphabet must stay exactly 64 characters — at 63, `substr` returns empty for byte value 63 and silently emits short ids.

### D3 — `profile_members` is the sole profile↔account link

`profiles.user_id` and `profiles_one_self_per_user_idx` drop. Two partial uniques over the membership table replace them: `(user_id) WHERE role = 'self'` and `(profile_id) WHERE role = 'self'`.

Both directions carry weight. The account-side index is the map's "one self-profile per account". The profile-side index is what makes an asserter profile resolve back to exactly one human — the injectivity `claim-attribution` traverses, which a single account-side index would leave unenforced.

*Alternative rejected.* Keeping the column as a deliberate denormalization and documenting it. Rejected on the demotion recorded at [#182](https://github.com/JoshEddie/CTRLplusList/issues/182): one fact in two unconstrained stores is a normalization violation, and the two are *designed* to disagree after account deletion.

### D4 — `createSelfProfile` is one data-modifying CTE

The profile row must exist before the membership row referencing it, and the membership row is now the only thing that makes the profile reachable. A conflict on the second insert would strand the first as an unreachable, permanent orphan.

One statement is one implicit transaction, which `neon-http` cannot split:

```sql
WITH new_profile AS (
  INSERT INTO profiles (id, name) VALUES ($1, $2) RETURNING id
)
INSERT INTO profile_members (user_id, profile_id, role)
SELECT $3, id, 'self' FROM new_profile
```

No `ON CONFLICT`. A duplicate self-membership raises `23505` and rolls the profile insert back with it. The caller catches it and returns successfully — that *is* the idempotency `profiles-data-model` requires.

*Verified, not assumed.* On PGlite 0.4.6 and on real PostgreSQL 15.18: both rows insert; the second run throws and leaves the profile table with exactly one row. The FK is satisfied even though the referenced row is created in the same statement, because FK triggers fire at end of statement. Drizzle 0.45.2 expresses this natively — `db.$with(...)` accepts an INSERT body (`PgInsertBase implements TypedQueryBuilder`), type-checks under strict, and needs no raw-SQL escape hatch.

*The catch must be narrowed.* `lib/sqlstate.ts` returns the bare code, so a blanket `23505` catch would also swallow a future unique violation elsewhere in the statement. The error's `cause` carries `constraint` — the *index* name, since a partial unique index has no `pg_constraint` row — so a companion accessor unwrapping `err.cause.constraint` with the same shape `sqlstateOf` already uses lets the catch name the index it means.

*Alternatives.* **Guard on `NOT EXISTS` plus `ON CONFLICT DO NOTHING`** leaves an orphan under true concurrency; acceptable as a documented residual, and strictly worse than a shape with no residual at all. **Compensating delete** needs a third round trip and still orphans if the process dies mid-sequence. **Upsert with a no-op `DO UPDATE` to force `RETURNING`** is one round trip but writes an update whose only purpose is to make a clause fire — unreadable at 3am.

### D5 — Edit `0010` and `0011` in place; never touch the journal

`0011`'s pre-flight (`:27-35`) and seven backfill joins (`:86+`) reach accounts through `profiles.user_id` and become two-hop joins through `profile_members`. The drops ship as a new migration.

**`drizzle/meta/_journal.json` is not edited.** Drizzle applies by timestamp; bumping `0010`'s `when` would replay it in full — `CREATE TABLE`s included — against production.

*Alternative rejected.* Collapsing `0010` and `0011` into one file. Cosmetic, and it deletes a journal entry while orphaning two archived changes that describe those files by name.

### D6 — One helper for the profile→account resolution

Fourteen sites (`lib/data/profile.ts:19,48,74,114,215,220,226,234-235,262`; `lib/data/user.ts:51,129`; `lib/data/profile.actions.ts:133`) go from `eq(profiles.user_id, users.id)` to a join through `profile_members` filtered to `role = 'self'`. Fourteen inline copies of a two-hop join is the drift hazard CLAUDE.md's duplication rule names — structure, and silent divergence. One helper carries it.

The fourteenth sits outside the read modules: `blockUser`'s reverse-edge lookup, which resolves the blocked profile's account to delete the follow edge running back. `following` pins it as an ordered statement of that mutation — behind the block-row insert, ahead of nothing — so it takes the helper without moving in the sequence, and the helper stays a single round-trip for the same reason.

Where it lives is [#304](https://github.com/JoshEddie/CTRLplusList/issues/304)'s call; here it goes to `lib/data/profile.ts`, which already owns identity resolution.

### D7 — The id factory keeps its output and loses its production claim

`lib/profileIds.ts` is deleted. The dev seed and test fixtures still want a deterministic profile id, and the owner ruled its shape irrelevant — so it keeps producing the same strings. Keeping the output means the ~20 test files importing it and the two `/user/self-…` URLs in `e2e/follow.auth.spec.ts` need no edit at all; only the module's home and its header comment change, the latter because it currently claims to be the production scheme and to be reproduced by the phase-2 backfill (only phase 1 ever did).

### D8 — `seedUsers` seeds the `self` membership

Every fixture profile now needs a membership row for the two-hop reads to resolve. Putting it in `seedUsers` and the seed-graph helpers keeps individual test files unchanged; doing it per test would touch dozens of files and rot at the first new one.

### D9 — Tag the reads, write no `updateTag`

`getEligiblePurchasers` (and any other `'use cache'` read that gains the join) takes `cacheTag('profile_members')`, which `claim-attribution`'s pool-read requirement enumerates alongside the two tags it already names. `createSelfProfile` gets no `updateTag`: the only membership write is a brand-new account's, which holds no follow edges and therefore cannot change any existing pool. The tag is inert until a writer that matters appears, and correct the moment one does.

Most of the thirteen sites are unaffected by this — they sit in uncached functions, or in `getUserIdentity`, which uses request-scoped React `cache()` and by its own comment carries no tag obligation.

### D10 — Spec routing: falsified only, and remove what was never spec material

Per the grandfathered-scenario rule in `/embark-design`: a requirement this change makes false is ruled on — *should it have been a spec?* Yes gives a MODIFIED block; no gives a REMOVED block whose contract migrates to the prose channel carrying it, with any surviving scenarios re-added under a new name. Requirements that remain technically true stay untouched however plainly they fail today's bar.

Four `profiles-data-model` requirements are removed as migration mechanics; three surviving behaviors are re-added under new names.

Four more requirements are falsified without being migration mechanics, so each is rewritten in place rather than removed: `profiles-data-model`'s dev-seed requirement (its `db:reset:dev` wipe reaches profiles by `profiles.user_id`, leaving membership the sole handle once the column goes), `following`'s no-transactions requirement (two scenarios name the `profiles` lookup in `blockUser`'s statement sequence), and `claim-attribution`'s claim-modal and self-claim-suppression requirements (three normative references to the dropped `purchases.claimed_by`, plus the pool-read tag list D9 extends). Where one of those requirements carries a clause that fails today's bar but this change does not falsify — the pool read's `lib/data/user.ts` home, which has since moved — the clause stays exactly as written. Reproducing a requirement is not licence to sweep it; `spec-hygiene` owns that.

One decision here is this change's own and earns an entry. The other two rules are rescues — decided earlier, homeless because this change removes the requirement that carried them.

- **Entry** — `2026-08-18-atomic-writes-in-one-cte`, **Touching** `DATABASE.md`. Derived and verified at D4; `DATABASE.md`'s application-side atomicity list omits the technique and `:29`'s `DO $$` answer is migration-scoped. Two tasks carry it: the entry into `openspec/adr/`, the **Decision** into `DATABASE.md` citing it.
- **Rescue** — never replace a uniqueness constraint by drop-then-create under a driver with no interactive transactions; the gap permanently double-records. Decided at phase 1 and mandated by the index requirement this change removes. Plain doc edit to `DATABASE.md`, no entry: the decision was not made here, and an entry dated today would say it was.
- **Rescue** — additive first, backfill, then tighten: the migration-ordering doctrine the removed column-mapping requirement encoded. Same treatment, same destination.

Without the entry the next session re-derives D4's verification, which is what happened here — two agent runs deep, and none of it cheaper the second time.

**`claim-attribution`'s Purpose line names both dropped columns.** A delta's `## Purpose` is ignored for an existing capability, so this one is edited directly on `openspec/specs/claim-attribution/spec.md` at apply time.

## Risks / Trade-offs

- **A local database that ran the old `0010` silently diverges** → drizzle skips the edited file by timestamp and `db:reset:dev` is data-only, so it keeps `self-` ids and a `profiles.user_id` column while the code expects neither. Mitigation: rebuild rather than reseed, in the migration plan below. The pglite suite is immune — it replays every file on every boot.
- **`23505` is raised, not returned, on the idempotent path** → a blanket catch would swallow unrelated unique violations in the same statement. Mitigation: narrow on `err.cause.constraint` against the self-role index name (D4).
- **Two-hop joins across fourteen read sites** → each is a place to get the join direction or the `role` filter wrong, and a wrong profile-vs-account comparison type-checks and evaluates false for every row rather than failing. Mitigation: one helper (D6), and `npx tsc --noEmit` catches every reference to a dropped column outright.
- **The SQL alphabet is a second copy of nanoid's** → drift would produce ids of a different shape. Mitigation: it executes once and never again; the 64-character length is the only invariant, and a wrong length yields visibly short ids rather than silent skew.
- **[#199](https://github.com/JoshEddie/CTRLplusList/issues/199) also rewrites `createSelfProfile`** → whichever lands second inherits the other's shape. The edits are compatible (where it is called vs. what it writes), and [#302](https://github.com/JoshEddie/CTRLplusList/issues/302)'s latch turns on profile and avatar-row existence rather than an id string — but its "has a self-profile" test now resolves through membership.

## Migration Plan

1. Rewrite `drizzle/0010_late_chamber.sql`: no `profiles.user_id` column, no `profiles_one_self_per_user_idx`; the two self-role partial uniques on `profile_members`; the backfill mints ids through the temporary `nanoid()` function, which is dropped before the file ends. The membership backfill already selects `p."id"` from `profiles` and needs no change.
2. Rewrite `drizzle/0011_illegal_wind_dancer.sql`'s pre-flight assertion and seven backfill joins to reach accounts through `profile_members`.
3. Add the drop migration: the eight superseded columns, their indexes, and `purchases_item_user_unique_idx`.
4. Leave `drizzle/meta/_journal.json` alone.

**Rebuild, do not reseed.** Any database that applied the old `0010` must be dropped and rebuilt from the migration files — `db:reset:dev` will not do it. The e2e and local Docker databases are built by `drizzle-kit push` off `db/schema.ts` and carry no migration ledger, so they follow the schema automatically.

**No down-migration**, consistent with the three-phase plan settled on [#184](https://github.com/JoshEddie/CTRLplusList/issues/184). The drops are irreversible by design; the phase-1 and phase-2 rewrites are reversible only by reverting the files, which is safe precisely because nothing that survives has run them.

**Production path.** CI's `pre-promote-migrate` job branches the production project copy-on-write and replays every migration onto it (`.github/workflows/ci.yml:92-143`), so the rewritten `0010`/`0011` are exercised against production data shape before promotion. Production itself has run neither, so it reaches the end state in one forward pass.
