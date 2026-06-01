## Context

Sub-proposal 4.13 of the `test-coverage` initiative — the HIGH-stakes authorization carve-out. All primitive-family carve-outs (3.1–3.6, 3.8) and the first capability-flow carve-out (4.1 `test-app-frame`) are archived; the `testing-foundation` capability is established and hardened. This is the first carve-out to target the **mutation layer** (`app/actions/**`) and an **API route** (`app/api/image-search`) rather than UI. That changes the test shape fundamentally: these are `.test.ts` files in the **node** vitest project (not jsdom), they run against a **real pglite database** (not RTL), and the thing under test is server-side authorization logic, not rendered DOM.

The authorization code is already hardened. The now-archived `harden-server-action-authorization` (2026-05-22) and `harden-remaining-server-actions` (2026-05-22) changes resolved every actor from `auth()`, removed `user_id` from input schemas, added ownership checks before update/delete, and locked the image-search route behind auth + rate limiting. The active `server-endpoint-authorization` spec records those outcomes as six requirements. **This carve-out builds the regression net under that hardened code — it is not a discovery exercise.** The parent issue's "in-flight `harden-remaining-server-actions`" coordination note is stale (the change archived before this sub-proposal opened).

Carve-out (per parent `test-coverage` tasks.md §4.13: "every server action and API route, asserted authorized for every caller class — owner / authenticated non-owner / unauthenticated"):

| File | Exports under test | Char | Tested how |
|---|---|---|---|
| `app/actions/lists.ts` | `createList`, `updateList`, `deleteList`, `setListVisibility`, `bookmarkList`, `unbookmarkList`, `clearVisitHistory`, `removeVisit`, `setListItems`, `updatePriority` | `'use server'`. Each resolves the actor via `auth()` → `users.email` → `users.id`. Update/delete actions load the target `lists` row and compare `user_id`. `setListItems` / `updatePriority` manage `list_items` with fractional positions + rebalance. Visit actions write `list_visits`. | node + pglite; `@/lib/auth` `auth()` mocked per caller class; `next/cache` mocked to spy `updateTag` |
| `app/actions/items.ts` | `getItemEditData`, `createPurchase`, `removePurchase`, `createItem`, `updateItem`, `archiveItem`, `deleteItem` (+ internal `updateItemLists`, `updateItemStores`) | `'use server'`. Owner-gated item CRUD. `createPurchase` / `removePurchase` are the **guest write paths** — the only actions permitting unauthenticated writes, keyed by `guest_name` (+ `purchase_id` for revoke). `createPurchase` gates on `isItemViewable`. `deleteItem` / `updateItemStores` / `updateItemLists` THROW on unauthorized rather than returning a result. | node + pglite; `@/lib/auth` mocked; `next/cache` mocked; `lib/listAccess` + `lib/sqlstate` real (unmocked) |
| `app/actions/follows.ts` | `followUser`, `unfollowUser`, `removeFollower`, `blockUser`, `unblockUser` (+ internal `authedUserId`) | `'use server'`. Writes `user_follows` / `user_blocks`. Self-action rejection, both-direction block gating, block-first ordering, removeFollower followee-scoping. | node + pglite; `@/lib/auth` mocked; `next/cache` mocked |
| `app/actions/user.ts` | `signInUser`, `signOutUser` | `'use server'`. Thin NextAuth wrappers: `signIn('google')`; `signOut({ redirect: false })` then `redirect('/sign-in')`. No DB, no ownership. | node; `@/lib/auth` `signIn`/`signOut` mocked; `next/navigation` `redirect` mocked to throw a sentinel |
| `app/api/image-search/route.ts` | `GET` | Auth-gated (401), per-user token-bucket rate limit (429 `rate_limited`), query-length cap (400 `query_too_long`), in-memory result cache, multi-provider chain with `QuotaExceededError` fallthrough (429 `quota_exceeded`). Module-singleton bucket + cache. | node + pglite (for the `users` lookup); `@/lib/auth` mocked; upstream provider `fetch` intercepted; `vi.resetModules()` per test for singleton isolation |

Coverage floor: universal `COVERAGE_FLOOR` per `test-housekeeping` (98 / 98 / 95 / 100). Per-file thresholds added by-name in `vitest.config.ts`, referencing the constant.

**Implementation-time reconciliation (2026-06).** Three of the five carve-out files were tested by sibling carve-outs that archived to `dev` before this change was implemented: `lists.ts` and `items.ts` by **4.9 `test-list-item-management`** (which also applied the Decision 5 `list-item-management` capacity MODIFY), and `follows.ts` by **4.2 `test-following`**. Their landed test files were verified to already assert this carve-out's specific invariants (lists three-caller matrix + `updateTag`-not-on-rejection; items createPurchase guest/viewability/capacity + partial-index trip + distinct-caller residual + removePurchase guest cross-revoke gate; follows actor-resolution + unauthenticated-no-write). The net-new work here is `user.ts` + `route.ts` tests, the ADDED follow-graph requirement (Decision 7) with its `removeFollower` third-party scoping test appended to `follows.test.ts`, and the testing-foundation bookkeeping. Decisions 1–3 still apply to the two net-new files; Decision 5 is inherited from 4.9; Decision 4 is realized for `route.ts` (see its addendum).

Bound by:

- `testing-foundation` — `__tests__/` colocation, `.test.ts` → node project, universal `COVERAGE_FLOOR`, no-backdoor rule, four-gate pre-merge, four-audit + invariant-elevation obligations, assertion-substance bar, complexity ≤ 15, `<State>_<Behavior>` shape, three-role `describe()`. Mocking allowances: NextAuth (`@/lib/auth`) and the image-search upstream `fetch` are network boundaries to mock; DAL / `lib/listAccess` / `lib/sqlstate` / `lib/visibility` are internal and run real against pglite.
- `server-endpoint-authorization` (active) — six SHALLs. This carve-out ADDS one (follow-graph actor resolution).
- `list-item-management` (active) — owns the purchase contract. This carve-out MODIFIES the capacity-enforcement SHALL (driver reality).
- `following`, `visit-history`, `list-visibility` (active) — own the behavioral contracts for follows, visit/bookmark, and visibility actions respectively. Asserted against; not modified.

## Goals / Non-Goals

**Goals:**

- Land five colocated `.test.ts` files (all node project) at the universal `COVERAGE_FLOOR`.
- For every ownership-bearing action, assert the **three-caller-class matrix**: owner success (DB mutated + correct `updateTag`), authenticated non-owner rejection (DB unchanged + no `updateTag`), unauthenticated rejection (DB unchanged + no `updateTag`).
- For the guest write paths (`createPurchase`, `removePurchase`), assert the guest-identity axis including the negative cases (no name, wrong name, guest revoking an authed claim, guest on the authed-only legacy path).
- Assert the image-search route's auth (401), rate-limit (429 `rate_limited`), query-cap (400 `query_too_long`), cache-hit, and provider-fallthrough (429 `quota_exceeded`) behaviors with the upstream `fetch` intercepted.
- MODIFY `list-item-management`'s capacity-enforcement SHALL to match the neon-http reality (Decision 5).
- ADD the follow-graph actor-resolution SHALL to `server-endpoint-authorization` (Decision 7).
- Complete the four-audit obligation + invariant-elevation audit, recording dispositions in `tasks.md`.

**Non-Goals:**

- No test for `app/api/auth/[...nextauth]/route.ts` — it is the NextAuth handler this carve-out mocks as a boundary; testing it means testing NextAuth against real Google OAuth (forbidden by `testing-foundation`).
- No coverage-floor enumeration for `lib/dal.ts` / `lib/listAccess.ts` / `lib/sqlstate.ts` / `lib/visibility.ts` — exercised (real, unmocked) by the action tests but owned by their own carve-outs. `listAccess` / `sqlstate` / `visibility` already have colocated tests at floor.
- No test for the UI call sites (forms, kebab menus, claim buttons) — own their capability-flow carve-outs.
- No e2e. The full claim-under-concurrency flow against real Neon (where the residual capacity race actually manifests) is e2e/load territory, not unit.
- No switch to `neon-serverless` / WebSocket Pool to make `SELECT … FOR UPDATE` testable — explicitly forbidden without owner approval (project context + DATABASE.md). The spec is corrected instead.
- No real upstream provider call; no real Google OAuth handshake.

## Decisions

### Decision 1: One `.test.ts` per source file, colocated under `__tests__/`, in the node project.

Five source files → five test files: `app/actions/__tests__/{lists,items,follows,user}.test.ts` and `app/api/image-search/__tests__/route.test.ts`. The `.test.ts` extension routes them to the **node** vitest project (jsdom is for `.test.tsx`). These are integration tests against a real database, not component tests — node is correct. Colocation under `__tests__/` matches `lib/__tests__/`, `test/helpers/`, and the established convention.

### Decision 2: DB-under-test is pglite, with `@/db` mocked to a hoisted holder.

Per the `test-foundation-spike` DB-under-test decision and the working precedent in `lib/__tests__/listAccess.test.ts`: boot pglite via `test/helpers/db.ts`'s `bootPglite()` (which replays the drizzle migration journal into an in-process Postgres), then substitute it for the production `@/db` export:

```ts
const dbHolder = vi.hoisted(() => ({ current: null as unknown as DB }));
vi.mock('@/db', () => ({ get db() { return dbHolder.current; } }));
// in beforeAll/beforeEach: dbHolder.current = (await bootPglite()).db;
```

The getter indirection is required because production source does `import { db } from '@/db'` at module load, before `beforeAll` runs — the getter lets the static import resolve to whatever pglite instance the test later assigns. **Internal modules are NOT mocked**: `lib/listAccess.isItemViewable`, `lib/sqlstate.sqlstateOf`, `lib/dal` reads, and `lib/visibility` all run real against the pglite-backed `db` (per `testing-foundation`'s internal-modules-not-mocked rule). This is what makes `createPurchase`'s viewability gate and `removePurchase`'s guest-identity check meaningful — they exercise the real predicates, not stubs.

**Fixture seeding:** each test file inserts the minimal rows for the three caller classes directly (no dependency on the prod `seed-dev-users.ts`, mirroring `listAccess.test.ts`): an owner user + a list/item they own; a second authenticated non-owner user + (where needed) a resource they own to prove cross-user rejection; the unauthenticated path needs no user row. Canonical ids (`OWNER`, `OTHER`, etc.) are module constants so assertions read clearly.

### Decision 3: The three caller classes are installed by mocking `@/lib/auth`'s `auth()` per test.

`auth()` is the single chokepoint every action uses to resolve identity. `testing-foundation` classifies `@/lib/auth` (the NextAuth wrapper) as the network boundary to mock. The three classes:

- **Owner / authenticated non-owner**: `vi.mocked(auth).mockResolvedValue({ user: { email: '<seeded user email>' } })`. The action looks up `users.id` from that email against pglite, so the *seeded* email determines which user is acting — owner vs. non-owner is just which email the mock returns. This keeps the actor-resolution path (email → id lookup) under real test rather than short-circuiting it.
- **Unauthenticated**: `vi.mocked(auth).mockResolvedValue(null)`.

A `sessionFor(userIdOrEmail)` helper centralizes the mock-return construction. For `user.ts`, `@/lib/auth`'s `signIn` / `signOut` are mocked instead (no DB).

### Decision 4: The image-search route's module-singleton state is reset via `vi.resetModules()` + dynamic re-import per test.

`route.ts` holds two process-level singletons: `rateBuckets` (the per-user token bucket `Map`) and `resultCache` (the result `Map`). Across tests these leak — a rate-limit test that exhausts a user's bucket would poison the next test's count, and a cache-population test would make a later cache-miss test see a hit. Mitigation: in `beforeEach`, `vi.resetModules()` then `const { GET } = await import('../route')` so each test gets a fresh module instance with empty maps. `@/lib/auth`, `@/db`, and the upstream `fetch` mocks are re-established under the reset (mocks defined with `vi.mock` at file top survive `resetModules`; `global.fetch` is re-stubbed in `beforeEach`).

**Upstream `fetch` interception:** `global.fetch` is replaced with a `vi.fn()` that returns a canned provider response (SerpAPI's `images_results` shape or Serper's `images` shape, per which provider chain the test configures via `process.env`). The negative-path tests (401, 429 rate-limit, 400 query-cap) assert `expect(fetch).not.toHaveBeenCalled()` — proving the route rejects *before* spending provider quota, which is the entire point of `server-endpoint-authorization`'s "paid-quota API SHALL require auth" requirement. The `QuotaExceededError` fallthrough test makes the first provider's `fetch` resolve a 429 and asserts the chain advances / surfaces `quota_exceeded`.

If `vi.resetModules()` proves brittle (e.g. mock re-binding races), the testability-audit fallback is an in-place reset seam exported from `route.ts` (`__resetRateLimitForTests()` / `__resetCacheForTests()` guarded by `NODE_ENV === 'test'`); disposition recorded in `tasks.md` only if taken.

**Realized disposition (implementation).** `vi.resetModules()` + dynamic re-import per test worked cleanly — no reset seam was needed for the buckets/cache. One related testability gap remained: the `resultCache` LRU eviction (`if (resultCache.size >= CACHE_MAX_ENTRIES)`) is good code but only fires after 500 distinct cached queries, which the 30/min rate limit makes unreachable in a test. Rather than `/* v8 ignore */` it (which would pull working code out of the regression net), `CACHE_MAX_ENTRIES` was made env-tunable — `Number(process.env.IMAGE_SEARCH_CACHE_MAX_ENTRIES) || 500` — mirroring the file's existing `IMAGE_SEARCH_USE_MOCK` / `IMAGE_SEARCH_SIMULATE_QUOTA` / `IMAGE_SEARCH_PROVIDERS` knobs. This is a genuine config surface (a smaller cap is real production behavior, exercised identically whether prod or a test sets it), **not** a test-only backdoor; the test sets it to 2 via the same `loadRoute(env)` + `resetModules` harness and drives eviction in three calls. Result: `route.ts` reaches the floor with **zero** `/* v8 ignore */` annotations. The "small genuine source change beats an ignore for good-but-costly-to-test code" pattern from this decision was generalized into `TESTING.md` (under "Coverage ignore annotations require a rationale").

### Decision 5: MODIFY `list-item-management`'s capacity-enforcement requirement to match the neon-http driver reality.

The active requirement "Purchase capacity SHALL be enforced atomically against concurrent callers" mandates:

> 1. **Transactional row lock.** The existence check, capacity count, and insert SHALL execute inside a single database transaction. Inside the transaction, the item row SHALL be locked with `SELECT … FOR UPDATE` …

The `drizzle-orm/neon-http` driver **cannot** do this. DATABASE.md is unambiguous: "Interactive transactions are not supported on this driver. Do not introduce `db.transaction(...)`, `SELECT … FOR UPDATE` … If you find code claiming to use a transaction here, it's broken." The source agrees — `createPurchase`'s comment states the capacity race "is not closed at the DB layer (neon-http driver does not support interactive transactions …). Accepted as a known limitation." So the spec mandates a mechanism the codebase has architecturally ruled out.

This is spec drift, surfaced by trying to write a faithful test: there is no `SELECT … FOR UPDATE` to assert, and the "two concurrent claims on a `quantity_limit=1` item → exactly one succeeds" scenario is **false** for two distinct authenticated users or two guests (both can pass the in-app count and both insert; only the partial unique index closes the *same-user* duplicate). Disposition: **(a) MODIFY the requirement** to describe the actual two-layer enforcement:

1. **In-app check** — existence + capacity count + duplicate check before insert (best-effort; not atomic against concurrent callers).
2. **Partial unique index** `purchases (item_id, user_id) WHERE user_id IS NOT NULL` — closes the *authenticated same-user* duplicate at the DB layer (the `createPurchase` `catch` maps the `23505` violation to `{ error: 'Duplicate claim' }`).

…and explicitly record the residual: two distinct callers (two authed users, or two guests) racing on a limited item can overshoot capacity, because there is no row lock and the unique index does not constrain across distinct `user_id`s (or `NULL` guest rows). This residual is accepted under the no-transactions driver constraint. The scenarios are rewritten accordingly: the same-user-duplicate scenario stays (partial-index outcome); the cross-user "exactly one succeeds" scenario is reframed as "the same authenticated user cannot double-claim; capacity overshoot by distinct concurrent callers is accepted residual." This aligns the spec with `following`'s existing precedent ("Follow-graph mutations SHALL NOT use interactive transactions") and the project-wide driver constraint.

**Why MODIFY not REMOVE:** the *intent* — bound duplicate claims and surface `Fully claimed` / `Duplicate claim` correctly — is still a real, testable contract. Only the *mechanism* (transaction + row lock) is wrong. MODIFY preserves the intent and corrects the mechanism; REMOVE would drop a contract the tests still enforce.

**Delivered by sibling 4.9.** `test-list-item-management` reached the same conclusion independently and applied this exact MODIFY to the active `openspec/specs/list-item-management/spec.md` (in-app best-effort check + partial unique index + accepted distinct-caller residual) before this change was implemented. The landed `items.test.ts` already asserts it (`CapacityReached`, `DuplicateSameUser`/`DuplicateSameGuest`, `ConcurrentSameUser_SecondTripsUniqueIndex`, `TwoDistinctGuestsConcurrent_BothInsertExceedingLimit`). This change therefore inherits the requirement and does not re-apply the delta; the invariant-elevation audit maps it to those sibling tests.

### Decision 6: Visibility-touching tests use `VISIBILITY.*` + `fromDb()`, never literal DB strings.

`extract-visibility-constants` (active, Stage 1 of 3) routes every visibility value through `@/lib/visibility`'s `VISIBILITY` constants and the tolerant `fromDb()` decoder; Stage 2 flips the constant DB values and Stage 3 runs the DB `UPDATE`. A test that asserts `list.visibility === 'private'` would silently break at Stage 2. So `setListVisibility` / `bookmarkList` tests construct and assert visibility through `VISIBILITY.OWNER` / `VISIBILITY.LINK` / `VISIBILITY.FOLLOWERS` and decode stored values with `fromDb()` — exactly as the source does. This keeps the tests rollout-stable and asserts the same abstraction the production code uses. The `setListVisibility` `shared_at` transition + legacy `shared` dual-write are asserted against `list-visibility`'s SHALLs using the constants.

### Decision 7: ADD the follow-graph actor-resolution requirement to `server-endpoint-authorization`, not to `following`.

`server-endpoint-authorization`'s actor-resolution requirement enumerates `lists.ts` / `items.ts` and says "any future user-owned resource," but `follows.ts` is not named and `user_follows` / `user_blocks` are relationship tables, not the `user_id`-keyed owned rows the requirement's prose centers on. The follow actions DO resolve the actor exclusively from `auth()` (via `authedUserId`) and accept no actor parameter — that is a genuine authorization invariant the source enforces but no spec states explicitly. It meets the elevation bar: **(a) non-obvious** — the enumeration stops at purchases, so a reader would not assume follows are covered; **(b) survives reimplementation** — any correct follow-graph implementation must resolve the actor server-side; **(c) protects a real failure mode** — the `removeFollower` followee-scoping in particular: a refactor that accepted a `followee_id` parameter would let any authenticated user sever follow edges between two *other* users. The behavioral semantics (self-follow rejection, block gating, idempotency, block-first ordering) stay owned by `following` — this requirement owns only the cross-cutting authorization shape, consistent with how `server-endpoint-authorization` owns the "no client user_id" rule globally while `list-item-management` owns `createPurchase`'s specific shape.

### Decision 8: `it()` naming, `describe()` grouping, and the three-caller-class matrix structure.

Per `testing-foundation`'s `<State>_<Behavior>` `it()` shape and three-role `describe()` convention. Each action's tests group under a `describe('<actionName>')` with nested role-state describes, e.g. for `updateList`:

- `describe('owner')` → `OwnerUpdatesOwnList_SucceedsAndPersists`, `OwnerUpdate_CallsUpdateTagLists`
- `describe('authenticated non-owner')` → `NonOwnerUpdate_ReturnsUnauthorized_RowUnchanged`, `NonOwnerUpdate_DoesNotCallUpdateTag`
- `describe('unauthenticated')` → `NoSession_ReturnsUnauthorized_RowUnchanged`, `NoSession_DoesNotCallUpdateTag`

The unauthorized-path tests pair THREE assertions — error response + DB-row-unchanged (via a follow-up read) + `updateTag` not called — so a buggy action that rejects but still mutates or still invalidates is caught (this directly locks `server-endpoint-authorization`'s "rejections SHALL NOT invalidate caches" SHALL).

## Risks / Trade-offs

- **Spec-follows-source on the capacity requirement is a judgment call.** Correcting R-capacity to match the driver-constrained source (rather than "fixing" the source to honor the spec) is the right call given DATABASE.md forbids the alternative without owner approval — but it weakens a written guarantee (capacity is now best-effort + residual race) that a reader may have relied on. Mitigation: the MODIFIED requirement states the residual explicitly rather than silently dropping the atomicity claim, so the limitation is documented, not hidden.
- **Module-singleton isolation in the route test is the fragile spot.** `vi.resetModules()` + dynamic re-import is the standard vitest pattern but interacts subtly with hoisted `vi.mock`. If flakiness appears, the in-place reset-seam fallback (Decision 4) is the disposition — recorded only if taken.
- **Coverage on residual/defensive branches is the heaviest authoring cost.** `createPurchase`'s unique-violation `catch`, `updatePriority`'s rebalance trigger, and `setListItems`'s position-base computation need contrived but deterministic pglite fixtures to reach. Lowering the floor is not an option (no-backdoor rule); `/* v8 ignore */` with rationale is the fallback only for genuinely unreachable branches (e.g. a `catch` that re-throws a non-`23505` error), recorded in the testability audit.
- **The tests are a net, not a discovery.** Because the code is already hardened, a green suite proves regression protection, not that authorization was newly fixed. The value is durable: any future edit to these files that breaks a caller-class guarantee fails the suite. The risk is false confidence that 100% coverage equals 100% authorization correctness — mitigated by the assertion-substance audit ensuring each test asserts the *observable authorization outcome* (DB state + response + cache), not merely that the function ran.
- **Guest-path negative coverage is where a real regression would hide.** The subtlest bug class here is one guest revoking another's claim, or a guest slipping through the authed-only legacy revoke path. These are low-frequency but high-impact (cross-user data mutation). The tests over-invest in the guest negative matrix deliberately.
