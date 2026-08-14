# Tasks — profiles-schema-phase-1

## 1. Schema declaration (`db/schema.ts`)

- [x] 1.1 Add `profiles`: `id` text PK `$defaultFn(nanoid)`, `name` text notNull, `user_id` text nullable FK → `users.id` `ON DELETE SET NULL`, `created_at`/`updated_at` timestamps defaultNow notNull.
- [x] 1.2 Add partial unique index `profiles_one_self_per_user_idx` on `profiles.user_id` `WHERE user_id IS NOT NULL`.
- [x] 1.3 Add `profile_members`: `user_id` FK → users cascade, `profile_id` FK → profiles cascade, `role` text notNull, `ride_along` boolean notNull default false, `created_at` defaultNow notNull; composite PK `(user_id, profile_id)`; CHECK `role IN ('self','owner','manager')`.
- [x] 1.4 Add `preferences`: `id` text PK (slug), `name` text notNull, `type` text notNull.
- [x] 1.5 Add `profile_preferences`: `profile_id` FK → profiles cascade, `preference_id` FK → preferences cascade, `value` text notNull; composite PK `(profile_id, preference_id)`.
- [x] 1.6 Add `updated_by_user_id` (text nullable, FK → `users.id` `ON DELETE SET NULL`) to `items` and `lists`.
- [x] 1.7 Add relations: profiles ↔ users / members / preferences; users gain `memberships`; items and lists gain `updatedBy`.
- [x] 1.8 Check the file-size band after 1.1–1.7 (`db/schema.ts` sits at ~303 code lines before this change). If the additions push it past 400, split by table cohesion per CLAUDE.md and repoint `drizzle.config.ts`; a yellow-band file may stay as it is.

## 2. Migration (`drizzle/`)

- [x] 2.1 Run `npm run db:generate`; confirm one new `drizzle/NNNN_*.sql` plus its `meta/_journal.json` entry.
- [x] 2.2 Hand-edit the generated DDL to repo conventions per `drizzle/0001_black_legion.sql`: `IF NOT EXISTS` on every `CREATE TABLE`/`CREATE INDEX`/`ADD COLUMN`, forward-only, no DROPs.
- [x] 2.3 Append the self-profile backfill as its own statement chunk: `INSERT INTO profiles (id, name, user_id) SELECT 'self-' || u.id, COALESCE(u.name, 'UNTITLED'), u.id FROM "user" u ON CONFLICT DO NOTHING`.
- [x] 2.4 Append the `self` membership backfill as its own chunk, selecting from `profiles` (not `"user"`) so a lost membership self-heals: `INSERT INTO profile_members (user_id, profile_id, role) SELECT p.user_id, p.id, 'self' FROM profiles p WHERE p.user_id IS NOT NULL ON CONFLICT DO NOTHING`.
- [x] 2.5 Append the audit-column backfills as their own chunks: `UPDATE items SET updated_by_user_id = user_id WHERE updated_by_user_id IS NULL`, same for `lists`.
- [x] 2.6 Add the inline rollback note (DROP TABLE ×4, DROP COLUMN ×2; data loss limited to profile and membership rows).
- [x] 2.7 Verify the file contains no `BEGIN`/`COMMIT` wrapper and no statement that depends on cross-chunk atomicity (neon-http round-trips each chunk separately).
- [x] 2.8 Rehearse the backfill against the Docker database: seed it on the pre-change shape, apply the migration SQL by hand with `psql`, confirm it succeeds and that a second application is a no-op.

## 3. Seed and reset (`scripts/seed-dev-users.ts`)

- [x] 3.1 Insert a self-profile per seeded user using the same deterministic `'self-' || id` scheme, with `.onConflictDoNothing()`.
- [x] 3.2 Insert a `self` membership row per seeded self-profile, with `.onConflictDoNothing()`.
- [x] 3.3 Insert the managed fixture `dev-profile-kiddo` with `user_id` null, plus `dev-test-viewer` as `owner` and `dev-friend-alice` as `manager`.
- [x] 3.4 Insert no preference rows; leave both preference tables empty.
- [x] 3.5 In `--reset`, delete profiles reachable from `seededIds` — rows whose `user_id` is a seeded id, plus rows carrying a membership held by a seeded user — letting membership and preference rows cascade. No id-prefix matching, no unconditional table wipe.
- [x] 3.6 Place that delete **before** the seeded-user delete, which SET-NULLs `profiles.user_id` and cascades memberships away.

## 4. Dormant active-profile seam

- [x] 4.1 Read `BYPASS_ACTIVE_PROFILE` in the local-mode block of `lib/auth.ts`, alongside `BYPASS_SESSION_USER`, and export it for the future resolver. No resolution logic, no consumer.
- [x] 4.2 Add a `lib/__tests__/auth.test.ts` case asserting the exposed value follows the env var and that session synthesis is unchanged when it is set.
- [x] 4.3 Document it in LOCALDEV.md as a dormant seam consumed by nothing this phase.
- [x] 4.4 Trim the `bypassActiveProfile` comment to its non-obvious WHY: drop the change name and the sentence restating the ternary.

## 5. Self-profile at account creation (`lib/auth.ts`)

- [x] 5.1 Add a `createUser` entry to the NextAuth `events` config that inserts the new account's self-profile — `'self-' || user.id`, name falling back to `UNTITLED`, `user_id` — with `.onConflictDoNothing()`.
- [x] 5.2 Insert the matching `self` membership row in the same handler, also `.onConflictDoNothing()`.
- [x] 5.3 Export the handler as a named function taking `db`, so the pglite harness drives it without NextAuth.
- [x] 5.4 Confirm whether `signInCallback`'s `user.name` mutation lands before `events.createUser` fires; if not, compose first + last in the handler so new self-profiles match backfilled ones.

## 6. Automated schema tests (`db/__tests__/profiles.test.ts`)

- [x] 6.1 New test file on the `bootPglite`/`resetDb` harness, per `db/__tests__/list-subtitle.test.ts`.
- [x] 6.2 The partial unique index rejects a second profile carrying the same non-null `user_id`.
- [x] 6.3 The role CHECK rejects a membership row with a role outside `self`/`owner`/`manager`.
- [x] 6.4 Deleting a user leaves their profile present with `user_id` null and removes their membership rows.
- [x] 6.5 Deleting a user nulls `updated_by_user_id` on the `items` and `lists` rows referencing them.
- [x] 6.6 The exported account-creation handler writes one self-profile plus one `self` membership; a second run against the same account adds nothing.

## 7. Verify against acceptance

- [x] 7.1 Bring the local database up on the new shape (`npm run dev:local` pushes from `db/schema.ts`), re-run `npm run db:seed:dev`, restart the dev server.
- [x] 7.2 psql: every account has exactly one self-profile carrying its name, each with a `self` membership row.
- [x] 7.3 psql: every `items` and `lists` row has `updated_by_user_id` equal to its `user_id`; `preferences` and `profile_preferences` are empty.
- [x] 7.4 psql: a second insert with an existing non-null `user_id` is rejected, and a membership insert with a role outside `self`/`owner`/`manager` is rejected.
- [x] 7.5 psql: deleting a user leaves their profile row present with `user_id` null and their membership rows gone.
- [x] 7.6 Seed check: `dev-profile-kiddo` exists with `user_id` null and both memberships.
- [x] 7.7 Reset check: with a hand-created profile carrying a `dev-test-viewer` membership present, `npm run db:reset:dev` removes it and its memberships, and recreates the seeded fixtures.
- [x] 7.8 App check: open `/lists/dev-list-viewer-birthday`, add an item — the list and the item render as before, and no profile control appears anywhere.
- [x] 7.9 Seam check: set `BYPASS_ACTIVE_PROFILE=dev-profile-kiddo`, start `npm run dev:local`, open `/` — the home digest renders as `dev-test-viewer`, identical to a run with the variable unset.
- [x] 7.10 Signup check: with `npm run dev` against the Neon dev branch, complete Google sign-in on an account that has never used the app — psql confirms one self-profile carrying its name and one `self` membership row; sign out and back in adds no duplicate.

## 8. Pre-merge

All five gates run locally against the author's real `.env.local` before review; this change edits executable files (`db/schema.ts`, seed script, `lib/auth.ts`), so no gate is exempt.

- [x] 8.1 `npm run lint` — zero errors, zero non-size warnings.
- [x] 8.2 `npx tsc --noEmit` — zero errors.
- [x] 8.3 `npm run build` — completes successfully.
- [x] 8.4 `npm run test:coverage` — zero failing tests.
- [x] 8.5 `npm run test:e2e` — zero failing tests.
- [x] 8.6 `openspec validate profiles-schema-phase-1 --strict` — passes.

## Gates — round 1

- [x] A1+B2+C3 drizzle.config.ts env-precedence change — revert or document + reconcile with DATABASE.md — _dropped at adjudication; no work to do, see Round 1 § Adjudications_
- [x] B4 self-profile id scheme + UNTITLED sentinel: one home for the two TS copies — _dropped at adjudication; no work to do, see Round 1 § Adjudications_
- [x] B5 document BYPASS_ACTIVE_PROFILE in .env.example — _dropped at adjudication; no work to do, see Round 1 § Adjudications_
- [x] B6 document dev-profile-kiddo + memberships in LOCALDEV.md § Seeded data coverage
- [x] C7 createSelfProfile two-insert atomicity: backstop or record as accepted residual — _filed #192; no work to do here, see Round 1 § Adjudications_
- [x] C8 seed log says "upserted" but uses onConflictDoNothing — _filed #192; no work to do here, see Round 1 § Adjudications_
- [x] T9 test the 0010 backfill statements over seeded pre-migration data — _dropped at adjudication; no work to do, see Round 1 § Adjudications_
- [x] T10 pin the local-mode seed/reset scenarios, or record the exclusion — _dropped at adjudication; no work to do, see Round 1 § Adjudications_
- [x] T11 test the preferences cascade — _dropped at adjudication; no work to do, see Round 1 § Adjudications_
- [x] T12 SecondManagedProfile_Inserts asserts too little — _dropped at adjudication; no work to do, see Round 1 § Adjudications_
