# Design — profiles-schema-phase-1

## Context

See proposal.md — Why. Constraints shaping the how:

- neon-http driver: no interactive transactions; each `--> statement-breakpoint` chunk in a migration is its own HTTP round-trip (DATABASE.md). Idempotency per statement, atomicity via constraints + `ON CONFLICT`.
- Migration conventions per `drizzle/0001_black_legion.sql`: forward-only, no DROPs, `IF NOT EXISTS` guards, inline rollback notes, idempotent backfills; generated SQL hand-reviewed and edited.
- `users.name` is nullable in `db/schema.ts` and `profiles.name` is notNull, so the backfill needs a fallback value. `users.email` is deliberately not that fallback: `profiles.name` is a display column and email is shown nowhere in the app today.
- Seed (`scripts/seed-dev-users.ts`) is the canonical e2e fixture — additive entities only, no existing identity changes. `--reset` currently deletes seeded users and lets FKs cascade; profiles deliberately do NOT cascade from users, so reset needs an explicit profile wipe.
- Local-mode auth bypass lives in `lib/auth.ts` (`BYPASS_SESSION_USER`, line ~123).

## Goals / Non-Goals

**Goals:** the four tables, two audit columns, backfills, seed fixtures, and dormant seam from the spec delta — shipped in one forward-only migration plus seed edits, with zero behavior change. Plus the one writer the invariant cannot survive without: the self-profile written at account creation (D7).

**Non-Goals:** any *reader* of the new tables or columns, and any *writer* beyond the self-profile invariant itself (phase 2 / #190, #192, #197, #224); avatar columns (#186 owns); preference catalog rows (#197 owns); active-profile resolution; any UI. Profile-name generation and any matched default avatar are also out of scope — a later map issue owns the vocabulary, the generator, and the sweep that replaces the `UNTITLED` sentinel.

## Decisions

### D1 — Table shapes (Drizzle, `db/schema.ts`)

- `profiles`: `id` text PK `$defaultFn(nanoid)`, `name` text notNull, `user_id` text nullable `references(users.id, { onDelete: 'set null' })`, `created_at`/`updated_at` timestamps defaultNow notNull. Partial unique index `profiles_one_self_per_user_idx` on `user_id` `WHERE user_id IS NOT NULL`.
- `profile_members`: `user_id` text notNull FK → users cascade, `profile_id` text notNull FK → profiles cascade, `role` text notNull, `ride_along` boolean notNull default false, `created_at` defaultNow notNull; PK `(user_id, profile_id)`; CHECK `role IN ('self','owner','manager')`.
- `preferences`: `id` text PK (slug), `name` text notNull, `type` text notNull.
- `profile_preferences`: `profile_id` FK → profiles cascade, `preference_id` FK → preferences cascade, `value` text notNull; PK `(profile_id, preference_id)`.
- `items.updated_by_user_id` / `lists.updated_by_user_id`: text nullable, FK → users `ON DELETE SET NULL`.
- Relations added for all of the above (profiles ↔ users/members/preferences; users gain `memberships`; items/lists gain `updatedBy`).

### D2 — `role` as text + CHECK, not pg enum

Postgres enums are awkward to extend on this driver (ALTER TYPE quirks, no transactional cover); a CHECK constraint makes a future role a one-line migration. Rejected: pg enum.

### D3 — `preferences.id` as text slug, not serial

Self-describing FKs (`'managers_are_recipients'`), stable across environments, no prod/seed id-sync problem. Rejected: serial PK.

### D4 — Backfill in the same migration file, deterministic ids

Order inside one migration, each statement its own chunk:

1. Create tables + index + CHECK (all `IF NOT EXISTS`-guarded).
2. `INSERT INTO profiles (id, name, user_id) SELECT 'self-' || u.id, COALESCE(u.name, 'UNTITLED'), u.id FROM "user" u ON CONFLICT DO NOTHING` — conflict lands on the partial unique index. Deterministic `'self-' || user.id` ids keep re-runs and debugging sane; app-created profiles use nanoid, no collision class overlap worth guarding.

   `UNTITLED` is all-caps because it is a sentinel, not a name: nothing reads `profiles.name` this phase, and the later change that generates real names needs a latch a user could not plausibly have typed. A nameless account is near-theoretical (the sole writer of `users.name` is the NextAuth Google adapter at first sign-in, and Google always returns a name), so this row count is expected to be zero — the fallback exists to satisfy notNull, not to be seen. Ordering the sweep before managed-profile creation, so no user-typed name can collide with the sentinel, belongs to the map issue that owns it; no spec can bind it.
3. `INSERT INTO profile_members (user_id, profile_id, role) SELECT p.user_id, p.id, 'self' FROM profiles p WHERE p.user_id IS NOT NULL ON CONFLICT DO NOTHING` — conflict on PK. Selecting from `profiles` (not `"user"`) also self-heals a user whose membership row was lost.
4. `ALTER TABLE … ADD COLUMN IF NOT EXISTS updated_by_user_id …` for items and lists, then `UPDATE items SET updated_by_user_id = user_id WHERE updated_by_user_id IS NULL` (same for lists) — idempotent, re-run safe.

No pre-flight `DO $$` block needed: purely additive, no invariant to assert beyond what the constraints enforce. Rollback notes inline (DROP TABLE ×4, DROP COLUMN ×2 — data loss limited to profile/membership rows).

### D5 — Seed and reset

- Seed inserts self-profiles + `self` membership rows for all 12 seeded users using the same deterministic `'self-' || id` scheme and `.onConflictDoNothing()`, matching the migration's invariant.
- Managed fixture: `dev-profile-kiddo` (`user_id` null), `dev-test-viewer` as `owner`, `dev-friend-alice` as `manager`.
- No preference rows.
- `--reset`: delete profiles reachable from the seeded users, keyed on the `seededIds` array the user delete already builds — rows whose `user_id` is a seeded id (self-profiles), plus rows carrying a membership held by a seeded user (managed profiles, whose `user_id` is null, and any profile created by hand in local mode). Membership and preference rows cascade from profiles. Order matters: this runs **before** the user delete, which SET-NULLs `profiles.user_id` and cascades memberships away — after it, both handles are gone and the profile is stranded. No id-prefix matching and no unconditional table wipe: blast radius stays identical to today's seeded-user delete.

### D6 — `BYPASS_ACTIVE_PROFILE` seam: env read next to `BYPASS_SESSION_USER`

A documented env var read in `lib/auth.ts`'s local-mode block (alongside `BYPASS_SESSION_USER`), exported for the future resolver but consumed by nothing this phase; LOCALDEV.md documents it as dormant. Minimal form per grilling — no resolution logic, no default behavior change. Rejected: building active-profile resolution now (no reader; designed blind).

### D7 — No `lib/data/` changes

No reads, no actions, no cache tags touched. Spec's "additive only" requirement is the guard; anything needing a read belongs to phase 2.

### D8 — Self-profile written at account creation, not only backfilled

D4's backfill is a point-in-time `SELECT … FROM "user"`. Nothing re-runs it. Every account created after the migration lands — and before #190 repoints `lists`/`items` onto `profiles` — would hold no profile row, and after the repoint could not own a list. The window is permanent, not transient: no later chunk sweeps the orphans, because no chunk owns this. #192 builds the *managed*-profile birth form, #193 the switcher, #194 roles; none writes a self-profile at signup.

NextAuth's `events.createUser` fires once, immediately after the adapter inserts the `users` row. The handler writes the same two rows as D4's chunks 2 and 3 — deterministic `'self-' || user.id`, `name ?? 'UNTITLED'`, `.onConflictDoNothing()` — so the hook and the migration are one statement written twice, and neither can fight the other whatever order they deploy in.

The handler is exported as a named function taking `db`, so `db/__tests__/profiles.test.ts` drives it on the pglite harness directly rather than through NextAuth's callback machinery.

It lives in `lib/auth.ts` beside the other callbacks so D7 holds and this chunk stays additive-only. That placement is provisional and knowingly at odds with `data-layer-organization`'s "single home for data access": #192, which builds the managed-profile birth form, owns moving these inserts into a generic `createProfile` in `lib/data/profile.actions.ts` that both the form and this hook call, with the `data-layer-organization` delta that adds the `profile` domain. Recorded on that issue.

Rejected: a reconciliation check on every sign-in (a read on every request to cover a once-per-account event); a second backfill inside #190 (leaves the window open until then, with the orphaned accounts broken while it is).

Settled at implementation: `signInCallback`'s `user.name` mutation does land first. In `@auth/core`'s callback route, `handleAuthorized` (which runs the `signIn` callback) is called on the provider user object before `handleLoginOrRegister` passes that same object to the adapter's `createUser`, so `events.createUser` receives the composed first + last name. No name composition in the handler.

## Risks / Trade-offs

- [Drizzle generate emits over-broad or unguarded SQL] → hand-edit per DATABASE.md step 3; conventions checklist from `0001_black_legion.sql`.
- [`ON CONFLICT` against a partial unique index requires the matching predicate in some forms] → use `ON CONFLICT DO NOTHING` without target (safe for both conflict paths) or spell the predicate; verified against local Postgres before landing.
- [Seed-as-fixture e2e coupling] → purely additive entities; no existing seeded identity changes; e2e suite untouched.
- [`users.name` null at backfill] → COALESCE to the `UNTITLED` sentinel; no notNull violation possible. Email is not in the chain by choice, not oversight.
- [Stale `'use cache'` after local push/reseed] → documented step: restart dev server (CLAUDE.md hard rule).

## Migration Plan

1. Edit `db/schema.ts`; `npm run db:generate`; hand-edit the generated SQL to conventions (guards, backfills, rollback notes).
2. Local: `npm run dev:local` applies the new shape to the Docker DB via `drizzle-kit push` from `db/schema.ts` — the migration file is not replayed there. Re-run `npm run db:seed:dev`, restart the dev server; verify the profile fixtures and unchanged app behavior via seed assertions and psql spot checks.
3. Migration file: `npm run db:migrate` runs against the Neon database, never the container. Snapshot Neon first. The backfill statements only ever execute there, so step 1's hand-edit is the file's sole review before it runs; rehearsing the backfill against the container means seeding it on the pre-change shape and applying the SQL by hand with `psql`. Forward-only; rollback is the inline manual script (drops new tables/columns only — pre-existing data untouched by construction).
