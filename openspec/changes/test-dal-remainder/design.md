## Context

`lib/dal.ts` is the app's single data-access boundary: ~26 exported reads plus the private `withVisibility` / `withNestedListVisibility` / `firstNameOf` / `sanitizePurchases` projection helpers. Six data-layer carve-outs each tested the reads their capability needed:

- 4.2 `test-following` → `getFollowingByUser`, `getFollowersOfUser`, `isFollowing`, `viewerHasAnyFollows`, `isBlocked`, `getFollowingFeedUsers` (`lib/__tests__/dal.following.test.ts`)
- 4.3 `test-home-digest` → `getUserIdByEmail` (`lib/__tests__/getUserIdByEmail.test.ts`)
- 4.14 `test-visit-history` → `getBookmarkedListsByUser`, `getBookmarkStatus`, `getVisitHistoryByUser` (`lib/__tests__/visitHistory.dal.test.ts`)

None of them enumerated `lib/dal.ts` in `vitest.config.ts` `thresholds`, because vitest's coverage gate is **per file** (`perFile: true`) and a per-file gate cannot pass until *every* function in the file is covered. Three explicit deferral comments in `vitest.config.ts` (from 4.2, 4.3, 4.14) record this. The remaining **twelve** reads — `getUserById`, `getList`, `getLists`, `getListsByUser`, `getItemsByUser`, `getItemById`, `getItemsByPurchased`, `getItemsByListId`, `getListsSharedByUser`, `getBlockedByUser`, `getPublicListsByUser`, `getProfileForUser` — plus the owner/non-owner/spoiler branches of `sanitizePurchases` and the falsy/whitespace branches of `firstNameOf`, are untested. `lib/auth.ts` (≈66%) is similarly un-enumerated.

The harness is fully established: `bootPglite()` boots a migrated in-process Postgres once per file; `resetDb()` truncates between tests; `mockNextCache()` neutralizes `'use cache'` directives and turns `cacheTag`/`updateTag` into spies; `@/db` is module-mocked to the PGlite instance via a hoisted holder. The `dal.following.test.ts` and `visitHistory.dal.test.ts` files are the template. Seed helpers exist (`seedFollowGraph.ts`: `seedUsers`/`seedFollow`/`seedBlock`/`seedPublicList`; `seedVisitGraph.ts`: `seedList`/`seedVisit`) but there is **no** generic list/item/purchase seed helper for the item-bearing reads.

**Measured starting point (authoritative, not the issue's `≈` estimate).** Running the current `lib/__tests__` suite with coverage, `lib/dal.ts` is at **28% lines / 27% statements / 34% functions / 4.9% branches** (52/185 lines, 17/50 v8 functions, **3/61 branches**) and `lib/auth.ts` at **66% lines / 50% functions / 55% branches**. The low branch number is the key fact: `perFile: true` enforces `COVERAGE_FLOOR` over the **whole file**, so enumeration requires `branches ≥ 95% / functions = 100%` across *every* function — including the reads the sibling carve-outs happy-path-tested but whose `catch` error paths (and other branches) they never exercised. `test-following`'s `dal.following.test.ts` has zero error-path tests; `visitHistory.dal.test.ts` has a `ReadErrorPaths` block but only for its three reads. The carve-out's true scope is therefore the **whole-file gap**, not merely the twelve untested reads. The four `app/actions/*.ts` files are already enumerated at `COVERAGE_FLOOR`, so no action work is in scope.

Constraints: `drizzle-orm/neon-http` forbids interactive transactions (irrelevant here — reads only). The DB-under-test contract is a binding `testing-foundation` Tier-1 requirement. The universal floor is `lines:98 / statements:98 / branches:95 / functions:100` from one `COVERAGE_FLOOR` constant.

## Goals / Non-Goals

**Goals:**

- Bring the **whole of `lib/dal.ts`** to the universal `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`): the twelve untested reads end-to-end, the projection-helper branch matrix, **and** the uncovered branches (chiefly `catch` error paths) of the reads the sibling carve-outs already happy-path-tested. Exercise the **real** production functions against PGlite (never re-implemented, never mocked). The acceptance test for this change is literally "`lib/dal.ts` and `lib/auth.ts` can be added to `vitest.config.ts` `thresholds` at `COVERAGE_FLOOR` and the gate passes."
- Cover `lib/auth.ts` to the floor — the local-mode bypass surface and the NextAuth callbacks.
- Enumerate `lib/dal.ts` and `lib/auth.ts` in `vitest.config.ts` `thresholds` at `COVERAGE_FLOOR` and promote both to `sonarjs/cognitive-complexity = error`, removing the three `lib/dal.ts` deferral comments.
- Regression-lock the §7.8 `getListsByUser` `updated_at DESC` sort.
- Elevate the purchase-spoiler read-projection privacy invariant to the `list-item-management` spec.
- Resolve the §7.7 / §7.10 multi-capability-shared-file deferral for the last shared file.

**Non-Goals:**

- Re-testing reads already covered by sibling carve-outs (the six following/block reads, the three visit-history reads, `getUserIdByEmail`). They are inherited; the new file-level gate simply now protects them too.
- Testing any **mutation** / server action — owned and already covered by the action carve-outs (4.9 `items.ts`/`lists.ts`, 4.2 `follows.ts`). This carve-out is reads + auth only.
- Changing any DAL behavior. The only source edit is the `lib/auth.ts` callback extraction (Decision 4), a behavior-preserving move.
- Splitting `lib/dal.ts` into per-capability modules or adopting per-function coverage tooling — §7.7 explicitly rejected both in favor of whole-file enumeration.
- Cross-file refactors. Any audit finding that spans files outside the carve-out is deferred as a new sibling sub-proposal per the four-audit rule.

## Decisions

### Decision 1: Adopt the established PGlite read-test harness verbatim

Each new `.test.ts` mirrors `dal.following.test.ts`: `mockNextCache()` at module top; a `vi.hoisted` holder with `vi.mock('@/db', () => ({ get db() { return holder.db } }))`; `bootPglite()` in `beforeAll`; `resetDb(db)` in `beforeEach`; `dal = await import('@/lib/dal')` after the mock is wired. Reads are invoked as the imported production functions so v8 attributes coverage to `lib/dal.ts`.

*Alternative rejected:* a bespoke per-test boot or mocking the Drizzle query builder — both violate the Tier-1 "not mocked, real test database, boot once per file" contract.

### Decision 2: One `dal.remainder.test.ts`, refactored only if the audit demands it

Start with a single `lib/__tests__/dal.remainder.test.ts` holding a top-level `describe` per read (the three-role convention: function-describe per read, scenario-family describes for matrices like the `sanitizePurchases` viewer/owner/spoiler combinations and the `getItemsByUser` filter matrix). One file keeps the shared list/item/purchase seed setup in one place and the boot cost to a single `bootPglite()`. If the duplication audit finds the item-seed setup is **also** needed by a future carve-out (or grows unwieldy), extract a `seedItemGraph` helper into `test/helpers/` per the shared-fixture rule; otherwise keep it inline. `lib/auth.ts` gets its own `lib/__tests__/auth.test.ts` (it does not need PGlite for the bypass paths and has a different mock surface).

*Alternative rejected:* a file-per-read fan-out — multiplies `bootPglite()` cost and scatters the shared item-seed fixture for no readability gain at this size.

### Decision 3: Cover read error paths via `vi.spyOn` rejection — for the twelve AND the sibling-covered reads

Every read with a `try/catch` that re-throws (`'Failed to fetch …'`) needs its `catch` exercised for the branch floor. Reuse `visitHistory.dal.test.ts`'s pattern: `vi.spyOn(db.query.<table>, 'findMany'|'findFirst').mockRejectedValueOnce(new Error('boom'))` then assert `.rejects.toThrow('Failed to fetch …')`. `getUserById` / `getUserIdByEmail` differ — their `catch` returns `null`, so the assertion is `.resolves.toBeNull()` (these use the low-level `db.select()` builder, so the spy targets `db.select` or is exercised by forcing a query error). `getFollowingFeedUsers`/`getProfileForUser` use `db.select()` raw-SQL builders; their error path is reachable by spying the builder chain or by a constraint that makes the query throw. Spies are restored in `beforeEach` (via `resetDb` ordering or `vi.restoreAllMocks()`) so they never leak across the shared-file DB.

This applies **equally to the reads the sibling carve-outs already cover** — `getFollowingByUser`, `getFollowersOfUser`, `isFollowing`, `viewerHasAnyFollows`, `isBlocked`, `getFollowingFeedUsers`, `getUserIdByEmail`, and any visit-history read with a branch the 4.14 suite left short. The measured 3/61 branch coverage is dominated by these unexercised `catch` paths and short-circuit branches; the whole-file `branches:95` floor cannot pass without them. We add only the missing branch tests (a single error-path `it` per read, plus any uncovered `??`/short-circuit case), **not** a duplicate of each sibling's happy-path suite — re-testing covered behavior would violate the duplication-audit bar. A short comment in the new file points to the owning sibling test for the happy-path coverage. To know precisely which branches remain short, the apply step reads `coverage/coverage-summary.json` (and the HTML report's per-line view) for `lib/dal.ts` after the twelve reads land, then backfills exactly the red branches.

### Decision 4: Extract the `lib/auth.ts` NextAuth callbacks to named exports (testability refactor)

`functions: 100%` requires every function in `lib/auth.ts` to be invoked, including the `signIn` / `jwt` / `session` callbacks, and `branches: 95%` requires the `auth()` wrapper's pass-through branch. Two complementary moves get the whole file to the floor cleanly:

1. **Extract the three callbacks to named exports.** They are currently anonymous functions inside the object literal passed to `NextAuth({...})`; NextAuth returns `{ handlers, signIn, signOut, auth }` and does **not** re-expose the callbacks, so they are otherwise unreachable. Define `export async function signInCallback({ user, profile })`, `export function jwtCallback({ token, trigger, session })`, `export async function sessionCallback({ session })`, and reference them in the config (`callbacks: { signIn: signInCallback, jwt: jwtCallback, session: sessionCallback }`). The new tests invoke each directly and assert the observable result (display-name composition for `signIn`'s three profile shapes; `token.name` update only on `trigger === 'update'`; `session` pass-through). This is a within-carve-out, behavior-preserving refactor explicitly permitted by the refactor-authority requirement, and it does not collide with the re-exported NextAuth `signIn` action (the callbacks are named `*Callback`).

2. **Mock the `next-auth` package boundary.** `vi.mock('next-auth', ...)` so the module-level `NextAuth({...})` returns a stub `{ handlers: {}, signIn, signOut, auth: <stub> }`. This is the OAuth/framework boundary `testing-foundation` explicitly lists as mockable, and it buys two things: (a) the module **constructs cleanly under the node project** without a real `AUTH_SECRET` / OAuth env or a live adapter; and (b) the `auth()` wrapper's `args.length > 0` pass-through becomes **directly coverable** — calling `auth(reqStub, ctxStub)` delegates to the stubbed `nextAuth.auth`, which the test asserts was invoked with those args. So the pass-through branch reaches the floor by a real assertion, **not** a `/* v8 ignore */`. `@/db` is still mocked (the adapter receives it) and `process.env.USE_PG_DRIVER` / `BYPASS_SESSION_USER` drive the zero-arg bypass branches and `synthesizeSession`.

*Alternative rejected:* extraction alone, leaving real `NextAuth()` to construct in the test — risks an import-time throw under node (missing secret/env) and leaves the pass-through branch uncovered. *Alternative rejected:* `/* v8 ignore */` on the callbacks or the pass-through — the no-backdoor rule allows ignore only with a named rationale, and here a clean, real test exists, so an ignore would be unjustified. The escape hatch remains available only if some genuinely unreachable line survives the apply-time coverage read — decided against the report, not pre-emptively.

### Decision 5: Elevate the purchase-spoiler read-projection invariant to `list-item-management`

`sanitizePurchases` enforces a non-obvious privacy contract at the read boundary: an owner viewing their own items sees `[]` claims unless `showSpoilers` is explicitly set; with spoilers, claims appear as first-name-only `{ by: 'other' }`; a non-owner viewer sees first-name-only with `{ by: 'self' | 'other' }` keyed on `viewerId`. No full name, email, or user id ever escapes. A spec-grep found **no** existing requirement for this (the only `getItemsByUser` mention in `list-item-management` is about argument-passing). It meets all three elevation gates: (a) non-obvious from the function name/signature; (b) survives a reimplementation of the reads; (c) protects against a real failure mode — a gift-surprise spoiler leak to the owner, or a claimer-identity leak to other viewers. Add it as an ADDED requirement to `list-item-management` (the capability owning claim/purchase semantics, of which this is the read-side counterpart).

*Alternative rejected:* leaving it tested-but-unspecced — fails the "SHALL elevate if (a)(b)(c)" obligation. *Alternative rejected:* a new `purchase-privacy` capability — over-fragmentation; the invariant is intrinsic to `list-item-management`.

### Decision 6: Do NOT elevate the FOLLOWERS-only visibility filter (already governed)

`getPublicListsByUser` / `getProfileForUser` / `getListsSharedByUser` filter on `visibilityDbValues([VISIBILITY.FOLLOWERS])` (or `[LINK, FOLLOWERS]`). Three-state visibility is already the binding contract of the active `list-visibility` spec, and `lib/visibility.ts` (the `visibilityDbValues` encoder) is already tested and floored by 2.1. These tests assert the filter behavior against the existing SHALLs; adding a new spec requirement would duplicate `list-visibility`. Record as non-elevation with rationale in `tasks.md`.

### Decision 7: Test `getListsSharedByUser`; flag the zero-caller observation for the duplication/testability audit

`getListsSharedByUser` has **zero non-test production callers** today (grep of `app/`/`lib/`). It is nonetheless a well-defined exported read with a clear contract (a user's `LINK`+`FOLLOWERS` lists, `created_at DESC`). The whole-file `functions: 100%` floor requires it covered **or** removed. Disposition: **cover it** (low-risk, the contract is clear and harmless to keep), and record the dead-code observation as a duplication/testability audit finding. Removing an exported DAL symbol is a behavior-adjacent decision; if the operator confirms it is genuinely dead, the removal is a trivial follow-up — but defaulting to coverage avoids deleting a documented read on a coverage sub-proposal's authority. Decided explicitly in `tasks.md`'s audit section.

### Decision 8: Enumerate both files at `COVERAGE_FLOOR`; promote both to complexity `error`; delete the deferral comments

Add `'lib/dal.ts': COVERAGE_FLOOR` and `'lib/auth.ts': COVERAGE_FLOOR` to `vitest.config.ts` `thresholds`, and delete the three "No `lib/dal.ts` entry … deferred" comments (from the 4.2 / 4.3 / 4.14 blocks) since the deferral is now resolved. Add both files to the `eslint.config.mjs` per-file `sonarjs/cognitive-complexity = error` array under a `test-dal-remainder (sub-proposal 9.1)` comment. `npx eslint lib/dal.ts lib/auth.ts` reports zero issues at HEAD, so neither promotion introduces a lint failure. This is the concrete §7.10 enumeration and the §7.7 resolution.

## Risks / Trade-offs

- **[The `lib/auth.ts` callback extraction changes a security-sensitive file]** → The move is mechanical (anonymous → named, same bodies, same wiring) and the new tests assert each callback's observable behavior before-and-after; `npm run build` + `tsc` + the full test suite gate it. No logic changes.
- **[Whole-file branch backfill is larger than "the twelve reads"]** → Explicitly scoped (Decision 3): the apply step reads `coverage/coverage-summary.json` + the HTML per-line view after the twelve land and backfills exactly the remaining red branches in the sibling-covered reads. The acceptance gate is the per-file threshold itself passing, so an under-count cannot slip through — the gate fails until the file is genuinely at floor.
- **[`next-auth` mock drifts from the real construction shape]** → The stub only needs the four destructured members (`handlers`/`signIn`/`signOut`/`auth`); `tsc` + the e2e auth suite (6.x, real NextAuth) catch any real-shape divergence. The pass-through assertion pins that `auth(req, ctx)` still delegates.
- **[`db.select()`-based reads (`getFollowingFeedUsers`, `getProfileForUser`) have harder-to-reach error branches]** → these are inherited-covered (`getFollowingFeedUsers` by 4.2) or composed of already-tested pieces; for `getProfileForUser` the `catch` is reachable by spying the `db.select`/`db.query.users.findFirst` chain to reject. If a specific branch resists, dispose with a named ignore + rationale.
- **[Item-seed setup duplication across describes]** → keep inline first (Decision 2); extract a `seedItemGraph` helper only if the duplication audit finds genuine repetition, per the shared-fixture rule — avoids a premature helper.
- **[Promoting `lib/dal.ts` to complexity `error` could block a future legitimately-complex read]** → matches every prior carve-out's promotion; the escape hatch is a per-line disable with a named reason, already the project convention.

## Migration Plan

Not applicable — additive tests, config, a behavior-preserving source refactor, and spec/governance bookkeeping. No data migration, no API change, no rollback concern beyond reverting the branch. The §9.1 checkbox and the §7.7 / §7.10 unblocks are recorded at archive.

## Open Questions

- **Final test-file split** (one `dal.remainder.test.ts` vs. a small split by read-cluster) — resolved at apply-time by the duplication audit (Decision 2); default is one file.
- **`getListsSharedByUser` keep-vs-remove** — defaulting to keep+cover (Decision 7); the operator may convert the recorded audit finding into a removal follow-up.
- **`auth()` pass-through coverage** — resolved by the `next-auth` boundary mock (Decision 4): a `auth(req, ctx)` call delegates to the stub and is asserted, covering the branch with no `/* v8 ignore */`. The escape hatch remains only for any line the apply-time report proves genuinely unreachable.
