# Profiles schema phase 1: additive + backfill

Source issue: #189 (part of MAP #181).

## Why

Managed profiles (child, couple, household — account-less) need a home in the schema before anything references them. This is phase 1 of the 3-phase forward-only migration plan from #184: additive + backfill only, so phase 2 (repoint + enforce) and phase 3 (drops) can land as separate soaked steps. No active spec currently governs a profiles data model; no existing spec's requirements change — the app's observable behavior is untouched this phase.

Inherited constraints: DATABASE.md driver rules bind (no interactive transactions; each `--> statement-breakpoint` chunk is its own HTTP round-trip; atomicity via unique/partial-unique indexes + `ON CONFLICT`; cross-statement guards via single `DO $$ ... $$` blocks; forward-only, `IF [NOT] EXISTS`-guarded, idempotent-backfill migration conventions per `drizzle/0001_black_legion.sql`).

## What Changes

Settled by map #181 decisions (#182 revision, #187, #229, #184 — the #184 scout is *(unreviewed)*, carried as provisional):

- New `profiles` table: own id, nullable `user_id` → `users` (`NULL` = managed profile), `ON DELETE SET NULL` — profiles never cascade from `users`; upgrade door (attaching `user_id` later) stays open.
- New `profile_members` table: (user, profile, role `self|owner|manager`); ride-along toggle lives here; rows cascade on user delete. (`self` added by grilling interview 2026-08-14: the backfilled membership row linking a user to their own self-profile, so "profiles this actor owns" is one containment query with self distinguishable from managed ownership.)
- New normalized settings tables: `preferences` catalog (id, name, type) + `profile_preferences` (profile_id, preference_id, value). Both ship empty — no catalog rows this phase; #197 seeds its own.
- New `updated_by_user_id` column (nullable, FK → `users`, `ON DELETE SET NULL`) on `items` and `lists`, backfilled from `user_id`. Last-mutator semantics; stamping is #190, sole reader is #224 — this phase adds + backfills only.
- Backfill: one self-profile per existing user (enforced by partial unique index on `profiles.user_id`, idempotent via `ON CONFLICT`) plus a `self` membership row per self-profile. The index bounds self-profiles only — owned managed-profile count is unbounded via `profile_members`.
- Self-profile at account creation: a NextAuth `createUser` event writes the self-profile plus its `self` membership for every new account, with the same deterministic ids and `ON CONFLICT` as the backfill. (Added 2026-08-14: the backfill alone is a point-in-time pass over existing rows, so every account created between this migration and #190's repoint would be permanently profile-less — and unable to own a list once `lists`/`items` point at `profiles`. No map chunk owned this; #192 builds the *managed*-profile birth form, #193 the switcher, #194 roles.)
- Seed: profile fixtures, a managed-profile fixture, a manager row, and a `BYPASS_ACTIVE_PROFILE` seam in minimal dormant form (env read at the local-mode session synth; no reader until phase 2); `db:reset:dev` gains an explicit profile wipe.
- Nothing existing changes shape: no drops, no repoints, no FK enforcement beyond the new columns themselves.

## Capabilities

### New Capabilities

- `profiles-data-model`: the profiles schema contract — `profiles`, `profile_members` (roles `self|owner|manager`), `preferences`/`profile_preferences`, the `updated_by_user_id` actor-audit columns on `items`/`lists`, the self-profile backfill invariant (one per user, `self` membership row), and the no-cascade-from-`users` deletion rule.

### Modified Capabilities

None — additive schema only; no existing spec's observable behavior changes this phase. (Repoints and behavior changes land in later chunks under their owning specs.)

## Impact

- `db/schema.ts` — four new tables, two new columns, relations.
- `drizzle/` — one new forward-only migration (generated, then hand-edited to repo conventions).
- `scripts/seed-dev-users.ts` — profile fixtures, managed-profile fixture, manager row, profile wipe in `--reset`.
- `lib/auth.ts` — a NextAuth `events.createUser` handler writing the new account's self-profile and `self` membership; plus the existing `BYPASS_ACTIVE_PROFILE` seam.
- `db/__tests__/profiles.test.ts` — new: constraint, cascade, and account-creation coverage on the existing pglite harness.
- Local-mode session seam — `BYPASS_ACTIVE_PROFILE` alongside `BYPASS_SESSION_USER`; LOCALDEV.md documents it.
- No `lib/data/` reads or actions change — no cache tags consumed or revalidated this phase.
- No UI surfaces touched; no primitive-family specs implicated.
