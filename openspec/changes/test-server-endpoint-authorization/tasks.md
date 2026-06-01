> **Status: complete (reconciled).** Implemented after sibling carve-outs **4.9 `test-list-item-management`** (delivered `lists.test.ts` + `items.test.ts` + the `list-item-management` capacity MODIFY) and **4.2 `test-following`** (delivered `follows.test.ts`) had already archived to `dev`. Their landed files were verified to satisfy §3/§4/§5 and this change's elevated SHALLs (see §8.5). **Net-new here:** `app/actions/__tests__/user.test.ts`, `app/api/image-search/__tests__/route.test.ts` (+ `IMAGE_SEARCH_CACHE_MAX_ENTRIES` testability seam, no v8-ignores), the `removeFollower` third-party-edge test appended to `follows.test.ts`, the ADDED follow-graph requirement in the active `server-endpoint-authorization` spec, and config entries for the two new files. Gates: `tsc` ✓ · `lint` 0 errors ✓ · `test:coverage` ✓ (all five files ≥ floor) · `build` ✓ (with `DATABASE_URL`). Checkboxes below for §3/§4/§5 are satisfied by the sibling files; the §3/§4/§5 *task numbers* refer to the original plan and do not 1:1 match the sibling tests' names.

## 1. Confirm foundation surfaces are usable

- [x] 1.1 Confirm the **node** vitest project resolves `@/` and includes `**/*.test.ts` (it does — `vitest.config.ts` `projects[1]`); these five files are `.test.ts`, so they route to node, NOT jsdom.
- [x] 1.2 Confirm `test/helpers/db.ts`'s `bootPglite()` replays the drizzle journal and returns `{ db, raw }`; confirm `@electric-sql/pglite` + `drizzle-orm/pglite` are installed.
- [x] 1.3 Confirm the `vi.hoisted` `dbHolder` + `vi.mock('@/db', () => ({ get db() {…} }))` getter pattern from `lib/__tests__/listAccess.test.ts` works for actions that `import { db } from '@/db'` at module load.
- [x] 1.4 Confirm `test/helpers/next-cache.ts`'s `mockNextCache()` (or an inline `vi.mock('next/cache')`) exposes `updateTag` as a `vi.fn()` for spy assertions.
- [x] 1.5 Spec re-grep at HEAD: confirm `server-endpoint-authorization`'s six requirements, `list-item-management`'s three purchase requirements (createPurchase-auth, capacity-enforcement, removePurchase-guest-id), `following`'s follow/block SHALLs, `visit-history`'s bookmark-viewable + remove/clear SHALLs, and `list-visibility`'s setListVisibility SHALLs. Record the EXACT current text of `list-item-management`'s "Purchase capacity SHALL be enforced atomically" requirement so the MODIFIED delta replaces it faithfully.
- [x] 1.6 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block; new entries append to its `files` array.
- [x] 1.7 Confirm `extract-visibility-constants` is still active (Stage 1) and `@/lib/visibility` exports `VISIBILITY`, `fromDb`, `VISIBILITY_VALUES`; the visibility-touching tests will use these, not literal DB strings (Decision 6).

## 2. Shared test helpers (extract only if duplication audit confirms ≥3-file reuse)

- [x] 2.1 `test/helpers/db.ts` is reused as-is for `bootPglite()`. Do NOT modify it (it is versioned-as-fixture per testing-foundation).
- [x] 2.2 Draft a `dbHolder` + `@/db` getter-mock snippet. If used by ≥3 of the five files (expected: all four DB-touching files), extract a `test/helpers/db-mock.ts` exporting a `makeDbHolder()` factory; otherwise inline. **Disposition recorded in §7.2.**
- [x] 2.3 Draft a caller-class session factory `sessionFor(email | null)` returning the `auth()` mock resolution. If reused across ≥3 files (expected), extract to `test/helpers/auth-fixtures.ts`; otherwise inline. **Disposition recorded in §7.2.**
- [x] 2.4 Per-file seeding helpers (insert owner + non-owner users, a list/item they own) stay inline per file — the seeded entities differ per action surface and are not a reusable fixture.

## 3. Write `app/actions/__tests__/lists.test.ts` (node, universal COVERAGE_FLOOR)

### 3A. ModuleMocks + fixtures

- [x] 3.1 `vi.mock('@/db')` getter holder; `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`; `vi.mock('next/cache')` exposing `updateTag` spy.
- [x] 3.2 `beforeAll`: boot pglite, assign holder. `beforeEach`: reset `updateTag` spy + reseed (owner `OWNER` with email; non-owner `OTHER` with email; an `OWNER`-owned list `L_OWNER`; an `OTHER`-owned list `L_OTHER`; `list_items` + `list_visits` rows as each test needs).

### 3B. createList — three caller classes

- [x] 3.3 `Owner_CreatesList_PersistsWithSessionUserId` — `auth()` → owner email; assert `{ success: true, id }`, a follow-up read shows the row with `user_id = OWNER`, and `updateTag('lists')` called.
- [x] 3.4 `Unauthenticated_CreateList_ReturnsUnauthorized_NoRow_NoUpdateTag` — `auth()` → null; assert `{ success: false, error: 'Unauthorized' }`, no new `lists` row, `updateTag` not called.
- [x] 3.5 `ValidationFailure_ReturnsFieldErrors_NoRow` — name < 3 chars; assert `errors.name` present, no row, no `updateTag`.

### 3C. updateList / deleteList — ownership matrix

- [x] 3.6 `Owner_UpdatesOwnList_PersistsPartialUpdate_CallsUpdateTag`.
- [x] 3.7 `NonOwner_UpdateOthersList_ReturnsUnauthorized_RowUnchanged_NoUpdateTag` — `auth()` → OTHER email, target `L_OWNER`; assert error + follow-up read shows L_OWNER unchanged + `updateTag` not called.
- [x] 3.8 `Unauthenticated_UpdateList_ReturnsUnauthorized_NoUpdateTag`.
- [x] 3.9 `Owner_UpdateMissingList_ReturnsNotFound`.
- [x] 3.10 `Owner_DeletesOwnList_RowGone_CallsUpdateTag`.
- [x] 3.11 `NonOwner_DeleteOthersList_ReturnsUnauthorized_RowSurvives_NoUpdateTag`.
- [x] 3.12 `Unauthenticated_DeleteList_ReturnsUnauthorized_NoUpdateTag`.

### 3D. setListVisibility — ownership + visibility-state transitions (use VISIBILITY.* / fromDb)

- [x] 3.13 `Owner_SetVisibilityToLink_PersistsAndSetsSharedAt` — owner, `VISIBILITY.OWNER → VISIBILITY.LINK`; assert stored value via `fromDb()` equals `VISIBILITY.LINK`, `shared_at` set, legacy `shared = true`, `updateTag('lists')`.
- [x] 3.14 `Owner_SetVisibilityToOwner_ClearsSharedAt_SharedFalse` — going private clears `shared_at` and sets `shared = false`.
- [x] 3.15 `Owner_LinkToFollowers_PreservesSharedAt` — unlisted ↔ public preserves `shared_at` (no transition reset).
- [x] 3.16 `NonOwner_SetVisibility_ReturnsForbidden_Unchanged_NoUpdateTag`.
- [x] 3.17 `Unauthenticated_SetVisibility_ReturnsUnauthorized_NoUpdateTag`.
- [x] 3.18 `InvalidVisibilityValue_ReturnsValidationError` — an out-of-enum string; assert `{ error: 'Validation' }`, no write.

### 3E. bookmarkList / unbookmarkList — viewability gate + ownership-of-own-visit-row

- [x] 3.19 `Authed_BookmarkViewableList_UpsertsFavoritedAt_CallsUpdateTagVisits` — bookmark a `VISIBILITY.LINK` list owned by OTHER; assert `list_visits` upsert with `favorited_at` set + `updateTag('list_visits')`.
- [x] 3.20 `Authed_BookmarkPrivateNonOwnedList_ReturnsNotViewable_NoRow` **(visit-history SHALL)** — bookmark a `VISIBILITY.OWNER` list owned by OTHER; assert `{ error: 'List not viewable' }`, no `list_visits` row, no `updateTag`.
- [x] 3.21 `Owner_BookmarkOwnPrivateList_Succeeds` — owner can bookmark their own private list (the gate is `user_id !== userId && OWNER`).
- [x] 3.22 `Unauthenticated_Bookmark_ReturnsUnauthorized_NoUpdateTag`.
- [x] 3.23 `Authed_Unbookmark_NullsFavoritedAt_ScopedToViewerRow` — unbookmark only nulls the viewer's own `(user_id, list_id)` row; assert another user's bookmark of the same list is untouched.
- [x] 3.24 `Unauthenticated_Unbookmark_ReturnsUnauthorized`.

### 3F. clearVisitHistory / removeVisit — bookmarked-row-survives semantics

- [x] 3.25 `Authed_ClearHistoryExcludeBookmarked_DeletesNonBookmarked_NullsBookmarkedLastVisited` — assert non-bookmarked rows deleted, bookmarked rows survive with `last_visited_at = null`, scoped to viewer.
- [x] 3.26 `Authed_ClearHistoryIncludeBookmarked_DeletesAllViewerRows`.
- [x] 3.27 `Unauthenticated_ClearHistory_ReturnsUnauthorized`.
- [x] 3.28 `Authed_RemoveVisitBookmarkedRow_NullsLastVisited_RowSurvives`.
- [x] 3.29 `Authed_RemoveVisitNonBookmarkedRow_DeletesRow`.
- [x] 3.30 `Authed_RemoveVisitNoRow_ReturnsSuccessNoop`.
- [x] 3.31 `Unauthenticated_RemoveVisit_ReturnsUnauthorized`.

### 3G. setListItems — ownership + diff-based add/remove + position base

- [x] 3.32 `Owner_SetListItems_AddsAndRemovesByDiff_CallsUpdateTagItemsAndLists` — seed existing `list_items`; pass a new id set; assert only the diff is inserted/deleted and positions use the `COALESCE(MAX+65536)` base.
- [x] 3.33 `Owner_SetListItemsNoChange_ReturnsNoChanges_NoUpdateTag` — identical set → `{ message: 'No changes' }`, no `updateTag`.
- [x] 3.34 `NonOwner_SetListItems_ReturnsForbidden_Unchanged_NoUpdateTag`.
- [x] 3.35 `Unauthenticated_SetListItems_ReturnsUnauthorized_NoUpdateTag`.
- [x] 3.36 `Owner_SetListItemsMissingList_ReturnsNotFound`.
- [x] 3.37 `Owner_SetListItemsInvalidIds_ReturnsInvalidInput` — empty-string id in array fails the Zod array check.

### 3H. updatePriority — ownership + fractional reposition + rebalance trigger

- [x] 3.38 `Owner_UpdatePriorityMoveDown_ComputesMidpointPosition_CallsUpdateTagItems`.
- [x] 3.39 `Owner_UpdatePriorityMoveUp_ComputesMidpointPosition`.
- [x] 3.40 `Owner_UpdatePrioritySamePosition_ReturnsAlreadyAtTarget`.
- [x] 3.41 `Owner_UpdatePriorityMissingItemOrTarget_ReturnsNotFound`.
- [x] 3.42 `Owner_UpdatePriorityTriggersRebalance_WhenGapBelowMinGap` — seed two adjacent positions with a sub-`0.001` gap so `checkListBalance` returns true; assert `rebalanceList` runs (positions reset to `(index+1)*65536`). **Covers the rebalance branch.**
- [x] 3.43 `NonOwner_UpdatePriority_ReturnsUnauthorized_Unchanged_NoUpdateTag`.
- [x] 3.44 `Unauthenticated_UpdatePriority_ReturnsUnauthorized_NoUpdateTag`.

## 4. Write `app/actions/__tests__/items.test.ts` (node, universal COVERAGE_FLOOR)

### 4A. ModuleMocks + fixtures

- [x] 4.1 Same `@/db` / `@/lib/auth` / `next/cache` mocks. `lib/listAccess` + `lib/sqlstate` NOT mocked (run real against pglite).
- [x] 4.2 Seed: owner `OWNER` + email; non-owner `OTHER` + email; an `OWNER`-owned item `I_OWNER` on a viewable list; an `OTHER`-owned item `I_OTHER`; lists owned by each for the cross-list ownership test.

### 4B. getItemEditData — auth + ownership read

- [x] 4.3 `Owner_GetItemEditData_ReturnsItemAndLists`.
- [x] 4.4 `Unauthenticated_GetItemEditData_ReturnsNull`.
- [x] 4.5 `NonOwner_GetItemEditData_ReturnsNull` — `getItemById(itemId, user.id)` scopes to the actor; a non-owner gets null.

### 4C. createItem — auth + nested list/store association

- [x] 4.6 `Owner_CreateItem_PersistsWithSessionUserId_CallsUpdateTagItems`.
- [x] 4.7 `Owner_CreateItemWithLists_AssociatesOwnedListsOnly`.
- [x] 4.8 `Unauthenticated_CreateItem_ReturnsUnauthorized_NoRow_NoUpdateTag`.
- [x] 4.9 `ValidationFailure_ReturnsFieldErrors_NoRow`.

### 4D. updateItem / archiveItem / deleteItem — ownership matrix

- [x] 4.10 `Owner_UpdatesOwnItem_PersistsAndReassociates_CallsUpdateTag`.
- [x] 4.11 `NonOwner_UpdateOthersItem_ReturnsUnauthorized_Unchanged_NoUpdateTag`.
- [x] 4.12 `Unauthenticated_UpdateItem_ReturnsUnauthorized_NoUpdateTag`.
- [x] 4.13 `Owner_ArchiveItem_SetsArchivedAt_CallsUpdateTag` + `Owner_UnarchiveItem_ClearsArchivedAt`.
- [x] 4.14 `NonOwner_ArchiveItem_ReturnsForbidden_Unchanged_NoUpdateTag`.
- [x] 4.15 `Unauthenticated_ArchiveItem_ReturnsUnauthorized`.
- [x] 4.16 `Owner_DeletesOwnItem_RowGone_CallsUpdateTag`.
- [x] 4.17 `NonOwner_DeleteOthersItem_ThrowsUnauthorized_RowSurvives` — `deleteItem` THROWS (caught → `{ success:false }`); assert the result shape AND row survival.
- [x] 4.18 `Unauthenticated_DeleteItem_ReturnsFailure_NoUpdateTag`.

### 4E. updateItemLists / updateItemStores — cross-list ownership gate (server-endpoint-authorization SHALL)

- [x] 4.19 `NonOwner_UpdateItemLists_ThrowsUnauthorized_NoListItemsWritten` **(server-endpoint-authorization SHALL)** — actor OTHER targeting `I_OWNER`; assert throw, no `list_items` change.
- [x] 4.20 `Owner_UpdateItemListsWithForeignList_ThrowsUnauthorized` **(server-endpoint-authorization SHALL)** — owner attaches their item to `L_OTHER` (a list owned by OTHER); the all-target-lists-owned check rejects; assert throw, no `list_items` row inserted for the foreign list.
- [x] 4.21 `NonOwner_UpdateItemStores_ThrowsUnauthorized_NoItemStoresWritten`.
- [x] 4.22 `Owner_UpdateItemStores_DiffsExistingAssociations` — exercised via `updateItem`; assert update/insert/delete by position diff.

### 4F. createPurchase — guest write path + viewability + capacity (list-item-management SHALLs)

- [x] 4.23 `Authed_ClaimViewableItem_InsertsWithUserId_GuestNameIgnored_CallsUpdateTag`.
- [x] 4.24 `Guest_ClaimViewableItemWithName_InsertsWithNullUserIdAndGuestName`.
- [x] 4.25 `Guest_ClaimWithoutName_ReturnsMissingIdentity_NoRow`.
- [x] 4.26 `AnyCaller_ClaimNonViewableItem_ReturnsItemNotFound_NoRow` **(list-item-management SHALL)** — item on a private non-owned list; assert `{ error: 'Item not found' }`, no `purchases` row. Exercises the real `isItemViewable`.
- [x] 4.27 `Authed_DuplicateClaim_InApp_ReturnsDuplicateClaim` — seed an existing purchase by the actor; in-app check rejects.
- [x] 4.28 `Authed_DuplicateClaim_PartialIndexTrip_ReturnsDuplicateClaim` **(list-item-management SHALL, MODIFIED)** — bypass the in-app check by inserting a conflicting `purchases` row directly between the check and insert is not directly reproducible without a race; instead force the `23505` path by pre-inserting a row that the in-app check misses (e.g. insert directly via `raw` after the action reads), OR assert the `catch` maps a synthesized unique-violation. Disposition recorded in §7.4 if a `/* v8 ignore */` is needed for an unreachable sub-branch.
- [x] 4.29 `AtLimit_Claim_ReturnsFullyClaimed_NoRow` **(list-item-management SHALL)** — `quantity_limit = 1` with one existing purchase; assert `{ error: 'Fully claimed' }`.
- [x] 4.30 `MissingItem_Claim_ReturnsItemNotFound`.

### 4G. removePurchase — guest revoke identity gate (list-item-management SHALL)

- [x] 4.31 `Authed_RemoveOwnClaimByPurchaseId_DeletesRow_CallsUpdateTag`.
- [x] 4.32 `Authed_RemoveOthersClaimByPurchaseId_ReturnsNotYourClaim_RowSurvives`.
- [x] 4.33 `Guest_RemoveOwnGuestClaimByPurchaseIdWithMatchingName_DeletesRow` **(list-item-management SHALL)**.
- [x] 4.34 `Guest_RemoveGuestClaimWrongName_ReturnsNotYourClaim_RowSurvives` **(list-item-management SHALL)** — the critical cross-guest protection.
- [x] 4.35 `Guest_RemoveAuthedUsersClaimByPurchaseId_ReturnsNotYourClaim` **(list-item-management SHALL)** — guest cannot revoke a row with non-null `user_id`.
- [x] 4.36 `Authed_RemoveByItemIdLegacyPath_DeletesOwnRow`.
- [x] 4.37 `Guest_RemoveByItemIdLegacyPath_ReturnsMissingIdentity` **(list-item-management SHALL)** — the legacy item-scoped path is authenticated-only.
- [x] 4.38 `RemovePurchaseMissingRow_ReturnsNotFound`.

## 5. Write `app/actions/__tests__/follows.test.ts` (node, universal COVERAGE_FLOOR)

### 5A. ModuleMocks + fixtures

- [x] 5.1 `@/db` / `@/lib/auth` / `next/cache` mocks. Seed `VIEWER`, `TARGET`, `THIRD` users + emails; `user_follows` / `user_blocks` rows as needed.

### 5B. followUser — auth, self, block-gating, idempotency (following SHALLs)

- [x] 5.2 `Authed_FollowOther_InsertsRow_CallsUpdateTagUserFollows` — assert `follower_id = VIEWER` (session-resolved, not payload) **(server-endpoint-authorization SHALL)**.
- [x] 5.3 `Authed_FollowSelf_ReturnsInvalid_NoRow` **(following SHALL)**.
- [x] 5.4 `Authed_FollowWhenViewerBlockedTarget_ReturnsBlocked_NoRow` **(following SHALL)**.
- [x] 5.5 `Authed_FollowWhenTargetBlockedViewer_ReturnsBlocked_NoRow` **(following SHALL)** — both-direction gating.
- [x] 5.6 `Authed_FollowAlreadyFollowing_Idempotent_NoDuplicate` **(following SHALL)**.
- [x] 5.7 `Unauthenticated_Follow_ReturnsUnauthorized_NoRow_NoUpdateTag` **(server-endpoint-authorization SHALL)**.

### 5C. unfollowUser / removeFollower — scoping (server-endpoint-authorization SHALL)

- [x] 5.8 `Authed_Unfollow_DeletesViewerToTargetEdge_NoopIfAbsent`.
- [x] 5.9 `Unauthenticated_Unfollow_ReturnsUnauthorized`.
- [x] 5.10 `Authed_RemoveFollower_DeletesOnlyTargetToViewerEdge` **(server-endpoint-authorization SHALL)** — seed `(TARGET→VIEWER)` and `(TARGET→THIRD)`; assert only `(TARGET→VIEWER)` is deleted, `(TARGET→THIRD)` survives.
- [x] 5.11 `Unauthenticated_RemoveFollower_ReturnsUnauthorized`.

### 5D. blockUser / unblockUser — self, block-first ordering (following + server-endpoint-authorization SHALLs)

- [x] 5.12 `Authed_BlockOther_InsertsBlock_DeletesFollowBothDirections_CallsUpdateTags` **(following SHALL)** — seed mutual follow; assert block row inserted, both follow edges gone, `updateTag('user_follows')` + `updateTag('user_blocks')`.
- [x] 5.13 `Authed_BlockSelf_ReturnsInvalid_NoRow` **(following SHALL)**.
- [x] 5.14 `Authed_BlockAlreadyBlocked_Idempotent`.
- [x] 5.15 `Unauthenticated_Block_ReturnsUnauthorized_NoRow_NoUpdateTag`.
- [x] 5.16 `Authed_Unblock_DeletesBlockRow_ScopedToViewer`.
- [x] 5.17 `Unauthenticated_Unblock_ReturnsUnauthorized`.

## 6. Write `app/actions/__tests__/user.test.ts` + `app/api/image-search/__tests__/route.test.ts`

### 6A. user.test.ts (node — NextAuth wrappers, no DB)

- [x] 6.1 `vi.mock('@/lib/auth', () => ({ signIn: vi.fn(), signOut: vi.fn() }))`; `vi.mock('next/navigation', () => ({ redirect: vi.fn((t) => { throw new RedirectSignal(t); }) }))`.
- [x] 6.2 `SignInUser_DelegatesToSignInGoogle` — assert `signIn` called with `'google'`.
- [x] 6.3 `SignOutUser_SignsOutThenRedirectsToSignIn` — assert `signOut` called with `{ redirect: false }`, then `redirect('/sign-in')` (via the sentinel throw, `rejects.toThrow`).

### 6B. route.test.ts (node — auth + rate limit + query cap + provider chain)

- [x] 6.4 ModuleMocks: `vi.mock('@/db')` holder, `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`. `beforeEach`: `vi.resetModules()` + dynamic `import('../route')` for fresh singleton maps (Decision 4); re-stub `global.fetch` to a `vi.fn()` returning a canned provider response; set `process.env.IMAGE_SEARCH_PROVIDERS` + a fake key so the chain selects a real (mocked-`fetch`) provider, not the mock provider.
- [x] 6.5 `Unauthenticated_Get_Returns401_NoProviderFetch` **(server-endpoint-authorization SHALL)** — `auth()` → null; assert 401 + `expect(fetch).not.toHaveBeenCalled()`.
- [x] 6.6 `AuthedButUserRowMissing_Returns401` — `auth()` returns an email with no matching `users` row.
- [x] 6.7 `Authed_OverRateLimit_Returns429RateLimited_NoProviderFetch` **(server-endpoint-authorization SHALL)** — drive `RATE_LIMIT_PER_WINDOW + 1` calls for one user (the first 30 may hit `fetch`; the 31st asserts 429 `{ error: 'rate_limited' }` + no additional `fetch`). Use distinct `q` values to avoid the cache short-circuiting the count.
- [x] 6.8 `Authed_QueryTooLong_Returns400QueryTooLong_NoProviderFetch` **(server-endpoint-authorization SHALL)** — `q` length 201; assert 400 `{ error: 'query_too_long' }` + no `fetch`.
- [x] 6.9 `Authed_MissingOrBlankQuery_Returns400`.
- [x] 6.10 `Authed_ValidQuery_DelegatesToProvider_ReturnsItems` — assert the response `items` shape matches the canned provider payload mapping, and `provider` name is set.
- [x] 6.11 `Authed_CacheHit_ReturnsCachedTrue_NoSecondFetch` — same `q` twice; second call returns `{ cached: true }` with `fetch` called only once.
- [x] 6.12 `Authed_ProviderQuotaExceeded_FallsThroughChain_Returns429QuotaExceeded` — first provider `fetch` resolves a 429; assert the chain advances and (if all exhausted) surfaces `{ error: 'quota_exceeded' }` 429, distinct from `rate_limited`.
- [x] 6.13 `Authed_ProviderNonQuotaError_Returns500` — provider `fetch` throws a non-quota error; assert 500 `{ error: 'Failed to process image search' }`.

## 7. Audits

### 7.1 Assertion-substance audit (on the new tests)

- [x] 7.1 Walk each of the five test files end-to-end. Every assertion SHALL name observable output: the action's `{ success, error, id, message }` shape; a follow-up pglite read confirming the row was/wasn't written or mutated; the exact `updateTag(...)` argument OR `expect(updateTag).not.toHaveBeenCalled()`; the HTTP status + parsed JSON body for the route; the redirect sentinel for `signOutUser`. **Specifically verify every unauthorized-path test asserts THREE things — error response + DB-unchanged (follow-up read) + `updateTag` not called** — so a buggy action that rejects but still mutates or still invalidates is caught (locks `server-endpoint-authorization`'s rejections-do-not-invalidate-caches SHALL). Flag and rewrite any test that asserts only the error response. Record dispositions.

### 7.2 Duplication audit (across the five files + helpers)

- [x] 7.2 Identify shared patterns: (a) `@/db` getter-holder mock — expected in all four DB files → extract `test/helpers/db-mock.ts` if confirmed; (b) `sessionFor()` auth fixture — expected in all five → extract `test/helpers/auth-fixtures.ts` if confirmed; (c) `next/cache` mock — reuse existing `test/helpers/next-cache.ts`; (d) `RedirectSignal` — only `user.test.ts` needs it (inline). Record final disposition (extracted vs. inline) with file references.

### 7.3 Complexity audit (on the carve-out source)

- [x] 7.3 Run `npm run lint`; record measured `sonarjs/cognitive-complexity` for each function. **Expected over-15 findings:** `createPurchase`, `removePurchase`, the image-search `GET` handler, possibly `updateItemStores` / `updateItemLists`. For each finding choose: **(a) in-place extraction** within the carve-out file (e.g. extract guest-identity resolution and the capacity check from `createPurchase` into named helpers; extract the purchase-id-vs-item-id branch from `removePurchase`; extract the provider-loop from `GET`), proven behavior-preserving by the new tests; OR **(b) a justified `// eslint-disable-next-line sonarjs/cognitive-complexity` with a reason comment**. Record each disposition with file + function + chosen option in §8.

### 7.4 Testability audit (on the carve-out source)

- [x] 7.4 Coverage report at universal `COVERAGE_FLOOR` or above across all five files (record per-file metrics from `coverage/coverage-summary.json`). Record: (a) the image-search singleton-isolation disposition — `vi.resetModules()` (Decision 4) vs. an in-place reset seam; (b) any `/* v8 ignore */` annotation with a one-line rationale (expected candidate: `createPurchase`'s `throw insertError` re-throw of a non-`23505` error, if that branch is genuinely unreachable from a deterministic fixture); (c) any in-place refactor taken for testability, with file + line + rationale.

### 7.5 Invariant-elevation audit

- [x] 7.5 Confirm every new/modified SHALL is asserted by at least one discrete `it()`:
  - ADDED `server-endpoint-authorization` follow-graph actor-resolution → §5.2 / §5.7 / §5.10 / §5.15.
  - MODIFIED `list-item-management` capacity enforcement → §4.27 / §4.28 / §4.29 (in-app check + partial-index trip + at-limit; the residual-race scenario is documented, not unit-asserted, since it requires true concurrency — noted as non-elevated-to-unit-test with rationale).
- [x] 7.6 Confirm no test asserts an invariant lacking a corresponding SHALL — every assertion maps to a requirement in `server-endpoint-authorization`, `list-item-management`, `following`, `visit-history`, or `list-visibility`. Record any tested-but-not-elevated invariant with one-line rationale (e.g. `user.ts` sign-in/out delegation — derivable from the wrapper signatures, not elevated).

## 8. Audit disposition record

- [x] 8.1 **§7.1 Assertion-substance** — Net-new files (`user.test.ts`, `route.test.ts`) audited: every assertion names observable output — `signIn('google')` / `signOut({ redirect: false })` delegation + the `redirect('/sign-in')` sentinel for `user.ts`; HTTP status + parsed JSON body + `expect(fetch).not.toHaveBeenCalled()` on every reject path (401 / 429 / 400) for `route.ts`. The sibling-owned `lists.test.ts` / `items.test.ts` / `follows.test.ts` were re-audited at HEAD and already assert the three-way (error response + DB-unchanged follow-up read + `updateTag`-not-called) on rejection paths — `lists.test.ts` carries 8 `updateTag`-not-called assertions; `items.test.ts` asserts row-persists on every reject. No test asserts only an error response.
- [x] 8.2 **§7.2 Duplication** — No `test/helpers/` extraction taken. `sessionFor()` is used by only ONE net-new file (`route.test.ts`; `user.test.ts` mocks `signIn`/`signOut`, never `auth()`), so it is **inlined** there (single caller → inline, per CLAUDE.md). The `@/db` getter-holder mock and the `next/cache` mock stay inline per file (`vi.mock` is hoisted per module — matches the precedent in the sibling test files and `lib/__tests__/listAccess.test.ts`). `RedirectSignal` is inlined in `user.test.ts`. The interim `test/helpers/auth-fixtures.ts` draft was removed once the audit confirmed a single caller.
- [x] 8.3 **§7.3 Complexity** — `npm run lint` clean (0 errors) for the two net-new source files; no function in `user.ts` or `route.ts` exceeds the cognitive-complexity ceiling of 15, so NO extraction and NO `eslint-disable` were needed. (The anticipated `createPurchase` / `removePurchase` / `updateItem*` dispositions belong to `items.ts`, owned by sibling 4.9.) Both net-new files are added to the per-file `error`-level override in `eslint.config.mjs`.
- [x] 8.4 **§7.4 Testability** — Per-file coverage at/above the universal floor (98/98/95/100): `user.ts` 100/100/100/100; `route.ts` 100/100/97.82/100 (sibling-owned for reference: `lists.ts` 100/100/100/100, `items.ts` 100/100/99.4/100, `follows.ts` 100/100/95/100). Singleton isolation: `vi.resetModules()` + dynamic re-import per test worked — NO reset seam needed. The `route.ts` LRU-eviction branch (good code, unreachable without 500 cached entries under the 30/min rate limit) was made testable by an in-place change making `CACHE_MAX_ENTRIES` env-tunable (`IMAGE_SEARCH_CACHE_MAX_ENTRIES`, default 500) — a genuine config knob consistent with the file's existing `IMAGE_SEARCH_*` switches, NOT a test-only backdoor; the test sets it to 2 and drives eviction in three calls. **Result: zero `/* v8 ignore */` annotations in the net-new source.** The single remaining uncovered branch (`route.ts` mock `query || 'mock'`, unreachable because the route validates a non-empty trimmed query) sits within the 95% branch budget — left uncovered, deliberately NOT ignored. This "a small genuine source change beats an ignore for good-but-costly-to-test code" decision was generalized into `TESTING.md`.
- [x] 8.5 **§7.5 Invariant-elevation** — ADDED `server-endpoint-authorization` follow-graph actor-resolution → asserted in `follows.test.ts`: `AuthedNewTarget_InsertsFollowRow` (inserted `follower_id` = session actor), `NoSession_ReturnsUnauthorized` across all five mutations, and the net-new `OnlySeversEdgeWhereActorIsFollowee_LeavesThirdPartyEdgeIntact` (removeFollower third-party-edge scoping). MODIFIED `list-item-management` capacity → asserted in sibling `items.test.ts`: `CapacityReached`, `DuplicateSameUser` / `DuplicateSameGuest`, `ConcurrentSameUser_SecondTripsUniqueIndex` (partial-index trip), `TwoDistinctGuestsConcurrent_BothInsertExceedingLimit` (accepted residual, documented not blocked). No test asserts an invariant lacking a SHALL; `user.ts` sign-in/out delegation is tested for carve-out completeness but intentionally NOT elevated (derivable from the wrapper signatures; no authorization invariant).

## 9. Config changes

- [x] 9.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` with a comment header `// test-server-endpoint-authorization (sub-proposal 4.13) — locked at universal COVERAGE_FLOOR.` and the five paths: `app/actions/lists.ts`, `app/actions/items.ts`, `app/actions/follows.ts`, `app/actions/user.ts`, `app/api/image-search/route.ts`.
- [x] 9.2 Add five per-file threshold entries in `vitest.config.ts`'s `thresholds` map, each referencing `COVERAGE_FLOOR`. Confirm the test file count is 5 and the threshold count is 5.
- [x] 9.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line.

## 10. Apply spec deltas

- [x] 10.1 Apply the ADDED requirement from `specs/server-endpoint-authorization/spec.md` into the active `openspec/specs/server-endpoint-authorization/spec.md`. Validate via `openspec validate server-endpoint-authorization --strict`.
- [x] 10.2 ~~Apply the MODIFIED requirement~~ **Inherited from sibling 4.9 (`test-list-item-management`)**, which archived to `dev` first and already replaced the "Purchase capacity SHALL be enforced atomically against concurrent callers" requirement in the active `openspec/specs/list-item-management/spec.md` with the in-app-check + partial-unique-index + accepted-residual form. Verified present at HEAD; this change does NOT re-apply the delta (would be a no-op/conflict). See proposal "Scope reconciliation" + design Decision 5.
- [x] 10.3 Confirm the carve-out bookkeeping spec at `openspec/changes/test-server-endpoint-authorization/specs/testing-foundation/spec.md` stays archive-only — does NOT roll into the parent `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md` (Tier 2 per `test-coverage` design D13).
- [x] 10.4 `openspec/changes/test-coverage/tasks.md` §4.13 checkbox — leave unchecked; it flips on archive of this sub-proposal, not at apply.

## 11. Pre-merge

- [x] 11.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files are acceptable; this carve-out introduces zero new warnings or errors (justified `cognitive-complexity` disables, if any, carry reason comments).
- [x] 11.2 `npx tsc --noEmit` exits 0.
- [x] 11.3 `npm run build` completes successfully (exit 0) when `DATABASE_URL` is set — `@/db` constructs the neon client at module load during page-data collection (pre-existing, unrelated to this change). With no `DATABASE_URL` the build fails at `neon()` for `/api/image-search`; CI provides it.
- [x] 11.4 `npm run test:coverage` passes; the five carve-out files report at universal `COVERAGE_FLOOR` (98/98/95/100) or above.
- [x] 11.5 `npm run test:e2e` — no e2e spec files exist on this branch (`e2e/` holds only `tsconfig.json`), so there are no E2E tests to run; vacuously acceptable per the task. (The Playwright web server also can't boot locally without `DATABASE_URL`.) The concurrency-residual claim in the MODIFIED capacity requirement is e2e/load territory and is NOT gated here.
