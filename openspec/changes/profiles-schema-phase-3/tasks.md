## 1. Schema declarations

- [x] 1.1 In `db/schema.ts`, drop the eight superseded column declarations: `lists.user_id`, `items.user_id`, `purchases.user_id`, `purchases.claimed_by`, `user_follows.followee_id`, `user_blocks.blocker_id`, `user_blocks.blocked_id`, and `profiles.user_id` (with its FK to `users`).
- [x] 1.2 Drop `purchases_item_user_unique_idx` and `profiles_one_self_per_user_idx` from `db/schema.ts`.
- [x] 1.3 Add the two self-role partial uniques on `profile_members` — `(user_id) WHERE role = 'self'` and `(profile_id) WHERE role = 'self'` — per design D3, both directions load-bearing.
- [x] 1.4 Delete the Drizzle `relations` entries for every dropped column: the `one()` sides (~307, ~340, ~345, ~364, ~424, ~480, ~485) and the seven `many()` sides on `usersRelations` (~383–392).
- [x] 1.5 Confirm `npx tsc --noEmit` now fails only on genuine call sites of the dropped columns, and record that list as the work queue for sections 3–6.

## 2. Migrations

- [x] 2.1 Rewrite `drizzle/0010_late_chamber.sql`: remove the `profiles.user_id` column, its FK `profiles_user_id_user_id_fk`, and `profiles_one_self_per_user_idx` from the `CREATE TABLE`/index block; add the two self-role partial uniques on `profile_members`.
- [x] 2.2 In `0010`, add the temporary `LANGUAGE sql VOLATILE` nanoid function per design D2 — 21 characters drawn from nanoid's 64-character alphabet, indexed by 6-bit masks over two concatenated `gen_random_uuid()` calls — and `DROP FUNCTION` it before the file ends. No `pgcrypto`, no `gen_random_bytes`; the alphabet must be exactly 64 characters.
- [x] 2.3 Rewrite `0010`'s self-profile backfill to mint ids through that function instead of `'self-' || u."id"`, and to insert the account link as a `profile_members` row rather than `profiles.user_id`. Update the stale backfill comment claiming a deterministic `self-` scheme.
- [x] 2.4 Update `0010`'s header rollback note, and add the operational note from the migration plan: a database that already applied the old `0010` must be rebuilt, not reseeded — drizzle skips the edited file by timestamp and `db:reset:dev` is data-only.
- [x] 2.5 Rewrite `0011_illegal_wind_dancer.sql`'s pre-flight assertion (`:27-35`) to reach each account's self-profile through `profile_members` with `role = 'self'`.
- [x] 2.6 Rewrite `0011`'s seven backfill joins (`:86+`) from `p."user_id" = <account column>` to two-hop joins through `profile_members`, preserving each `IS NULL` idempotency guard and the guest-purchase NULL behavior.
- [x] 2.7 Reconcile `drizzle/meta/0010_snapshot.json` and `0011_snapshot.json` with the rewritten files, so the next `db:generate` diffs from the true post-`0011` state rather than emitting drops the rewrite already made.
- [x] 2.8 Generate the drop migration (`npm run db:generate`) and hand-edit it to repo conventions: `IF EXISTS` on every `DROP`, forward-only, no down-migration, inline rollback note. It drops the seven remaining columns, their FKs and `purchases_item_user_unique_idx` — the eighth, `profiles.user_id`, is never created once task 2.1 lands.
- [x] 2.9 Verify `drizzle/meta/_journal.json` carries only the new migration's appended entry — the `0010` and `0011` entries are untouched, since bumping `when` would replay `0010` in full against production.
- [x] 2.10 Replay the full migration chain against a clean database and confirm: no profile id contains an account id, every account holds exactly one `self` membership, and a second full run changes nothing.

## 3. Self-profile creation and identity

- [x] 3.1 Rewrite `createSelfProfile` in `lib/auth.ts` as one data-modifying CTE (`db.$with()` over the `profiles` INSERT, feeding the `profile_members` INSERT) per design D4. No `ON CONFLICT` on either insert.
- [x] 3.2 Mint the profile id with `nanoid()` rather than `selfProfileOf(user.id)`, and stop writing `profiles.user_id`.
- [x] 3.3 Add a constraint-name accessor to `lib/sqlstate.ts` unwrapping `err.cause.constraint`, in the same shape `sqlstateOf` already uses.
- [x] 3.4 Catch `23505` in `createSelfProfile` narrowed to the self-role membership index by name, and return successfully — that catch is the idempotency `profiles-data-model` requires. An unmatched constraint rethrows.
- [x] 3.5 Delete `lib/profileIds.ts` and move `selfProfileOf` to `test/helpers/profile.ts`, keeping its output byte-identical so the ~20 importing test files and the two `/user/self-…` URLs in `e2e/follow.auth.spec.ts` need no edit. Rewrite the header comment, which currently claims to be the production scheme and to be reproduced by the phase-2 backfill.
- [x] 3.6 Repoint `scripts/seed-dev-users.ts`'s `selfProfileOf` import to the fixture home.

## 4. Profile → account resolution

- [x] 4.1 Add the profile→account resolution helper to `lib/data/profile.ts` (design D6): a single-round-trip join through `profile_members` filtered to `role = 'self'`, replacing `eq(profiles.user_id, users.id)`.
- [x] 4.2 Convert the read sites in `lib/data/profile.ts` (`:19,48,74,114,215,220,226,234-235,262`) to the helper, including `getEligiblePurchasers`' two follow legs.
- [x] 4.3 Convert the two sites in `lib/data/user.ts` (`:51,129`) to the helper.
- [x] 4.4 Convert `blockUser`'s reverse-edge lookup in `lib/data/profile.actions.ts:133` to the helper, keeping it behind the block-row insert and ahead of nothing — `following` pins that statement order.
- [x] 4.5 Add `cacheTag('profile_members')` to `getEligiblePurchasers` and to any other `'use cache'` read that gained the join (design D9). Write no `updateTag` in `createSelfProfile`: a brand-new account holds no follow edges and cannot change an existing pool.
- [x] 4.6 Update the stale comment at `lib/data/profile.ts:124` describing each follow leg's account as resolved through `profiles.user_id`.

## 5. Seed and fixtures

- [x] 5.1 Rewrite `scripts/seed-dev-users.ts` to stop writing the drop targets — `claimed_by`, `followee_id`, `blocker_id`/`blocked_id`, and the vacated `user_id`s — and to write `self` membership rows in place of `profiles.user_id`.
- [x] 5.2 Rewrite the `db:reset:dev` wipe to reach seeded profiles through `profile_members` — membership is the sole handle now — keeping the wipe ahead of the seeded-user delete, which cascades those memberships away and would otherwise strand every profile behind them.
- [x] 5.3 Add the `self` membership insert to `seedUsers` in `test/helpers/seedFollowGraph.ts`, so the two-hop reads resolve without touching individual test files (design D8).
- [x] 5.4 Drop the `user_id` field from `makeProfile` in `test/helpers/profile.ts` and from `seedManagedProfile`'s insert.
- [x] 5.5 Run `npm run db:reset:dev` against a rebuilt local database, restart the dev server, and confirm the seeded managed profile carries its `owner` and `manager` memberships and the reset recreates the fixtures deterministically.

## 6. Tests

- [x] 6.1 Delete the `VacatedAccountColumns` block in `db/__tests__/profile-references.test.ts`. No replacement is owed: `npx tsc --noEmit` fails on every surviving reference to a dropped Drizzle column, which is stronger than a runtime absence assertion.
- [x] 6.2 Delete the assertions pinning the vacated columns as NULL in `lib/data/__tests__/purchase.actions.test.ts`, `user.actions.test.ts:138,162`, and `profile.actions.test.ts:86,199-200`.
- [x] 6.3 Replace `lib/__tests__/auth.test.ts`'s literal `self-u1` assertion with one that asserts the minted id is opaque and carries no account id, plus the `self` membership row.
- [x] 6.4 Add a test that a `createSelfProfile` losing the self-role uniqueness race leaves no profile row behind and surfaces no error — the CTE's rollback, per the spec scenario *A losing creation attempt leaves no orphan profile*.
- [x] 6.5 Add tests for the two self-role partial uniques rejecting a second `self` membership from either direction, in `db/__tests__/profiles.test.ts`.
- [x] 6.6 Add a test for the new `lib/sqlstate.ts` constraint accessor in `lib/__tests__/sqlstate.test.ts`, and one that `createSelfProfile` rethrows a `23505` from an unrelated constraint.
- [x] 6.7 Update `lib/data/__tests__/profile.test.ts`'s `getEligiblePurchasers` cases to the membership-resolved pool, including the managed-profile empty pool and the account-less target rejection.

## 7. Specs, docs, and ADR

- [x] 7.1 Promote `2026-08-18-atomic-writes-in-one-cte` into `openspec/adr/2026-08-18-atomic-writes-in-one-cte.md`, and add its row to `openspec/adr/INDEX.md` under **Touching** `DATABASE.md`.
- [x] 7.2 Add the entry's **Decision** to `DATABASE.md`'s driver section — two or more writes needing atomicity go in one data-modifying CTE — citing `2026-08-18-atomic-writes-in-one-cte`. Its application-side atomicity list omits the technique today, and `:29`'s `DO $$` answer is migration-scoped.
- [x] 7.3 Add the first rescued rule to `DATABASE.md` as a plain doc edit, no ADR entry: never replace a uniqueness constraint by drop-then-create under a driver with no interactive transactions — the gap permanently double-records.
- [x] 7.4 Add the second rescued rule to `DATABASE.md`'s migration section, same treatment: additive first, backfill, then tighten.
- [x] 7.5 Edit `openspec/specs/claim-attribution/spec.md`'s `## Purpose` directly to stop naming the two dropped columns — a delta's Purpose is ignored for an existing capability.
- [x] 7.6 Update `LOCALDEV.md`'s profile and claim-attribution coverage sections, which describe the seed against dropped columns: the managed fixture as `user_id` null, and the fan-out self-claims as `claimed_by = user_id`.
- [x] 7.7 Refine `acceptance.md`'s flows with the literal handles the implementation landed (real button text, real routes, real command names). Refine, not rewrite: flow identity and journey scope stay as drafted.
- [x] 7.8 Run `openspec validate profiles-schema-phase-3 --strict` and resolve anything it reports.

## 8. Pre-merge

All five gates run locally against the author's real `.env.local` before review is requested. This change edits production source, migrations and tests, so no gate is exempt.

- [x] 8.1 `npm run lint` passes — zero errors, zero non-size warnings.
- [x] 8.2 `npx tsc --noEmit` passes — zero errors.
- [x] 8.3 `npm run build` passes — production build completes.
- [x] 8.4 `npm run test:coverage` passes — zero failing tests.
- [x] 8.5 `npm run test:e2e` passes — zero failing tests.

## 9. Gates — round 1

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 1. Resolve each open `Fix now` there before checking it off.

- [x] 9.1 A1+B2+C3 Four `'use cache'` reads gained `profile_members` via `withSelfAvatar` without `cacheTag('profile_members')` — _dropped at adjudication; see review.md Round 1 Adjudications_
- [x] 9.2 A4 Resolution helpers live in `lib/data/profile.identity.ts`, not `lib/data/profile.ts` as task 4.1 / design D6 specify — _dropped at adjudication; see review.md Round 1 Adjudications_
- [x] 9.3 A5 Opaque-profile-id SHALL carves out no exception for the `self-${userId}` fixture/seed scheme D7 preserves — resolved
- [x] 9.4 A6 Task 2.8 claims `0012` drops eight columns; it drops seven — resolved
- [x] 9.5 A7 Sections 5 and 7 lost their sub-numbering; nine tasks carry no unique identifier — resolved
- [x] 9.6 B8 `LOCALDEV.md` describes the seed against dropped `user_id` / `claimed_by` columns — resolved
- [x] 9.7 B9 `isEligiblePurchaser` header comment still cites `profiles.user_id`; its sibling in `profile.ts` was updated — resolved
- [x] 9.8 B10 New ADR INDEX row keyed on `DATABASE.md`, not the `DB Queries` / `DAL` terms the decision actually binds — _dropped at adjudication; see review.md Round 1 Adjudications_
- [x] 9.9 B11+T12 Cast/untyped fixtures still pin dropped `user_id` fields that `tsc --noEmit` cannot catch — resolved
- [x] 9.10 C13 `constraintOf` and `sqlstateOf` are structurally identical drift-prone copies — resolved
- [x] 9.11 T14 Self-membership avatar accessor untested — every consumer fixture is the empty case — _dropped at adjudication; see review.md Round 1 Adjudications_
- [x] 9.12 T15 `SecondManagedProfile_Inserts` asserts on a value it built; its constraint and column are dropped — resolved
- [x] 9.13 T16 `user.test.ts` comment cites `profiles.user_id` as the test's rationale — resolved
- [x] 9.14 T17 `purchase.actions.test.ts` and `signed-in-claim.auth.spec.ts` comments cite dropped `claimed_by` — resolved
- [x] 9.15 T18 `BlockFirstOrdering_...` name outlives its body — opaque `'select'` labels pin a count, not the lookup — _dropped at adjudication; see review.md Round 1 Adjudications_
- [x] 9.16 A19 `claim-attribution` SHALL places the pool read in `lib/data/user.ts`; `getEligiblePurchasers` lives in `lib/data/profile.ts` — resolved
- [x] 9.17 `npm run lint` — zero errors, zero non-size warnings
- [x] 9.18 `npx tsc --noEmit` — zero errors
- [x] 9.19 `npm run build` — completes successfully
- [x] 9.20 `npm run test:coverage` — 2832 passed, 248 files, zero failures
- [x] 9.21 `npm run test:e2e` — 57 passed, zero failures

## 10. Gates — round 2

> Findings by durable ID (severity, `path:line`, citation, reconcile side) are in
> `review.md` Round 2. Resolve each open `Fix now` there before checking it off.

- [ ] 10.1 A1 Delta `claim-attribution` pool-read SHALL now names `lib/data/profile.ts`, contradicting D10's explicit carve-out — resolved
- [ ] 10.2 A2+B3 `design.md:140` migration step 3 still miscounts the drop as eight columns — resolved
- [ ] 10.3 A4 The A5 requirement split and its fixture carve-out are recorded in no design decision or task — resolved
- [ ] 10.4 B5 `scripts/seed-dev-users.ts` is the only operational module importing from `test/` — resolved
- [ ] 10.5 C6 Carve-out criterion "run against a real database" is factually false of the dev seed — resolved
- [ ] 10.6 T7 `AuthedNewTarget_InsertsFollowRow-NullLegacyFolloweeId` names an assertion its body dropped — resolved
- [ ] 10.7 T8 `Authed_InsertsBlockRow-...-NullLegacyIds` names an assertion its body dropped — resolved
- [ ] 10.8 T9 Cascade scenario's `items` leg is exercised by no assertion — resolved
- [ ] 10.9 T10 `RecreatedPrimaryKeys` describe names a REMOVED requirement — resolved
- [ ] 10.10 T11 `ManagedProfileInOwnersFollows_...` bare negative cannot distinguish exclusion from an empty pool — resolved
- [ ] 10.11 T12 neon-http constraint-name assumption behind `createSelfProfile`'s idempotency is untested on that driver — resolved
- [ ] 10.12 `npm run lint` — zero errors, zero non-size warnings
- [ ] 10.13 `npx tsc --noEmit` — zero errors
- [ ] 10.14 `npm run build` — completes successfully
- [ ] 10.15 `npm run test:coverage` — run result
- [ ] 10.16 `npm run test:e2e` — run result
