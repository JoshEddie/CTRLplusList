## 1. Test harness (action-test pattern — first action carve-out)

- [ ] 1.1 Create `app/actions/__tests__/` (first `__tests__/` under `app/actions/`).
- [ ] 1.2 Establish the action-test harness: `vi.mock('@/db', ...)` returning the per-test `bootPglite()` drizzle instance via a getter-over-mutable-holder (set in `beforeEach`); `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`; `mockNextCache()` from `test/helpers/next-cache.ts`. Per design Decision 3.
- [ ] 1.3 Write the per-case seed helper(s) building the owner+list+item+`list_items` graph directly via `db.insert` (mirroring the spike's `seedClaimFixture`). Decide inline-per-file vs. shared `app/actions/__tests__/test-helpers.ts` — defer the extraction decision to the §5.2 duplication audit.
- [ ] 1.4 Confirm the harness runs under the `node` project (`.test.ts`, `environment: 'node'`) and that a smoke test booting pglite + calling one action against it passes before writing the full suites.

## 2. items.ts coverage (`app/actions/__tests__/items.test.ts`)

- [ ] 2.1 `ItemSchema` validation branches via `createItem`: name min/max length, `image_url` URL validity (empty-ok, valid, invalid), per-store all-or-nothing field refinement + store `link` URL validity, `quantity_limit` integer/min(1)/nullable. Assert `errors.fieldErrors` shape and that no `items` row is written on validation failure.
- [ ] 2.2 `createItem` success: assert the inserted `items` row (name/description default `''`/image_url/quantity_limit/user_id), that `updateItemLists` created `list_items` at `MAX(position)+65536`, that `updateItemStores` inserted non-empty stores in order (and skipped empty ones), and that `updateTag('items')` fired.
- [ ] 2.3 `createItem` / `updateItem` auth + ownership guards: unauthenticated → `Unauthorized`; session email with no user → `Unauthorized`; `updateItem` on an item owned by another user → `Unauthorized - item does not belong to you` with no write.
- [ ] 2.4 `updateItem` success: partial-schema update writes only provided fields; `updateItemLists` adds new + removes deselected associations; `updateItemStores` updates changed rows, inserts overflow, deletes trailing rows; `updateTag('items')` fired. Assert persisted `list_items` / `item_stores` rows (Decision 6).
- [ ] 2.5 `updateItemStores` / `updateItemLists` private-helper ownership guards (reached via update with a foreign item id, and via `updateItemLists` with a list owned by another user → `Failed to update item lists.`).
- [ ] 2.6 `archiveItem`: sets `archived_at` to a `Date` on archive, `null` on unarchive; non-owner → `Forbidden`; asserts persisted row + `updateTag('items')`.
- [ ] 2.7 `deleteItem`: owner delete removes the row (assert absent) + `updateTag('items')`; non-owner → throws/returns the unauthorized response; unauthenticated → `Unauthorized`.
- [ ] 2.8 `getItemEditData`: unauthenticated → `null`; unknown email → `null`; missing item → `null`; success returns `{ item, lists }` from the real DAL reads against pglite (DAL NOT mocked).
- [ ] 2.9 `createPurchase` identity contract: authenticated uses session `user_id` and discards payload `guest_name`; unauthenticated with non-empty `guest_name` inserts `user_id = NULL` + `guest_name`; unauthenticated with empty/missing `guest_name` → `Missing identity`. Assert persisted `purchases` rows.
- [ ] 2.10 `createPurchase` viewability + duplicate + capacity: non-viewable item → `Item not found` (no row); duplicate (same actor) → `Duplicate claim`; `quantity_limit` reached sequentially → `Fully claimed`; the `23505` partial-unique-index catch path → `Duplicate claim` (real pglite index — assert `sqlstateOf` mapping). Locks the MODIFIED capacity requirement's enforceable parts (spec Decision 4).
- [ ] 2.11 `createPurchase` residual race (documentary): two distinct guests on `quantity_limit = 1` both insert (partial index excludes NULL `user_id`) — asserts the accepted-limitation behavior, NOT a guarantee. Per spec MODIFIED scenario "Concurrent distinct claimants … residual race is accepted".
- [ ] 2.12 `removePurchase` by `purchase_id`: authed owner deletes own row; authed non-owner → `Not your claim` (no delete); guest with matching `guest_name` on a guest row deletes; guest on an authed row → `Not your claim`; guest with wrong/empty `guest_name` → `Not your claim`; missing row → `Not found`.
- [ ] 2.13 `removePurchase` legacy item-scoped path: authed deletes own `(item_id, user_id)` rows + `updateTag('items')`; unauthenticated or missing `item_id` → `Missing identity`.

## 3. lists.ts coverage (`app/actions/__tests__/lists.test.ts`)

- [ ] 3.1 `createList`: `ListSchema` validation (name length, subtitle max-length + `'' → null` transform, date required); unauthenticated/unknown-user guards; success inserts the row and returns `{ id }` + `updateTag('lists')`. Assert persisted row including `subtitle === null` for empty input.
- [ ] 3.2 `updateList`: non-existent list → `Not found`; non-owner → `Unauthorized`; partial update writes only provided fields and returns `{ id }`; empty `.returning()` → `Not found`; `updateTag('lists')` on success.
- [ ] 3.3 `deleteList`: non-existent → `Not found`; non-owner → `Unauthorized`; owner delete removes row + `updateTag('lists')`.
- [ ] 3.4 `setListVisibility`: invalid enum → `Validation`; non-owner → `Forbidden`; the `shared_at` transition matrix (private→non-private sets `shared_at`; →private clears it; unlisted↔public preserves it) and the legacy `shared` boolean dual-write; `updateTag('lists')`. (Floor coverage here; visibility-invariant elevation deferred to 4.11.)
- [ ] 3.5 `bookmarkList` / `unbookmarkList`: unauthenticated → `Unauthorized`; non-viewable private list of another owner → `List not viewable`; bookmark inserts/`onConflictDoUpdate` sets `favorited_at`; unbookmark nulls `favorited_at`; `updateTag('list_visits')`. (Floor coverage; elevation deferred to 4.6.)
- [ ] 3.6 `clearVisitHistory`: `includeBookmarked: true` deletes all rows; `false` deletes non-bookmarked + nulls `last_visited_at` on bookmarked rows (assert bookmarked row survives); `updateTag('list_visits')`. (Floor coverage; elevation deferred to 4.14.)
- [ ] 3.7 `removeVisit`: no row → `No history row`; bookmarked row → nulls `last_visited_at` (row survives); non-bookmarked → deletes row; `updateTag('list_visits')`. (Floor coverage; elevation deferred to 4.14.)
- [ ] 3.8 `setListItems`: unauthenticated → `Unauthorized`; missing list → `Not found`; non-owner → `Forbidden`; invalid item-id array → `Invalid input`; no-op (no add/remove) → `No changes`; mixed add+remove writes the diff, places inserts at `MAX(position)+65536*index`, reports counts; `updateTag('items')` + `updateTag('lists')`. Assert exact surviving `list_items` rows + positions.
- [ ] 3.9 `updatePriority` happy paths: midpoint insertion between target and neighbor; front-edge `floor(target/2)`; back-edge `target+65536`. Assert exact resulting `position` values. Locks the ADDED reorder requirement.
- [ ] 3.10 `updatePriority` rebalance: force the two highest positions within `< 0.001` and assert `rebalanceList` rewrites every row to `(index+1)*65536` preserving order (exercises `checkListBalance` + `rebalanceList`).
- [ ] 3.11 `updatePriority` guards: non-owner → `Unauthorized`; missing item/target membership → `Item or target not found on this list`; equal position → `Item is already at the target position` (no write).

## 4. Config + lint

- [ ] 4.1 Add `'app/actions/items.ts': COVERAGE_FLOOR` and `'app/actions/lists.ts': COVERAGE_FLOOR` to the `thresholds` map in `vitest.config.ts` (referencing the shared constant — no numeric variation).
- [ ] 4.2 Add `app/actions/items.ts` and `app/actions/lists.ts` to the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs`.
- [ ] 4.3 Run `npm test -- --coverage` and confirm both files meet the universal floor (lines ≥98 / statements ≥98 / branches ≥95 / functions =100). Close any gap via a test OR `/* v8 ignore … -- rationale */` (no floor lowering, per the no-backdoor rule).

## 5. Audits (record dispositions inline; per testing-foundation four-audit + invariant-elevation)

- [ ] 5.1 Assertion-substance audit (on the two new test files): record, per test, the observable behavior asserted (return value, persisted row, thrown error, `updateTag` call arg). Confirm no execute-for-coverage, no tautology, no return-value-only assertion on a mutation (Decision 6). Rewrite or delete any that fail.
- [ ] 5.2 Duplication audit: decide whether the pglite/`@/db`/`auth` harness + seed helpers warrant extraction to `app/actions/__tests__/test-helpers.ts` (reused across both files + future action carve-outs) or stay inline. Record the decision.
- [ ] 5.3 Complexity audit (on the carve-out source): measure `updatePriority` and `createPurchase` against the ceiling of 15. If either exceeds it, perform an in-place single-file extraction (e.g. the midpoint computation in `lists.ts`) with behavior preserved by the new tests; record. If both are under, record pass.
- [ ] 5.4 Testability audit: confirm no source refactor was needed beyond §5.3; confirm the `@/db` getter-mock pattern did not require any production change. Record the residual-capacity-race schema-backstop as a deferred finding (owner-discretion, NOT auto-opened as a sub-proposal) per Decision 4.
- [ ] 5.5 Invariant-elevation audit: record the two elevations to `list-item-management` (MODIFIED capacity, ADDED reorder) with the three-criteria rationale; record per-function which invariants are DEFERRED to 4.4 / 4.6 / 4.11 / 4.13 / 4.14 (named) and which are NOT elevated (one-line rationale each, e.g. "derivable from signature").

## 6. Spec + governance bookkeeping

- [ ] 6.1 Verify the `list-item-management` delta archives cleanly: the MODIFIED "Purchase capacity …" header matches the active spec verbatim, and the ADDED reorder requirement has ≥1 scenario. Run `openspec validate test-list-item-management`.
- [ ] 6.2 Confirm the `testing-foundation` delta is Tier 2 (archive-only): it lives only in this change's `specs/testing-foundation/spec.md`; it is NOT added to the parent accumulator and does NOT create `openspec/specs/testing-foundation/spec.md` (per design D13).
- [ ] 6.3 Open the sibling GitHub issue `test-list-item-management-ui` (the deferred item-management UI carve-out) and add it as a new top-level checkbox under `test-coverage/tasks.md` §4 (splitting §4.9 into actions [this] + UI [sibling]); link it from §5.4. The parent §4.9 checkbox flips only when BOTH archive.

## 7. Pre-merge gates

- [ ] 7.1 `npm run lint` passes with zero errors (and no new warnings beyond the policy in `test-coverage` §7.4).
- [ ] 7.2 `npx tsc --noEmit` passes with zero errors.
- [ ] 7.3 `npm test` passes (both projects); the two new files run green under the `node` project.
- [ ] 7.4 `npm run build` completes successfully.
