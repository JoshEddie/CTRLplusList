## 1. Test scaffolding (PGlite read harness)

- [ ] 1.1 Create `lib/__tests__/dal.remainder.test.ts` with the established harness: `mockNextCache()` at module top, a `vi.hoisted` holder + `vi.mock('@/db', () => ({ get db() { return holder.db } }))`, `bootPglite()` in `beforeAll`, `resetDb(db)` (and `vi.restoreAllMocks()`) in `beforeEach`, and `dal = await import('@/lib/dal')` after the mock is wired (mirror `dal.following.test.ts`).
- [ ] 1.2 Set up the shared list/item/purchase seed inline (a local `seedItemGraph`-style helper covering `users`, `lists`, `items`, `list_items`, `stores`, `purchases`). Keep inline for now; the §5.1 duplication audit decides whether to extract into `test/helpers/`.

## 2. `lib/dal.ts` read coverage

- [ ] 2.1 `getUserById` — found row; not-found `null`; `catch` returns `null` (forced query error), asserting it does NOT throw.
- [ ] 2.2 `getList` — single list with `user` join + `items` count projection; not-found; `catch` re-throws `'Failed to fetch list'`.
- [ ] 2.3 `getLists` — all lists ordered `created_at DESC`; visibility decoded via `withVisibility`; `catch` re-throws.
- [ ] 2.4 `getListsByUser` — a user's lists ordered **`updated_at DESC`** (regression-locks the §7.8 sort) with the `user` column projection; `catch` re-throws. Assertion names the ordering so a regression to `created_at` fails loudly.
- [ ] 2.5 `getItemsByUser` — the `filter` matrix (`active` default / `archived` / `all`) over `archived_at`; `created_at DESC`; `hasPurchases` flag; store ordering; the owner spoiler branch (`showSpoilers` false → `[]`, true → first-name `other` rows); `catch` re-throws.
- [ ] 2.6 `getItemById` — `list_items`→`list` reshape into `lists[]` with `position`; store ordering; not-found (`undefined`); `catch` re-throws.
- [ ] 2.7 `getItemsByPurchased` — the `!userId` early-return (`[]`); rows ordered `purchased_at DESC`; the non-owner `sanitizePurchases` branch (`self` vs `other`); `catch` re-throws.
- [ ] 2.8 `getItemsByListId` — membership ordered `position ASC`; the full viewer/owner/spoiler matrix of `sanitizePurchases`; `catch` re-throws.
- [ ] 2.9 `getListsSharedByUser` — `LINK`+`FOLLOWERS` filter for a user, `created_at DESC`; `catch` re-throws (see §5.1 dead-code disposition).
- [ ] 2.10 `getBlockedByUser` — blocked rows with `blocked` join, `created_at DESC`; `catch` re-throws.
- [ ] 2.11 `getPublicListsByUser` — FOLLOWERS-only filter; `shared_at DESC`; `limit`/`offset` pagination; `catch` re-throws.
- [ ] 2.12 `getProfileForUser` — unknown user → `null`; `publicListCount` aggregate; viewer-relationship composition (`viewerIsFollowing` / `viewerIsBlocked` / `blockedByViewer`) including the `viewerId == null` and `viewerId === userId` short-circuits; `catch` re-throws.
- [ ] 2.13 `firstNameOf` branch completion via purchase-bearing reads: null name, empty string, whitespace-only (all → `'Someone'`), and multi-word (first token).
- [ ] 2.14 **Whole-file branch backfill** for the sibling-covered reads (`getFollowingByUser`, `getFollowersOfUser`, `isFollowing`, `viewerHasAnyFollows`, `isBlocked`, `getFollowingFeedUsers`, `getUserIdByEmail`, plus any visit-history read short of floor): add only the missing branch tests — chiefly one `catch` error-path `it` per read via `vi.spyOn(...).mockRejectedValueOnce(...)`, plus any uncovered `??` / short-circuit. Do NOT duplicate the siblings' happy-path tests; add a comment pointing to the owning sibling file. (Baseline is 3/61 branches — this is the bulk of the branch work.)
- [ ] 2.15 Coverage-driven gap close: run `npm run test:coverage` (or scoped), read `coverage/coverage-summary.json` + the HTML per-line view for `lib/dal.ts`, and backfill exactly the remaining red lines/branches until the file clears `lines:98 / statements:98 / branches:95 / functions:100` with `perFile` enforcement — i.e. every inline `orderBy`/`.map` closure is exercised with rows present.

## 3. `lib/auth.ts` coverage + testability refactor

- [ ] 3.1 Refactor: extract the inline `signIn` / `jwt` / `session` callbacks to named exports (`signInCallback` / `jwtCallback` / `sessionCallback`) and reference them in the `NextAuth({ callbacks })` config — behavior-preserving move (Decision 4).
- [ ] 3.2 Create `lib/__tests__/auth.test.ts` that `vi.mock('next-auth', ...)` to a stub returning `{ handlers: {}, signIn, signOut, auth: <stub> }` (framework/OAuth boundary), and mocks `@/db`, so the module constructs cleanly under the node project.
- [ ] 3.3 Cover the bypass surface: `auth()` zero-arg with `USE_PG_DRIVER=1` → default `dev-test-viewer` session; `BYPASS_SESSION_USER='guest'` → `null`; another seeded id → minimal `{ user: { id } }` session; `synthesizeSession` both branches. Manage `process.env` per test and restore.
- [ ] 3.4 Cover the `auth(req, ctx)` pass-through: call the overload with stub args, assert the stubbed `nextAuth.auth` was invoked with them (covers the `args.length > 0` branch by assertion — no `/* v8 ignore */`).
- [ ] 3.5 Cover the callbacks directly: `signInCallback` for the three Google profile shapes (given+family → full name, given-only → given name, neither → unchanged) returning `true`; `jwtCallback` updates `token.name` only on `trigger === 'update'` (and leaves it otherwise); `sessionCallback` passes the session through.
- [ ] 3.6 Read `coverage-summary.json` for `lib/auth.ts` and close any residual gap to floor; reserve `/* v8 ignore */` + named rationale only for a line the report proves genuinely unreachable.

## 4. Enumeration + complexity promotion

- [ ] 4.1 `vitest.config.ts`: add `'lib/dal.ts': COVERAGE_FLOOR` and `'lib/auth.ts': COVERAGE_FLOOR` to per-file `thresholds`; delete the three "No `lib/dal.ts` entry … deferred" comments (the 4.2 / 4.3 / 4.14 blocks).
- [ ] 4.2 `eslint.config.mjs`: add `lib/dal.ts` and `lib/auth.ts` to the per-file `sonarjs/cognitive-complexity = error` array under a `test-dal-remainder (sub-proposal 9.1)` comment. Confirm `npx eslint lib/dal.ts lib/auth.ts` stays clean.

## 5. Four audits + invariant elevation (recorded BEFORE coverage validation)

- [ ] 5.1 **Duplication audit** — record the `getListsSharedByUser` zero-production-caller finding; disposition: cover it (Decision 7), flag potential removal as an operator follow-up (do NOT remove on this change's authority). Record whether the item-seed setup was kept inline or extracted to `test/helpers/`.
- [ ] 5.2 **Complexity audit** — confirm every function in `lib/dal.ts` and `lib/auth.ts` is < 15 (clean at HEAD); record any per-line disable + reason if a refactor raised one.
- [ ] 5.3 **Testability audit** — record the `lib/auth.ts` callback extraction (§3.1) as the one in-carve-out testability refactor; note the `auth()` pass-through disposition (§3.4).
- [ ] 5.4 **Assertion audit** — review every new test against the substance bar: one sentence per test naming the observable behavior asserted (return value / thrown error / persisted-or-projected shape). Fix any tautology/execute-for-coverage in place.
- [ ] 5.5 **Invariant elevation** — ELEVATE the purchase-spoiler read-projection invariant to `list-item-management` (Decision 5); record NON-elevation of the FOLLOWERS-only visibility filter (already governed by `list-visibility` — Decision 6) and the `getListsByUser` sort (already a `home-digest` SHALL; regression-locked by test, not re-specced).

## 6. Coverage validation

- [ ] 6.1 **Acceptance criterion** — with `'lib/dal.ts': COVERAGE_FLOOR` and `'lib/auth.ts': COVERAGE_FLOOR` added to `thresholds` (§4.1), `npm run test:coverage` passes the `perFile` gate: both files at `lines ≥ 98% / statements ≥ 98% / branches ≥ 95% / functions = 100%`. If the gate fails, the carve-out is incomplete — return to §2.14 / §2.15 / §3.6 and close the remaining red lines/branches before archiving.

## 7. Specs + governance bookkeeping

- [ ] 7.1 `list-item-management` delta (`specs/list-item-management/spec.md`) authored and `openspec validate test-dal-remainder --strict` passes; the ADDED requirement reaches canonical via archive-time rollup (no apply-time write to the active spec, per §7.11).
- [ ] 7.2 `testing-foundation` carve-out delta (`specs/testing-foundation/spec.md`) authored — Tier-2 bookkeeping (whole-file coverage + enumeration) plus the Tier-1 §7.7 / §7.10 resolution; archive-only / archive-time rollup per D13.
- [ ] 7.3 On archive: flip `test-coverage/tasks.md` §9.1; update §7.7 / §7.10 to record `lib/dal.ts` resolved (last shared file enumerated); note that §7.2 / §7.3 are now unblocked.

## 8. Pre-merge (four-gate)

- [ ] 8.1 `npm run lint` passes with zero errors and zero new warnings.
- [ ] 8.2 `npx tsc --noEmit` passes with zero errors.
- [ ] 8.3 `npm run build` completes successfully.
- [ ] 8.4 `npm test` passes (all suites green, including the new files).
