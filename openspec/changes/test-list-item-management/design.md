## Context

Sub-proposal 4.9 of the `test-coverage` initiative, scoped (per the split this proposal takes) to the two server-action files only. The foundation is established and archived: vitest 4.x with two projects (`jsdom` for `.test.tsx`, `node` for `.test.ts`), `bootPglite()` in `test/helpers/db.ts` as the DB-under-test, `mockNextCache()` in `test/helpers/next-cache.ts`, the universal `COVERAGE_FLOOR` constant in `vitest.config.ts`, and the four-audit + invariant-elevation obligations. This is the **first** sub-proposal to test server actions (the `test-foundation-spike` PoC proved the pattern against one DAL function and one action; this is the first production action carve-out).

Carve-out (the two files in full — see `proposal.md` for the cross-capability overlap and why whole-file ownership lands here):

| File | LOC | Exported functions | Private helpers | Tested how |
|---|---|---|---|---|
| `app/actions/items.ts` | 820 | `getItemEditData`, `createPurchase`, `removePurchase`, `createItem`, `updateItem`, `archiveItem`, `deleteItem` | `emptyStore`, `updateItemStores`, `updateItemLists` | `node` + pglite; `@/db` / `@/lib/auth` / `next/cache` mocked; DAL + `listAccess` real |
| `app/actions/lists.ts` | 799 | `createList`, `updateList`, `deleteList`, `setListVisibility`, `bookmarkList`, `unbookmarkList`, `clearVisitHistory`, `removeVisit`, `setListItems`, `updatePriority` | `authedUserId`, `checkListBalance`, `rebalanceList` | same harness |

Coverage floor: universal `COVERAGE_FLOOR` (98 / 98 / 95 / 100), per-file, referencing the single constant.

Bound by: `testing-foundation` (verbatim — note the "DAL functions are not mocked from action tests" scenario and the network-boundary-only mocking rule); `list-item-management` (active, the authoritative action contract); `server-endpoint-authorization`, `list-visibility`, `list-collections`, `visit-history`, `item-store-links` (active — these own invariant elevation for the functions in `lists.ts` / `items.ts` that belong to them; this carve-out covers those functions but defers their spec elevation); the `drizzle-orm/neon-http` no-transactions constraint (`db/index.ts`, `DATABASE.md`).

## Goals / Non-Goals

**Goals:**

- Land two colocated `.test.ts` files (both `node` project) bringing `app/actions/items.ts` and `app/actions/lists.ts` to the universal `COVERAGE_FLOOR`.
- Exercise every observable branch of every function — every Zod validation arm, every auth/ownership guard, every claim-contract branch, the full `updatePriority` midpoint ladder + rebalance, and the `setListItems` diff. No execute-for-coverage calls, no tautologies, no snapshot-only tests.
- Assert real-DB persisted state (rows present/absent, positions, `archived_at`, `shared_at`, `favorited_at`) against pglite — not just return values.
- Assert cache-tag invalidation (`updateTag` call args) on success paths via `mockNextCache()`.
- Promote `sonarjs/cognitive-complexity` to `error` for both files.
- MODIFY the `list-item-management` capacity requirement to match source + the `neon-http` constraint (Decision 4).
- ADD the `updatePriority` reorder/rebalance requirement to `list-item-management` (Decision 5).
- Complete the four-audit + invariant-elevation obligations, recording dispositions in `tasks.md`.
- Open the sibling `test-list-item-management-ui` issue + checkbox for the deferred UI.

**Non-Goals:**

- No item-management UI coverage (deferred to the split — `test-list-item-management-ui`).
- No new coverage floor or invariant elevation for `lib/dal.ts`, `lib/listAccess.ts`, `lib/visibility.ts`, `lib/sqlstate.ts` (owned by 2.1, archived).
- No invariant elevation to `server-endpoint-authorization`, `list-visibility`, `list-collections`, `visit-history`, or `item-store-links` — those sub-proposals (4.13 / 4.11 / 4.6 / 4.14 / 4.4) own their own spec elevation even though their functions are covered here. (Decision 2.)
- No attempt to make the residual guest/different-user capacity race pass — it is an accepted limitation of the driver, and Decision 4 documents it rather than testing for an unreachable guarantee.
- No e2e. The full mobile claim flow with spoiler hiding is 6.x territory.
- No real Neon / network call. `auth()` is mocked at the `@/lib/auth` boundary; the DB is in-memory pglite.

## Decisions

### Decision 1: One `.test.ts` per source file, colocated under `app/actions/__tests__/`, in the `node` project.

`items.test.ts` and `lists.test.ts` live at `app/actions/__tests__/`. They are `.test.ts` (not `.tsx`) so vitest's `node` project runs them (`environment: 'node'`) — these are server actions with no DOM. This is the first `__tests__/` directory under `app/actions/`; the convention is uniform with every prior carve-out.

**Alternatives considered:**

- *One mega `actions.test.ts`.* Rejected — destroys per-file coverage attribution and failure-output locality; same reasoning as every prior carve-out.
- *Split by capability (e.g. `purchases.test.ts`, `reorder.test.ts`).* Rejected — coverage thresholds are keyed by *source* path, and both source files are single files; the test-file split must mirror source files, not capabilities. Capability grouping happens via `describe` blocks inside each file.

### Decision 2: Whole-file coverage ownership here; invariant elevation scoped to `list-item-management` only.

The binding constraint is that vitest per-file thresholds are whole-file: enumerating `app/actions/lists.ts` in `vitest.config.ts` forces the entire file (including `setListVisibility`, `bookmarkList`, `clearVisitHistory`, `removeVisit`) to the floor in this one change. Since §4.9 explicitly names both whole files, this sub-proposal owns that attribution and covers every function.

But coverage ownership and invariant ownership are distinct. This sub-proposal elevates invariants **only** to the `list-item-management` spec it owns. The functions belonging to other capabilities are still exercised to the floor here (with substantive assertions on their observable behavior), but their *spec elevation* is left to their owning sub-proposals:

| Function(s) | Covered here | Invariant elevation owned by |
|---|---|---|
| `setListItems`, `updatePriority`, `createPurchase`, `removePurchase`, item CRUD | yes | **4.9 (this) → `list-item-management`** |
| `setListVisibility` | yes (floor) | 4.11 → `list-visibility` |
| `bookmarkList`, `unbookmarkList` | yes (floor) | 4.6 → `list-collections` |
| `clearVisitHistory`, `removeVisit` | yes (floor) | 4.14 → `visit-history` |
| `updateItemStores` (private) | yes (floor, via `createItem`/`updateItem`) | 4.4 → `item-store-links` |
| auth/owner guards on every function | yes (floor) | 4.13 → `server-endpoint-authorization` |

Downstream sub-proposals add their capability-specific assertions and spec SHALLs; they do NOT re-enumerate the per-file thresholds (already in force after this change). The §5.5 invariant-elevation audit records, per function, which invariants are elevated here vs. deferred (with the owning sub-proposal named) vs. not elevated at all.

**Alternative considered:** *Split the two action files into capability-scoped modules so each capability owns its file's floor.* Rejected — that is a cross-file architectural refactor touching every call site (`'use server'` export boundaries, imports in pages and UI), which `testing-foundation`'s refactor-scope requirement explicitly forbids inside a test sub-proposal ("Refactors that span files outside the carve-out … SHALL NOT be performed"). If the owner later wants capability-scoped action modules, that is its own non-test change.

### Decision 3: The pglite + `@/db` + `@/lib/auth` + `next/cache` harness.

Server actions statically `import { db } from '@/db'` (the Neon HTTP client). To run them against pglite, `@/db` is module-mocked to the `bootPglite()` drizzle instance. Because `vi.mock` is hoisted and the pglite DB is created per test, the mock reads from a mutable holder set in `beforeEach`:

```ts
import { beforeEach, vi } from 'vitest';
import { bootPglite } from '@/../test/helpers/db';

const dbHolder: { db: Awaited<ReturnType<typeof bootPglite>>['db'] | null } = { db: null };

vi.mock('@/db', () => ({
  get db() {
    if (!dbHolder.db) throw new Error('pglite db not booted');
    return dbHolder.db;
  },
}));

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
mockNextCache(); // updateTag / revalidateTag become vi.fn()

beforeEach(async () => {
  const { db } = await bootPglite();
  dbHolder.db = db;
  vi.mocked(auth).mockReset();
});
```

Key points:

- **`@/db` is mocked, not the DAL.** The testing-foundation "DAL functions are not mocked from action tests" rule is satisfied: `getItemById`, `getListsByUser`, `getUserIdByEmail`, and `isItemViewable` run their real query logic against pglite because they too import `@/db` (the same mock). The mock replaces the *Neon network client*, which is the legitimate DB boundary — analogous to mocking the NextAuth network boundary, not an internal module.
- **`@/lib/auth` is the network boundary.** `auth()` is mocked to return a fixture `Session` (`{ user: { email, name } }`), `null`, or a session whose email matches no seeded user (to exercise the `user not found` branches). No OAuth handshake occurs.
- **`next/cache` is mocked** because `updateTag` / `cacheTag` are Next compiler constructs that no-op (or throw) under raw vitest; the mock makes `updateTag` a `vi.fn()` so success-path tests assert `expect(updateTag).toHaveBeenCalledWith('items')` etc. (the spike's `dal-cache.test.ts` documents this as the chosen approach for tag-invalidation assertions).
- **Fresh DB per test.** `bootPglite()` is called in `beforeEach`, giving each test an isolated in-memory Postgres with migrations applied. This is the dominant per-test cost (per the spike); where a `describe` block shares an immutable fixture, setup may be lifted to a `beforeEach` that re-seeds, but the DB instance is never shared across tests to avoid cross-test state leakage. Concurrency-race tests (the `Promise.allSettled` claim cases) use a single booted DB within one test.

**Alternatives considered:**

- *Mock the DAL functions and `db` calls individually.* Rejected — violates the testing-foundation no-internal-mocking rule and would test the mock, not the action's real DB behavior (the partial-unique-index `23505` path is only observable against a real Postgres).
- *Use the dev Neon branch as the test DB.* Rejected by the spike (CI cost, network flakiness, shared-state hazard); pglite is the chosen DB-under-test.
- *`vi.mock('@/db')` returning a static instance created at module load.* Rejected — module-load is before `beforeEach`, so all tests would share one DB and leak state; the getter-over-holder pattern gives per-test isolation while satisfying the hoist constraint.

### Decision 4: MODIFY the `list-item-management` "Purchase capacity SHALL be enforced atomically" requirement to match the source and the `neon-http` constraint.

The active requirement reads (excerpt): *"The existence check, capacity count, and insert SHALL execute inside a single database transaction. Inside the transaction, the item row SHALL be locked with `SELECT … FOR UPDATE` so that concurrent `createPurchase` calls against the same item serialize."*

This is **un-implementable** on the production driver. `db/index.ts` uses `drizzle-orm/neon-http`; `DATABASE.md` and `CLAUDE.md` state plainly that `db.transaction(...)` and `SELECT … FOR UPDATE` are unavailable (every query is its own HTTP round-trip). The source at `app/actions/items.ts:212-247` does **not** open a transaction or take a row lock — it performs a best-effort in-app count (`existing.length >= item.quantity_limit` → `Fully claimed`), inserts, and catches a `23505` partial-unique-index violation (authenticated-duplicate only) to return `Duplicate claim`. The comment at lines 231-238 explicitly records: *"The capacity-race for guest claims / different users on a limited item is not closed at the DB layer … Accepted as a known limitation."*

So the spec mandates an implementation the driver forbids and the source never had. Per the spec-follows-source precedent (`test-app-frame` Decision 3a, where the R2 mobile-nav scenario was MODIFIED because the source had evolved past the spec), the requirement is **MODIFIED** to describe the real, enforceable contract:

1. **Best-effort capacity check** — when `quantity_limit` is non-null and the current `purchases` count for the item is `>= quantity_limit`, `createPurchase` returns `{ success: false, error: 'Fully claimed' }`. (Single-caller and not-concurrent cases are fully enforced.)
2. **DB-level duplicate prevention** — the partial unique index `purchases (item_id, user_id) WHERE user_id IS NOT NULL` closes the authenticated-duplicate race at the DB layer; a `23505` trip returns `{ success: false, error: 'Duplicate claim' }`.
3. **Documented residual race** — under true concurrency, two distinct authenticated users (or guests) claiming a `quantity_limit = 1` item can both pass the in-app count and both insert (the partial index does not constrain distinct `user_id`s or NULL guest rows), so the limit can be exceeded. This is an **accepted limitation** of the `neon-http` no-transactions constraint, not a defect; closing it requires `SELECT … FOR UPDATE` (driver-unavailable) or a different schema-level backstop (a counter with a CHECK + `ON CONFLICT`, out of scope here).

The tests assert the enforceable parts: the single-caller `Fully claimed`, the same-user duplicate `23505` → `Duplicate claim` (real pglite partial index — the spike confirmed pglite enforces it with SQLSTATE `23505` on `.cause.code`), and the two-distinct-guests-both-succeed case (documenting the residual race as observed behavior, not asserting a guarantee the code doesn't make).

**Why MODIFY rather than leave the spec and `/* v8 ignore */` the gap:** the requirement isn't a coverage gap — it's a normative contract that contradicts both the source and a hard infrastructure constraint. Leaving it would (a) make the spec un-satisfiable, and (b) invite a future contributor to "fix" the source by adding a transaction that the driver silently ignores or that throws. The MODIFIED requirement names the partial index as the real backstop and the residual race as accepted, so the contract is honest and the test asserts what the code actually guarantees.

**Alternatives considered:**

- *Leave the spec; mark the requirement as aspirational.* Rejected — OpenSpec SHALLs are normative, not aspirational; an un-satisfiable SHALL is a defect in the spec.
- *Switch `db/index.ts` to `neon-serverless` (WebSocket Pool) to gain transactions, then implement the lock.* Rejected — out of carve-out (cross-file infrastructure change), and `db/index.ts` + `DATABASE.md` explicitly forbid it without owner approval.
- *Add a schema-level capacity backstop (counter column + CHECK + `ON CONFLICT`).* Rejected as out of scope — it is a schema migration + source change beyond a test carve-out; if the owner wants the residual race closed, that is its own non-test change. Noted as a candidate in `tasks.md` §5 (deferred finding, not opened as a sub-proposal unless the owner wants it).

### Decision 5: ADD a `list-item-management` requirement for the `updatePriority` reorder + rebalance contract.

`updatePriority(item_id, target_id, listId)` implements fractional indexing for list ordering, but no `list-item-management` requirement states the contract (the spec's only position-related requirement is "Re-added items SHALL NOT preserve prior position" for `setListItems`). The source enforces:

- New `list_items` rows are placed at `MAX(position) + 65536` (initial spacing of 65536).
- Moving an item computes a new integer position at the **midpoint** between the target position and the neighboring position on the side the item is moving from (`floor((otherBoundary + targetPosition) / 2)`), or `floor(targetPosition / 2)` when moving to the front edge, or `targetPosition + 65536` when moving past the back edge.
- After each move, `checkListBalance` reads the two highest positions; if their gap is `< 0.001` (`minGap`), `rebalanceList` rewrites every row to `(index + 1) * 65536`, restoring spacing.
- Identity / not-found guards: `item_id === target_id` position equality → `Item is already at the target position`; missing item or target → `Item or target not found on this list`; non-owner → unauthorized.

This meets all three elevation criteria: (a) non-obvious — fractional indexing and a `0.001` rebalance threshold are not derivable from the function signature; (b) survives reimplementation — any reorder rewrite must preserve stable, collision-free ordering, which is the contract; (c) protects a real failure mode — position collision or drift corrupts the displayed order of a shared gift list (a user-visible data-integrity bug). Elevated. The tests assert the midpoint math, the end-edge cases, the no-op equality guard, and that a forced near-collision triggers a full rebalance to 65536-spacing.

**Alternative considered:** *Elevate only the public contract ("items can be reordered and order is stable") without the 65536 / 0.001 internals.* Rejected — the magic numbers are exactly the non-obvious, reimplementation-surviving part; a vague "order is stable" SHALL would not catch a regression that drops the rebalance and lets positions collide. The requirement states the numeric contract so the test can lock it.

### Decision 6: Assert persisted DB state, not just return values.

Because the harness uses a real (pglite) database, every mutation test asserts the resulting rows, not only the `ActionResponse`. E.g. `archiveItem(id, true)` asserts both `{ success: true }` AND that the row's `archived_at` is a `Date` (and `null` after unarchive); `setListItems` asserts the exact surviving `list_items` rows and their positions; `setListVisibility` asserts `visibility`, the legacy `shared` boolean, and the `shared_at` transition; `removePurchase` asserts the row is gone (or preserved on a `Not your claim` rejection). This is what makes the tests substantive per the assertion-substance bar — a return-value-only assertion would pass against a no-op implementation.

**Alternative considered:** *Assert only `ActionResponse`.* Rejected — fails the assertion-substance bar (the action could return `{ success: true }` without writing anything and a return-only test would not notice).

### Decision 7: Seed fixtures are built inline per test against pglite, not via `scripts/seed-dev-users.ts`.

The dev seed is the **E2E** fixture (per the seed-as-fixture requirement); these unit/integration action tests build minimal per-case fixtures (a user, a list, an item, a `list_items` row) directly via `db.insert(...)`, mirroring the spike's `seedClaimFixture` helper. This keeps each test's setup legible and avoids coupling action-test outcomes to dev-seed drift. A small local `seed*` helper per file (or a shared `app/actions/__tests__/test-helpers.ts` if the §5.2 duplication audit warrants it) builds the common owner+list+item graph.

## Risks / Trade-offs

- **The capacity-requirement MODIFICATION weakens a HIGH-stakes-sounding SHALL.** A reviewer skimming the spec delta might read "removed the transactional lock" as a regression. → Mitigation: the MODIFIED requirement and Decision 4 state plainly that the lock was never implemented and is driver-impossible; the partial unique index (the real, tested backstop) stays; the residual race is documented as a pre-existing accepted limitation, not introduced here. The change is descriptive honesty, not a behavior change.
- **The residual capacity race is real and now spec-documented as accepted.** If the owner considers the guest/different-user over-claim unacceptable, the fix is a schema-level backstop (out of scope). → Mitigation: §5 records this as a deferred finding the owner can promote to its own change; the test documents the current behavior so a future fix has a baseline.
- **pglite fidelity to Neon.** pglite is real Postgres (WASM), so SQLSTATE codes, partial unique indexes, and `ON CONFLICT` behave authentically (the spike verified `23505` on `.cause.code`). The one known divergence — `'use cache'` / `cacheTag` being Next-runtime-only — is handled by mocking `next/cache` and asserting `updateTag` call args rather than cache flushing. → Accepted; the spike already mapped this boundary.
- **Concurrency tests under a single-threaded WASM DB.** `Promise.allSettled([insert, insert])` against pglite serializes at the JS event loop, so the "two concurrent same-user claims" test exercises the partial-unique-index `23505` path deterministically (one fulfills, one rejects) but does NOT reproduce true wall-clock parallelism. → Accepted: the DB-layer guarantee (unique index) is what the test locks; true-parallelism behavior is the residual race that Decision 4 documents as un-enforceable anyway.
- **`@/db` getter-mock hoisting.** `vi.mock` factories are hoisted above imports; the getter-over-mutable-holder pattern is required so the per-`beforeEach` pglite instance is visible. → Mitigation: the holder pattern is documented in Decision 3 and (if duplicated) extracted to `test-helpers.ts`; a mis-wire fails loudly on the first query ("pglite db not booted").
- **Complexity promotion may bite `updatePriority`.** Its four-way midpoint ladder plus the rebalance call may measure near the ceiling. → Mitigation: if over 15 at HEAD, an in-place extraction of the midpoint computation into a private helper inside `lists.ts` (single-file, behavior-preserved by the new tests) is the disposition; recorded in §5.3.
- **First action carve-out → harness conventions set precedent.** The `@/db` getter-mock + `@/lib/auth` mock + `mockNextCache()` + per-test `bootPglite()` pattern will be reused by 4.2 `test-following`, 4.13, 4.15, and 5.1. → Accepted and intended: the pattern is documented here and, if extracted, lands in a reusable `test-helpers.ts`; later action carve-outs inherit it.
