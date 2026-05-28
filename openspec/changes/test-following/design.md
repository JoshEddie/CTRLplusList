## Context

This is sub-proposal 4.2 of the `test-coverage` initiative — the first carve-out to test the data layer end-to-end. The repo has a pglite migration harness (`test/helpers/db.ts`, `bootPglite()`) and a `next/cache` mock (`test/helpers/next-cache.ts`, `mockNextCache()`) landed by the foundation spike, but **no DAL function or server action is tested yet**. This change both covers the `following` carve-out AND establishes the canonical DAL + server-action test pattern that every downstream data-layer carve-out (4.3, 4.9, 4.11, 4.13, 4.14, 4.15) will inherit.

Carve-out source at HEAD (verified by `ls` / read):

- **Server action** `app/actions/follows.ts` — `followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser`, and the `authedUserId()` helper. Uses `db` (`@/db`), `auth()` (`@/lib/auth`), `updateTag` (`next/cache`). Neon-http: no transactions; cross-statement atomicity comes from idempotent ordering + the composite-PK / `onConflictDoNothing()` backstop.
- **DAL reads** (`lib/dal.ts`) — glob-matched: `getFollowingByUser`, `getFollowersOfUser`, `getFollowingFeedUsers` (all "Not cached"); plus the three `'use cache'` follow-graph predicates consumed by the in-carve-out `FollowContainer`: `isFollowing`, `isBlocked`, `viewerHasAnyFollows`.
- **Page UI** `app/(main)/following/` — `FollowingPage.tsx` (async server component: `auth` → `getUserIdByEmail` → `getFollowingFeedUsers` → renders `ListCollectionsNav` + `UserCardGrid`, with an inline `after()` last-seen write), `page.tsx` (thin shell).
- **Follow / profile UI** `app/(main)/users/ui/components/` — `FollowButton`, `FollowControls`, `FollowContainer`, `FollowDisclosureDialog`, `FollowPrompt`, `ProfileHeader`, `PublicListsGrid`, `Avatar`, `UserCard`, `UserCardGrid`.

Binding constraints: the full `testing-foundation` rule set (universal `COVERAGE_FLOOR`, `__tests__/` colocation, two-project jsdom/node split, name shapes, four audits, assertion bar, complexity gate, NextAuth-boundary mocking), the active `following` spec's 12 requirements, and the cross-cutting design-system + data-freshness rules. See `proposal.md` for the full spec-grep.

## Goals / Non-Goals

**Goals:**

- Cover every executable file in the carve-out to the universal `COVERAGE_FLOOR` (`98/98/95/100`).
- Establish a reusable, documented DAL + server-action integration-test pattern against pglite (Tier 1 `testing-foundation` contribution).
- Lock the `following` spec's load-bearing invariants with regression tests: idempotent follow, no-self-follow, block-gated follow, the disclosure-dialog derivation, the block-first ordering, the `updateTag`-on-success-only contract, and the inline single-statement `after()` write.
- Correct the spec record: name the composite primary key as the follow-toggle dedup backstop (not a "partial unique index").
- Resolve the triplicated `initialsOf` duplication in-carve-out.

**Non-Goals:**

- Testing the `user/[id]/` profile route components (`ProfilePage`, `ProfileHeaderSection`, `ProfileListsSection`) — different directory, out of carve-out.
- Testing `getProfileForUser`, `getPublicListsByUser`, `getBlockedByUser` — out of glob and out of carve-out consumers.
- Re-testing the `Button` / `LinkButton` / `ListCard` / `MoreCard` / `ListCollectionsNav` primitives (owned by their own carve-outs).
- E2E coverage of the follow flow (sub-proposal 6.1).
- Any change to the follow-graph runtime behavior (the `initialsOf` extraction is behavior-preserving).

## Decisions

### Decision 1 — Carve-out boundary and the `getFollowing*` glob

The issue names "DAL `getFollowing*` / `getFollowers*`, `app/actions/follows.ts`, page UI under `app/(main)/following/` and `app/(main)/users/`."

- **In, by glob:** `getFollowingByUser`, `getFollowersOfUser`, `getFollowingFeedUsers`.
- **In, by in-carve-out consumption:** `isFollowing`, `isBlocked`, `viewerHasAnyFollows` — consumed by `FollowContainer` (in `users/ui/components/`). Testing them alongside the action keeps the follow-graph read+write invariants in one place.
- **Out:** `getProfileForUser`, `getPublicListsByUser`, `getBlockedByUser` — they neither match the glob nor have an in-carve-out consumer (`getProfileForUser`/`getPublicListsByUser` back the `user/[id]/` profile route; `getBlockedByUser` backs the `settings/connections` Blocked section). Deferred to the profile-route carve-out and 4.15 / a settings carve-out respectively.
- **Out:** the `user/[id]/` route directory (singular `user`). The issue names `users/` (plural — the UI-component directory). The route's section components render in-carve-out components but are themselves out of scope.

**`getFollowingFeedUsers` overlaps `home-digest` (4.3)** — it powers both `/following` (in scope) and `HomePage`'s Following rail (4.3). It matches the glob and backs the in-scope page, so it is owned here; 4.3 inherits it as already-tested and MUST NOT add a duplicate suite. *Alternative considered:* defer it to 4.3 since its recency-sort semantics are "home rail." Rejected — the explicit glob plus the in-scope `/following` consumer make this carve-out its natural owner, and splitting one DAL function's tests across two changes violates the one-function-one-suite principle.

### Decision 2 — DAL + server-action integration harness against pglite (Tier 1)

The modules under test use `import { db } from '@/db'` (the production Neon-http client). Tests must redirect that to a migrated in-process pglite DB. Pattern:

```ts
import { vi, beforeEach } from 'vitest';
import { mockNextCache } from '@/test/helpers/next-cache';
import { bootPglite } from '@/test/helpers/db';

mockNextCache();                       // no-op cacheTag, capture updateTag

const holder: { db?: ReturnType<...> } = {};
vi.mock('@/db', () => ({ get db() { return holder.db!; } }));  // getter → late-bound

beforeEach(async () => {
  const { db } = await bootPglite();   // fresh migrated DB per test
  holder.db = db;
});
```

The `vi.mock` factory is hoisted and sync; pglite boot is async. The **getter-on-a-mutable-holder** pattern bridges them: the factory returns an object whose `db` getter reads `holder.db`, populated in `beforeEach`. Each test gets an isolated DB (no cross-test leakage; `pool: 'forks'` already isolates files but per-test boot isolates *rows*).

- `auth()` is mocked via `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))` and `vi.mocked(auth).mockResolvedValue(session)` per test — this IS the NextAuth network boundary the foundation explicitly allows mocking.
- `updateTag` assertions read `vi.mocked(updateTag).mock.calls` from the `mockNextCache` spy.

*Alternative considered:* a `getDb()` indirection in the carve-out source instead of mocking the static import. Rejected as the default — it changes runtime source to suit tests. Held as the **fallback** if the getter-holder binding proves unreliable for a given module (a testability refactor inside scope, per the foundation's refactor authority).

This harness shape — pglite + `mockNextCache` + auth-boundary mock — is generalizable to all data-layer carve-outs and is therefore elevated to the accumulator as a **Tier 1** `testing-foundation` requirement. A shared `test/helpers/seedFollowGraph.ts` (users + follows + blocks + public lists) is extracted **only if** the duplication audit finds the seed boilerplate reused across both node files in a way that warrants it (the action file and the DAL file seed similar graphs); otherwise inline per the "extract on the third occurrence" norm. Given the user's standing DRY guidance, two near-identical seed blocks across the two node files is sufficient to extract — planned in `tasks.md` §audits.

### Decision 3 — `'use cache'` DAL reads under the node project

`isFollowing`, `isBlocked`, `viewerHasAnyFollows` carry the Next `'use cache'` directive and call `cacheTag(...)`. Under the node vitest project there is no Next compiler, so `'use cache'` is an inert string-literal statement and the function body runs as a plain async function. `mockNextCache()` replaces `cacheTag` with a no-op (and `updateTag`/`revalidateTag` with spies), so the reads execute against pglite without a cache scope. No source change needed. *Verified against* the existing `test/helpers/next-cache.test.ts` precedent.

### Decision 4 — Async server-component rendering (`FollowContainer`, `FollowingPage`)

Both are `async function` components. Primary approach: RTL `render(await Component(props))` — i.e. invoke the async component to get its element tree, then render. This is the same approach `test-app-frame` used for `AppMenu` / `Nav` (direct invocation), and it sidesteps any React 19 + RTL async-boundary uncertainty. For `FollowingPage` the `next/server` `after` is mocked to capture the callback so the test can invoke it synchronously and assert the single-statement last-seen write + `updateTag`. `redirect` (`next/navigation`) is mocked to a spy that throws a sentinel (mirroring Next's real control-flow-via-throw) so the post-redirect code is not reached.

### Decision 5 — What the action tests assert about "no transactions"

The `following` spec forbids `db.transaction(...)` / `tx.*`. The mocked pglite `db` exposes no transaction surface the action uses; the assertion is **behavioral**: the action completes its sequential single statements and the resulting row state is correct after each. We additionally assert the **block-first ordering residual** (Decision in the spec): after `blockUser`'s block-insert, a follow attempt is gated; and a partial-failure retry is idempotent. We do not attempt to simulate a mid-sequence crash with real rollback (impossible without transactions and not the contract) — instead we assert that re-running `blockUser` after a leftover follow row cleans it up.

### Decision 6 — jsdom `<dialog>` in `FollowDisclosureDialog`

jsdom does not fully implement `HTMLDialogElement.showModal()` / `close()` (no top-layer, focus trap is partial). The test stubs `HTMLDialogElement.prototype.showModal` and `close` with spies that also toggle the `open` attribute, then asserts: `showModal` called + confirm focused when `open` flips true; `close` called when `open` flips false; the `cancel` event is `preventDefault`'d and routed to `onCancel`; the `close` event routes to `onCancel` only while `open`. This asserts the component's *contract with the dialog API*, not jsdom's incomplete native behavior. Stubs reset in `afterEach`. *Alternative considered:* render-only assertions skipping the modal lifecycle — rejected, it would leave the `useEffect` open/close branches uncovered (and the floor requires them).

### Decision 7 — Mocking out-of-carve-out children (`ListCard`, `MoreCard`, `ListCollectionsNav`)

These are owned by `list-collections` (4.6). Where a component renders them as a **pure structural pass-through** (`PublicListsGrid` → `ListCard`, `UserCardGrid` → `MoreCard`), they are module-mocked to minimal stubs (`<div data-testid="list-card" />`) so the test asserts *that the child is rendered with the right props in the right place*, not the child's internals. `FollowingPage` mocks `ListCollectionsNav` similarly. This keeps each carve-out's tests asserting only its own behavior and avoids coupling to another capability's render output. The real children are exercised by their own carve-out's suites.

### Decision 8 — `initialsOf` duplication (duplication-audit finding)

`initialsOf` is copy-pasted in three carve-out files with a subtle divergence:

- `ProfileHeader.tsx` and `UserCard.tsx`: fall back to `'?'` (and `|| '?'`).
- `Avatar.tsx`: falls back to `''` (empty string → triggers the `<FaUser>` icon branch).

Disposition: **extract-in-place** to a shared helper that takes the fallback as a parameter (or returns `''` and lets each call site apply its own fallback) — `app/(main)/users/ui/utils.ts`, exporting `initialsOf(name): string` returning `''` for empty, with `ProfileHeader`/`UserCard` applying `|| '?'` at the call site. This preserves all three behaviors, removes the triplication, and the new component tests lock each call site's fallback. Aligns with the project's standing "extract on sight" DRY guidance. The extracted helper is a pure lib → also gets a direct unit test and a `COVERAGE_FLOOR` entry. *Alternative considered:* leave the three copies (they "look trivial"). Rejected — three divergent copies of a string-munging function is exactly the latent-bug surface the duplication audit exists to catch.

### Decision 9 — Tier classification (per `test-coverage` design D13)

- **Tier 1 (rolls into the parent accumulator at apply):** the DAL + server-action pglite integration-test contract (Decision 2). It is a cross-cutting foundation rule, not carve-out bookkeeping — every later data-layer sub-proposal depends on it.
- **Tier 2 (sub-proposal archive ONLY):** the `following` carve-out coverage lock (files at `COVERAGE_FLOOR`, complexity promoted to `error`). Bookkeeping that does not propagate.

This split is written explicitly into `specs/testing-foundation/spec.md` and re-stated in `tasks.md` so the §7.6 rollup-tier audit can verify the content landed where the classification says.

## Risks / Trade-offs

- **[`vi.mock('@/db')` static-import binding]** → getter-on-holder pattern (Decision 2); fallback `getDb()` indirection if a module's binding can't be swapped.
- **[pglite vs Neon-http SQL dialect drift]** → pglite is real Postgres; the `GREATEST` / `FILTER (WHERE …)` / `MAX` aggregate in `getFollowingFeedUsers` are standard Postgres and run identically. The only neon-http-specific behavior (no transactions) is asserted behaviorally, not via the driver.
- **[jsdom `<dialog>` incompleteness]** → stub `showModal`/`close`, assert the contract not the native top-layer (Decision 6).
- **[async server-component rendering uncertainty]** → direct invocation `render(await Component(props))` (Decision 4).
- **[`getFollowingFeedUsers` double-ownership with 4.3]** → owned here per glob; 4.3 inherits, no duplicate suite (Decision 1).
- **[spec correction is contestable]** → the schema (`db/schema.ts:137`) is authoritative: `primaryKey({ columns: [follower_id, followee_id] })`. The ADDED SHALL names the real mechanism; the idempotency test locks it.

## Migration Plan

Not applicable — additive tests, two config edits, one behavior-preserving in-carve-out refactor (`initialsOf` extraction), one spec-delta requirement. No data migration, no runtime behavior change, no rollback concern beyond reverting the change.

## Open Questions

- Whether the shared `seedFollowGraph` fixture lands in this change or is deferred until a third data-layer carve-out reuses it. Resolved at the §duplication audit during apply; the default leaning (per project DRY guidance) is to extract now given two near-identical seed blocks across the two node files.
