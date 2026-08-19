# Profiles schema phase 3: drop superseded user-FK columns

Issue: https://github.com/JoshEddie/CTRLplusList/issues/191
Map: [MAP: Dependents and shared list management #181](https://github.com/JoshEddie/CTRLplusList/issues/181)

## Why

Phase 1 ([#189](https://github.com/JoshEddie/CTRLplusList/issues/189)) added the `profiles` table and profile-valued columns; phase 2 ([#190](https://github.com/JoshEddie/CTRLplusList/issues/190)) repointed every reader and writer to them. The account-valued columns they superseded are still declared and still carry backfilled data, read by nothing. This is the third and last phase of the three forward-only migration phases settled on [#184](https://github.com/JoshEddie/CTRLplusList/issues/184): drops come last.

Two active specs hand this chunk the work by name:

- `claim-attribution` — "the account-valued `claimed_by` and `user_id` columns they supersede remain in the table, unread and unwritten, **until a later change drops them**" (Requirement: purchase row model), and the account-valued partial unique "remains in place beside it for this phase and **is dropped, with its column, by a later change**" (Requirement: concurrent-claim guarantee). Both name this change.
- `visit-history` and `server-endpoint-authorization` bound the drop from the other side: `list_visits.user_id`, `user_follows.follower_id`, and `updated_by_user_id` are **actor** columns that stay account-valued and are not touched here (`server-endpoint-authorization`: "Actor columns … SHALL be compared against an account id").

Verification at charting departure: no production module reads any of the drop candidates. The only surviving references are the declarations and Drizzle `relations` entries in `db/schema.ts`.

### Also in scope: two phase-1 defects, free only while phase 1 is unshipped

`drizzle/0010_late_chamber.sql` is on `dev` only — not on `origin/main`, no tags — so **no production row carries phase-1 data**. Both defects below are a one-line migration edit today and a live-data migration after release. Neither is a security issue; both are data-model correctness.

#### `profiles.id` derives from an account id

`createSelfProfile` in `lib/auth.ts` passes an explicit `self-${user.id}`, bypassing the `nanoid()` default `db/schema.ts` already declares. Origin is phase-1 design D4 (a backfill-idempotency convenience) adopted into the write path by D7 so the NextAuth hook and the migration would emit identical rows.

- **It contradicts the map.** This map exists so profiles are *not* 1:1 with accounts. Deriving the primary key from an account id bakes that 1:1 into the key and leaves one column carrying two id shapes: `self-<id>` and nanoid.
- **It outlives its referent.** Delete the account and the self-profile survives with a dead account id frozen into its primary key.
- **The rationale is obsolete.** Idempotency does not need a derived id; the partial unique over the self relation provides it independently, via conflict handling.

#### `profiles.user_id` duplicates `profile_members`

Raised during this change's design interview and demoted on [Role model for shared list management #182](https://github.com/JoshEddie/CTRLplusList/issues/182), the ticket that settled it.

`profiles.user_id` and `profile_members(user_id, profile_id, role='self')` store the same fact twice, and nothing enforces that they agree. `createSelfProfile` writes both, in two statements, under a driver with no interactive transactions — they can diverge silently. They are also *designed* to diverge on account deletion: `profiles.user_id` goes `SET NULL` and the row survives ([#187](https://github.com/JoshEddie/CTRLplusList/issues/187)) while the membership row cascades away. A second, unconstrained store of one fact is a normalization violation.

The column also pulls double duty — NULL as a managed-profile discriminator, valued as a self-link.

### Spec drift phase 2 left behind

`list-item-management` amended its `createPurchase` requirement to the self-profile purchaser but left three requirement bodies normatively naming `purchases.user_id`: the `(item_id, user_id)` partial unique and its two scenarios, the guest `removePurchase` check `purchases.user_id IS NULL`, and the authenticated `removePurchase` delete `purchases.user_id = sessionUser.id`. Shipped code already uses the profile-valued columns, so these SHALLs contradict landed code today. Dropping the columns forces the amendment; this change owns it.

## What Changes

- **Drop the superseded columns** in a forward-only migration, with their indexes and Drizzle `relations` entries: `lists.user_id`, `items.user_id`, `purchases.user_id`, `purchases.claimed_by`, `user_follows.followee_id`, `user_blocks.blocker_id`, `user_blocks.blocked_id`, and the `purchases_item_user_unique_idx` partial unique. Both sides of each relation go — the `one()` sides and the seven `many()` sides on `usersRelations`.
- **Rewrite `drizzle/0010_late_chamber.sql` in place** so self-profiles are born with an opaque id, rather than minting `self-` ids and re-iding them later. The backfill draws 21 characters from `nanoid`'s own 64-character alphabet, indexing it with 6-bit masks over two `gen_random_uuid()` calls, through a `LANGUAGE sql` function the migration drops when it is done. `pgcrypto` is unavailable in PGlite, so `gen_random_bytes` is not an option. **No re-id migration, no FK cascade, no down-migration.**
- **BREAKING (schema): drop `profiles.user_id` and `profiles_one_self_per_user_idx`.** `profile_members` becomes the sole profile↔account link, its `role` distinguishing `self` from `owner`/`manager`; a managed profile is one with no `self` membership row. Two partial uniques replace the dropped index — `(user_id) WHERE role='self'` and `(profile_id) WHERE role='self'` — enforcing in both directions the injectivity `claim-attribution` traverses. `profiles` keeps no foreign key to `users`.
- **Rewrite `drizzle/0011_illegal_wind_dancer.sql`'s pre-flight assertion and its seven backfill joins** to reach each row's account through `profile_members` instead of `profiles.user_id`.
- **`createSelfProfile` becomes a single data-modifying CTE** — the profile insert and the membership insert in one statement, with no `ON CONFLICT`. A duplicate self-membership raises `23505` and rolls the profile insert back with it, so no orphaned profile is reachable even under concurrency. One statement is one implicit transaction, which is the only atomicity `neon-http` offers.
- **Retire `lib/profileIds.ts`** and move its deterministic factory to a fixture home for the dev seed and test helpers, where it no longer claims to be the production scheme. (Its comment also claims the phase-2 backfill reproduces the scheme in SQL — only phase 1 does.)
- **Amend the four specs** whose text the drops, the identity change, and the account-link change contradict.

Composite primary keys and the profile-valued partial uniques added in phases 1–2 stay as they are; this change only removes what they replaced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `profiles-data-model`: self-profile identity becomes an opaque `nanoid()` independent of the account id; the profile↔account link moves from `profiles.user_id` to `profile_members`, taking the one-self-per-account constraint with it; the requirements describing the vacated account columns and the coexisting purchaser indexes are falsified by the drops; the clause forbidding `profile_members` any reader, cache tag, or invalidation obligation is falsified by the account link moving there; and the dev-seed requirement's wipe handle — `db:reset:dev` reaching profiles that carry "a seeded user's `user_id`" — loses the column it names, leaving membership as the sole handle.
- `claim-attribution`: the superseded account-valued `user_id`/`claimed_by` columns and their partial unique are gone rather than dormant, so the "until a later change drops them" staging language resolves; the Purpose line names both dropped columns; the eligible-pool requirement resolves each follow leg's account through `profiles.user_id`; the claim-modal and self-claim-suppression requirements still name the dropped `purchases.claimed_by` column, and the modal's pool-read tag list omits `profile_members`.
- `list-item-management`: the duplicate-claim partial unique and both `removePurchase` ownership checks are restated against the profile-valued columns the code already uses.
- `following`: the follow-graph no-transactions requirement pins `blockUser`'s statement sequence by name, and one of those statements is the `profiles` lookup resolving the blocked profile's account — which resolves through membership once the column is gone.

## Impact

- **Migrations** — `0010` and `0011` are rewritten in place; the drops ship as a new forward-only migration. No down-migration. **`drizzle/meta/_journal.json` is not touched**: drizzle applies by timestamp and never compares hashes, so bumping an entry would replay the whole of `0010` — `CREATE TABLE`s included — against production.
- **Schema** — `db/schema.ts`: the dropped column declarations and index, `profiles.user_id` and its partial unique, the two new `profile_members` partial uniques, the `one()` relations at lines ~307, ~340, ~345, ~364, ~424, ~480, ~485, and the seven `many()` sides on `usersRelations` (~383–392).
- **Code** — `lib/auth.ts` (`createSelfProfile` becomes the CTE), `lib/profileIds.ts` (deleted), and **fourteen production read sites** that resolve profile → account: `lib/data/profile.ts:19,48,74,114,215,220,226,234-235,262`, `lib/data/user.ts:51,129`, and `lib/data/profile.actions.ts:133` — `blockUser`'s reverse-edge lookup, the one site outside the read modules. Each goes from a one-hop join to a two-hop join through `profile_members`; a shared helper carries it rather than fourteen inline copies.
- **Cache** — `getEligiblePurchasers` gains `cacheTag('profile_members')`, which `claim-attribution`'s pool-read requirement now enumerates. `createSelfProfile` gains no `updateTag`: a new account holds no follow edges, so it cannot change any existing pool. No cache tag embeds an id ([#202](https://github.com/JoshEddie/CTRLplusList/issues/202)).
- **Seed** — `scripts/seed-dev-users.ts` **writes** the drop targets (`claimed_by`, `followee_id`, `blocker_id`/`blocked_id`, the vacated `user_id`s) and breaks without repair. It also writes `profiles.user_id` and must write membership rows instead.
- **Tests and fixtures** — `db/__tests__/profile-references.test.ts`'s `VacatedAccountColumns` block deletes with the columns it reads. Assertions pinning the vacated columns as NULL (`purchase.actions.test.ts`, `user.actions.test.ts:138,162`, `profile.actions.test.ts:86,199-200`) go with them. `lib/__tests__/auth.test.ts` asserts the literal `self-u1`. Every fixture that seeds a profile now needs a `self` membership row for the two-hop reads to resolve — carried in `seedUsers` so individual tests stay unchanged. The deterministic id factory keeps its output, so the ~20 test files importing it and the two `/user/self-…` URLs in `e2e/follow.auth.spec.ts` are untouched.
- **Docs** — `LOCALDEV.md`'s profile and claim-attribution coverage sections describe the seed against dropped columns (the managed fixture as `user_id` null, fan-out self-claims as `claimed_by = user_id`) and follow the seed rewrite. `DATABASE.md` takes three additions: the single data-modifying CTE for atomic multi-writes, which this change derives and files as an ADR entry (its application-side atomicity list omits the technique today), plus two rules rescued from removed spec requirements — never replace a uniqueness constraint by drop-then-create under `neon-http`, and additive first, backfill, then tighten — which land as plain doc edits.
- **Verification** — `npx tsc --noEmit` fails on every surviving reference to a dropped Drizzle column, which is a stronger guarantee than a runtime assertion that a column is absent; no replacement test is owed for the deleted block.
- **Sequencing** — [#199](https://github.com/JoshEddie/CTRLplusList/issues/199) also rewrites `createSelfProfile`, moving it out of the NextAuth `createUser` event into the onboarding submit action ([#302](https://github.com/JoshEddie/CTRLplusList/issues/302)). The two edits are compatible (where it is called vs. what it writes), and #302's un-onboarded latch discriminates on profile and avatar-row existence rather than on an id string — but whichever lands second inherits the other's shape, and the latch's "has a self-profile" test now resolves through membership.
- **Not a security change** — `/user/[id]` carried `users.id` directly before phase 2 and `self-<users.id>` after; `users.id` is a 126-bit nanoid, not enumerable. Data-model correctness, not exposure.
