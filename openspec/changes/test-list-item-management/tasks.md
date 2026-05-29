## 1. Test harness (action-test pattern — first action carve-out)

- [x] 1.1 Create `app/actions/__tests__/` (first `__tests__/` under `app/actions/`).
- [x] 1.2 Establish the action-test harness: `vi.mock('@/db', ...)` returning the per-test `bootPglite()` drizzle instance via a getter-over-mutable-holder (set in `beforeEach`); `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`; `mockNextCache()` from `test/helpers/next-cache.ts`. Per design Decision 3.
- [x] 1.3 Write the per-case seed helper(s) building the owner+list+item+`list_items` graph directly via `db.insert` (mirroring the spike's `seedClaimFixture`). Decide inline-per-file vs. shared `app/actions/__tests__/test-helpers.ts` — defer the extraction decision to the §5.2 duplication audit.
- [x] 1.4 Confirm the harness runs under the `node` project (`.test.ts`, `environment: 'node'`) and that a smoke test booting pglite + calling one action against it passes before writing the full suites.

## 2. items.ts coverage (`app/actions/__tests__/items.test.ts`)

- [x] 2.1 `ItemSchema` validation branches via `createItem`: name min/max length, `image_url` URL validity (empty-ok, valid, invalid), per-store all-or-nothing field refinement + store `link` URL validity, `quantity_limit` integer/min(1)/nullable. Assert `errors.fieldErrors` shape and that no `items` row is written on validation failure.
- [x] 2.2 `createItem` success: assert the inserted `items` row (name/description default `''`/image_url/quantity_limit/user_id), that `updateItemLists` created `list_items` at `MAX(position)+65536`, that `updateItemStores` inserted non-empty stores in order (and skipped empty ones), and that `updateTag('items')` fired.
- [x] 2.3 `createItem` / `updateItem` auth + ownership guards: unauthenticated → `Unauthorized`; session email with no user → `Unauthorized`; `updateItem` on an item owned by another user → `Unauthorized - item does not belong to you` with no write.
- [x] 2.4 `updateItem` success: partial-schema update writes only provided fields; `updateItemLists` adds new + removes deselected associations; `updateItemStores` updates changed rows, inserts overflow, deletes trailing rows; `updateTag('items')` fired. Assert persisted `list_items` / `item_stores` rows (Decision 6).
- [x] 2.5 `updateItemStores` / `updateItemLists` private-helper ownership guards (reached via update with a foreign item id, and via `updateItemLists` with a list owned by another user → `Failed to update item lists.`).
- [x] 2.6 `archiveItem`: sets `archived_at` to a `Date` on archive, `null` on unarchive; non-owner → `Forbidden`; asserts persisted row + `updateTag('items')`.
- [x] 2.7 `deleteItem`: owner delete removes the row (assert absent) + `updateTag('items')`; non-owner → throws/returns the unauthorized response; unauthenticated → `Unauthorized`.
- [x] 2.8 `getItemEditData`: unauthenticated → `null`; unknown email → `null`; missing item → `null`; success returns `{ item, lists }` from the real DAL reads against pglite (DAL NOT mocked).
- [x] 2.9 `createPurchase` identity contract: authenticated uses session `user_id` and discards payload `guest_name`; unauthenticated with non-empty `guest_name` inserts `user_id = NULL` + `guest_name`; unauthenticated with empty/missing `guest_name` → `Missing identity`. Assert persisted `purchases` rows.
- [x] 2.10 `createPurchase` viewability + duplicate + capacity: non-viewable item → `Item not found` (no row); duplicate (same actor) → `Duplicate claim`; `quantity_limit` reached sequentially → `Fully claimed`; the `23505` partial-unique-index catch path → `Duplicate claim` (real pglite index — assert `sqlstateOf` mapping). Locks the MODIFIED capacity requirement's enforceable parts (spec Decision 4).
- [x] 2.11 `createPurchase` residual race (documentary): two distinct guests on `quantity_limit = 1` both insert (partial index excludes NULL `user_id`) — asserts the accepted-limitation behavior, NOT a guarantee. Per spec MODIFIED scenario "Concurrent distinct claimants … residual race is accepted".
- [x] 2.12 `removePurchase` by `purchase_id`: authed owner deletes own row; authed non-owner → `Not your claim` (no delete); guest with matching `guest_name` on a guest row deletes; guest on an authed row → `Not your claim`; guest with wrong/empty `guest_name` → `Not your claim`; missing row → `Not found`.
- [x] 2.13 `removePurchase` legacy item-scoped path: authed deletes own `(item_id, user_id)` rows + `updateTag('items')`; unauthenticated or missing `item_id` → `Missing identity`.

## 3. lists.ts coverage (`app/actions/__tests__/lists.test.ts`)

- [x] 3.1 `createList`: `ListSchema` validation (name length, subtitle max-length + `'' → null` transform, date required); unauthenticated/unknown-user guards; success inserts the row and returns `{ id }` + `updateTag('lists')`. Assert persisted row including `subtitle === null` for empty input.
- [x] 3.2 `updateList`: non-existent list → `Not found`; non-owner → `Unauthorized`; partial update writes only provided fields and returns `{ id }`; empty `.returning()` → `Not found`; `updateTag('lists')` on success.
- [x] 3.3 `deleteList`: non-existent → `Not found`; non-owner → `Unauthorized`; owner delete removes row + `updateTag('lists')`.
- [x] 3.4 `setListVisibility`: invalid enum → `Validation`; non-owner → `Forbidden`; the `shared_at` transition matrix (private→non-private sets `shared_at`; →private clears it; unlisted↔public preserves it) and the legacy `shared` boolean dual-write; `updateTag('lists')`. (Floor coverage here; visibility-invariant elevation deferred to 4.11.)
- [x] 3.5 `bookmarkList` / `unbookmarkList`: unauthenticated → `Unauthorized`; non-viewable private list of another owner → `List not viewable`; bookmark inserts/`onConflictDoUpdate` sets `favorited_at`; unbookmark nulls `favorited_at`; `updateTag('list_visits')`. (Floor coverage; elevation deferred to 4.6.)
- [x] 3.6 `clearVisitHistory`: `includeBookmarked: true` deletes all rows; `false` deletes non-bookmarked + nulls `last_visited_at` on bookmarked rows (assert bookmarked row survives); `updateTag('list_visits')`. (Floor coverage; elevation deferred to 4.14.)
- [x] 3.7 `removeVisit`: no row → `No history row`; bookmarked row → nulls `last_visited_at` (row survives); non-bookmarked → deletes row; `updateTag('list_visits')`. (Floor coverage; elevation deferred to 4.14.)
- [x] 3.8 `setListItems`: unauthenticated → `Unauthorized`; missing list → `Not found`; non-owner → `Forbidden`; invalid item-id array → `Invalid input`; no-op (no add/remove) → `No changes`; mixed add+remove writes the diff, places inserts at `MAX(position)+65536*index`, reports counts; `updateTag('items')` + `updateTag('lists')`. Assert exact surviving `list_items` rows + positions.
- [x] 3.9 `updatePriority` happy paths: midpoint insertion between target and neighbor; front-edge `floor(target/2)`; back-edge `target+65536`. Assert exact resulting `position` values. Locks the ADDED reorder requirement.
- [x] 3.10 `updatePriority` rebalance: force the two highest positions within `< 0.001` and assert `rebalanceList` rewrites every row to `(index+1)*65536` preserving order (exercises `checkListBalance` + `rebalanceList`).
- [x] 3.11 `updatePriority` guards: non-owner → `Unauthorized`; missing item/target membership → `Item or target not found on this list`; equal position → `Item is already at the target position` (no write).

## 4. Config + lint

- [x] 4.1 Add `'app/actions/items.ts': COVERAGE_FLOOR` and `'app/actions/lists.ts': COVERAGE_FLOOR` to the `thresholds` map in `vitest.config.ts` (referencing the shared constant — no numeric variation).
- [x] 4.2 Add `app/actions/items.ts` and `app/actions/lists.ts` to the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs`.
- [x] 4.3 Run `npm test -- --coverage` and confirm both files meet the universal floor (lines ≥98 / statements ≥98 / branches ≥95 / functions =100). Close any gap via a test OR `/* v8 ignore … -- rationale */` (no floor lowering, per the no-backdoor rule).

## 5. Audits (record dispositions inline; per testing-foundation four-audit + invariant-elevation)

- [x] 5.1 Assertion-substance audit (on the two new test files): record, per test, the observable behavior asserted (return value, persisted row, thrown error, `updateTag` call arg). Confirm no execute-for-coverage, no tautology, no return-value-only assertion on a mutation (Decision 6). Rewrite or delete any that fail.
- [x] 5.2 Duplication audit: decide whether the pglite/`@/db`/`auth` harness + seed helpers warrant extraction to `app/actions/__tests__/test-helpers.ts` (reused across both files + future action carve-outs) or stay inline. Record the decision.
- [x] 5.3 Complexity audit (on the carve-out source): measure `updatePriority` and `createPurchase` against the ceiling of 15. If either exceeds it, perform an in-place single-file extraction (e.g. the midpoint computation in `lists.ts`) with behavior preserved by the new tests; record. If both are under, record pass.
- [x] 5.4 Testability audit: confirm no source refactor was needed beyond §5.3; confirm the `@/db` getter-mock pattern did not require any production change. Record the residual-capacity-race schema-backstop as a deferred finding (owner-discretion, NOT auto-opened as a sub-proposal) per Decision 4.
- [x] 5.5 Invariant-elevation audit: record the two elevations to `list-item-management` (MODIFIED capacity, ADDED reorder) with the three-criteria rationale; record per-function which invariants are DEFERRED to 4.4 / 4.6 / 4.11 / 4.13 / 4.14 (named) and which are NOT elevated (one-line rationale each, e.g. "derivable from signature").

## 6. Spec + governance bookkeeping

- [x] 6.1 Verify the `list-item-management` delta archives cleanly: the MODIFIED "Purchase capacity …" header matches the active spec verbatim, and the ADDED reorder requirement has ≥1 scenario. Run `openspec validate test-list-item-management`.
- [x] 6.2 Confirm the `testing-foundation` delta is Tier 2 (archive-only): it lives only in this change's `specs/testing-foundation/spec.md`; it is NOT added to the parent accumulator and does NOT create `openspec/specs/testing-foundation/spec.md` (per design D13).
- [x] 6.3 Open the sibling GitHub issue `test-list-item-management-ui` (the deferred item-management UI carve-out) and add it as a new top-level checkbox under `test-coverage/tasks.md` §4 (splitting §4.9 into actions [this] + UI [sibling]); link it from §5.4. The parent §4.9 checkbox flips only when BOTH archive.

## 7. Pre-merge gates

- [x] 7.1 `npm run lint` passes with zero errors (and no new warnings beyond the policy in `test-coverage` §7.4).
- [x] 7.2 `npx tsc --noEmit` passes with zero errors.
- [x] 7.3 `npm test` passes (both projects); the two new files run green under the `node` project.
- [x] 7.4 `npm run build` completes successfully.

## Audit dispositions (recorded per §5)

### 5.1 Assertion-substance audit

Every test in both files asserts observable behavior — a returned `ActionResponse` field (`success`/`error`/`message`/`id`/`errors.<field>`), a persisted/absent row (queried back from pglite), or an `updateTag` call arg. No execute-for-coverage calls (every `it` has a substantive `expect`), no tautologies, and no return-value-only assertion on a mutation: every success path also asserts the resulting DB state (e.g. `archiveItem` asserts `archived_at instanceof Date`; `setListItems`/`updatePriority` assert exact surviving rows + positions; `setListVisibility` asserts `visibility` + `shared` + `shared_at`; `createPurchase` asserts the `purchases` row's `user_id`/`guest_name`). Pass — no rewrites needed.

### 5.2 Duplication audit — decision: EXTRACT

The pglite/`@/db`/`@/lib/auth`/`next/cache` harness (`vi.hoisted` db holder, the two `vi.mock` calls, `mockNextCache()`, the `beforeAll`/`beforeEach` boot+truncate) is hoisted per file and stays inline in each test file (vi.mock is per-module). The pure `db.insert` graph builders are shared in `app/actions/__tests__/test-helpers.ts` (`seedList`, `seedItem`, `seedListItem`, `seedPurchase`, `seedListVisit`, `seedItemStore`, `TestDb`), reused by both files and inheritable by the downstream action carve-outs (4.4/4.6/4.11/4.13/4.14). `seedUsers` is reused from the existing `test/helpers/seedFollowGraph.ts`. Excluded from coverage by the `**/__tests__/**` glob.

### 5.3 Complexity audit — in-place single-file extractions performed

At HEAD the `sonarjs/cognitive-complexity = error` promotion flagged two functions over the ceiling of 15: `removePurchase` (20) and `updatePriority` (16) — not `createPurchase` (which measured under). Both were brought under via behavior-preserving single-file extractions, covered by the new tests:
- `items.ts`: extracted the purchase-removal authorization ladder into the pure private `canRemovePurchase(row, actorUserId, suppliedGuestName)`.
- `lists.ts`: extracted the fractional-midpoint computation into the private async `reorderPosition(listId, itemPosition, targetPosition)` (and dropped the now-dead `new_position !== undefined` guard).
Post-extraction `npx eslint app/actions/items.ts app/actions/lists.ts` is clean (0 errors). The helpers live in-file (not a co-located `utils.ts`) to keep the carve-out to the two enumerated source files and preserve per-file coverage attribution.

### 5.4 Testability audit

No production refactor was needed beyond the §5.3 complexity extractions. The `@/db` getter-over-`vi.hoisted`-holder mock required no production change (server actions already `import { db } from '@/db'`). One deviation from design Decision 3 was made for suite health and is recorded here: per-test `bootPglite()` (135 boots) turned the full parallel-fork suite into a boot storm that intermittently starved hooks; the two files now boot pglite **once per file** (`beforeAll`) and `TRUNCATE … CASCADE` + reseed between tests (`beforeEach`), preserving the same per-test isolation the design required without the storm (`vi.restoreAllMocks()` in `beforeEach` keeps per-test `db` spies from leaking). The residual capacity-race schema-backstop (a counter column + CHECK + `ON CONFLICT`, per Decision 4) is recorded as a **deferred finding at owner discretion** — NOT auto-opened as a sub-proposal. A handful of provably-unreachable defensive branches are dispositioned via `/* v8 ignore … -- rationale */` (the helper re-auth guards in `updateItemStores`/`updateItemLists`, the `createPurchase` post-viewability `!item` guard, `updateList`'s empty-`.returning()` guard, `checkListBalance`'s `<2`-row guard, the two internal-rethrow catches, and `COALESCE`/`??` numeric fallbacks) — no floor was lowered.

### 5.5 Invariant-elevation audit

Elevated to `list-item-management` (the capability this sub-proposal owns), each meeting the three criteria (non-obvious · survives reimplementation · protects a real failure mode):
- **MODIFIED** "Purchase capacity SHALL be enforced atomically …" → best-effort count + partial-unique-index duplicate backstop + documented residual race (matches source + the `neon-http` no-transactions constraint; Decision 4).
- **ADDED** `updatePriority` fractional-position reorder + rebalance contract (65536 spacing, integer midpoint, `0.001` rebalance threshold; Decision 5).

Covered-here-but-elevation-DEFERRED to the owning sub-proposals (functions exercised to the floor with substantive assertions; their spec SHALLs are theirs to add): `setListVisibility` → 4.11 `test-list-visibility`; `bookmarkList`/`unbookmarkList` → 4.6 `test-list-collections`; `clearVisitHistory`/`removeVisit` → 4.14 `test-visit-history`; `updateItemStores` → 4.4 `test-item-store-links`; per-function auth/owner guards → 4.13 `test-server-endpoint-authorization`.

NOT elevated (one-line rationale each): item/list CRUD success/validation (`createItem`/`updateItem`/`createList`/`updateList`/`deleteItem`/`deleteList`) — derivable from the Zod schemas + signatures; `getItemEditData` null-guards — derivable from signature; cache-tag invalidation assertions — mechanism, not a durable behavioral contract.

### 6.3 Sibling carve-out

Sibling GitHub issue for the deferred item-management UI carve-out: **JoshEddie/CTRLplusList#83** (`test-list-item-management-ui`). Added to `test-coverage/tasks.md` §4.9 as 4.9a (this, actions, #48) + 4.9b (UI, #83); the parent §4.9 flips only when BOTH archive.

### 7.4 Build note

`npm run build` completes (exit 0) when `DATABASE_URL` is set; in this worktree `.env.local` omits it, so a bare `npm run build` fails at module-load of the untouched `/api/image-search` route (`neon()` requires a connection string). This is a local env gap, not a regression from this change (test-only + behavior-preserving source extractions).
