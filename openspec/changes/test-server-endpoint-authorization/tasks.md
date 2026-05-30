## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Confirm the **node** vitest project resolves `@/` and includes `**/*.test.ts` (it does — `vitest.config.ts` `projects[1]`); these five files are `.test.ts`, so they route to node, NOT jsdom.
- [ ] 1.2 Confirm `test/helpers/db.ts`'s `bootPglite()` replays the drizzle journal and returns `{ db, raw }`; confirm `@electric-sql/pglite` + `drizzle-orm/pglite` are installed.
- [ ] 1.3 Confirm the `vi.hoisted` `dbHolder` + `vi.mock('@/db', () => ({ get db() {…} }))` getter pattern from `lib/__tests__/listAccess.test.ts` works for actions that `import { db } from '@/db'` at module load.
- [ ] 1.4 Confirm `test/helpers/next-cache.ts`'s `mockNextCache()` (or an inline `vi.mock('next/cache')`) exposes `updateTag` as a `vi.fn()` for spy assertions.
- [ ] 1.5 Spec re-grep at HEAD: confirm `server-endpoint-authorization`'s six requirements, `list-item-management`'s three purchase requirements (createPurchase-auth, capacity-enforcement, removePurchase-guest-id), `following`'s follow/block SHALLs, `visit-history`'s bookmark-viewable + remove/clear SHALLs, and `list-visibility`'s setListVisibility SHALLs. Record the EXACT current text of `list-item-management`'s "Purchase capacity SHALL be enforced atomically" requirement so the MODIFIED delta replaces it faithfully.
- [ ] 1.6 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block; new entries append to its `files` array.
- [ ] 1.7 Confirm `extract-visibility-constants` is still active (Stage 1) and `@/lib/visibility` exports `VISIBILITY`, `fromDb`, `VISIBILITY_VALUES`; the visibility-touching tests will use these, not literal DB strings (Decision 6).

## 2. Shared test helpers (extract only if duplication audit confirms ≥3-file reuse)

- [ ] 2.1 `test/helpers/db.ts` is reused as-is for `bootPglite()`. Do NOT modify it (it is versioned-as-fixture per testing-foundation).
- [ ] 2.2 Draft a `dbHolder` + `@/db` getter-mock snippet. If used by ≥3 of the five files (expected: all four DB-touching files), extract a `test/helpers/db-mock.ts` exporting a `makeDbHolder()` factory; otherwise inline. **Disposition recorded in §7.2.**
- [ ] 2.3 Draft a caller-class session factory `sessionFor(email | null)` returning the `auth()` mock resolution. If reused across ≥3 files (expected), extract to `test/helpers/auth-fixtures.ts`; otherwise inline. **Disposition recorded in §7.2.**
- [ ] 2.4 Per-file seeding helpers (insert owner + non-owner users, a list/item they own) stay inline per file — the seeded entities differ per action surface and are not a reusable fixture.

## 3. Write `app/actions/__tests__/lists.test.ts` (node, universal COVERAGE_FLOOR)

### 3A. ModuleMocks + fixtures

- [ ] 3.1 `vi.mock('@/db')` getter holder; `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`; `vi.mock('next/cache')` exposing `updateTag` spy.
- [ ] 3.2 `beforeAll`: boot pglite, assign holder. `beforeEach`: reset `updateTag` spy + reseed (owner `OWNER` with email; non-owner `OTHER` with email; an `OWNER`-owned list `L_OWNER`; an `OTHER`-owned list `L_OTHER`; `list_items` + `list_visits` rows as each test needs).

### 3B. createList — three caller classes

- [ ] 3.3 `Owner_CreatesList_PersistsWithSessionUserId` — `auth()` → owner email; assert `{ success: true, id }`, a follow-up read shows the row with `user_id = OWNER`, and `updateTag('lists')` called.
- [ ] 3.4 `Unauthenticated_CreateList_ReturnsUnauthorized_NoRow_NoUpdateTag` — `auth()` → null; assert `{ success: false, error: 'Unauthorized' }`, no new `lists` row, `updateTag` not called.
- [ ] 3.5 `ValidationFailure_ReturnsFieldErrors_NoRow` — name < 3 chars; assert `errors.name` present, no row, no `updateTag`.

### 3C. updateList / deleteList — ownership matrix

- [ ] 3.6 `Owner_UpdatesOwnList_PersistsPartialUpdate_CallsUpdateTag`.
- [ ] 3.7 `NonOwner_UpdateOthersList_ReturnsUnauthorized_RowUnchanged_NoUpdateTag` — `auth()` → OTHER email, target `L_OWNER`; assert error + follow-up read shows L_OWNER unchanged + `updateTag` not called.
- [ ] 3.8 `Unauthenticated_UpdateList_ReturnsUnauthorized_NoUpdateTag`.
- [ ] 3.9 `Owner_UpdateMissingList_ReturnsNotFound`.
- [ ] 3.10 `Owner_DeletesOwnList_RowGone_CallsUpdateTag`.
- [ ] 3.11 `NonOwner_DeleteOthersList_ReturnsUnauthorized_RowSurvives_NoUpdateTag`.
- [ ] 3.12 `Unauthenticated_DeleteList_ReturnsUnauthorized_NoUpdateTag`.

### 3D. setListVisibility — ownership + visibility-state transitions (use VISIBILITY.* / fromDb)

- [ ] 3.13 `Owner_SetVisibilityToLink_PersistsAndSetsSharedAt` — owner, `VISIBILITY.OWNER → VISIBILITY.LINK`; assert stored value via `fromDb()` equals `VISIBILITY.LINK`, `shared_at` set, legacy `shared = true`, `updateTag('lists')`.
- [ ] 3.14 `Owner_SetVisibilityToOwner_ClearsSharedAt_SharedFalse` — going private clears `shared_at` and sets `shared = false`.
- [ ] 3.15 `Owner_LinkToFollowers_PreservesSharedAt` — unlisted ↔ public preserves `shared_at` (no transition reset).
- [ ] 3.16 `NonOwner_SetVisibility_ReturnsForbidden_Unchanged_NoUpdateTag`.
- [ ] 3.17 `Unauthenticated_SetVisibility_ReturnsUnauthorized_NoUpdateTag`.
- [ ] 3.18 `InvalidVisibilityValue_ReturnsValidationError` — an out-of-enum string; assert `{ error: 'Validation' }`, no write.

### 3E. bookmarkList / unbookmarkList — viewability gate + ownership-of-own-visit-row

- [ ] 3.19 `Authed_BookmarkViewableList_UpsertsFavoritedAt_CallsUpdateTagVisits` — bookmark a `VISIBILITY.LINK` list owned by OTHER; assert `list_visits` upsert with `favorited_at` set + `updateTag('list_visits')`.
- [ ] 3.20 `Authed_BookmarkPrivateNonOwnedList_ReturnsNotViewable_NoRow` **(visit-history SHALL)** — bookmark a `VISIBILITY.OWNER` list owned by OTHER; assert `{ error: 'List not viewable' }`, no `list_visits` row, no `updateTag`.
- [ ] 3.21 `Owner_BookmarkOwnPrivateList_Succeeds` — owner can bookmark their own private list (the gate is `user_id !== userId && OWNER`).
- [ ] 3.22 `Unauthenticated_Bookmark_ReturnsUnauthorized_NoUpdateTag`.
- [ ] 3.23 `Authed_Unbookmark_NullsFavoritedAt_ScopedToViewerRow` — unbookmark only nulls the viewer's own `(user_id, list_id)` row; assert another user's bookmark of the same list is untouched.
- [ ] 3.24 `Unauthenticated_Unbookmark_ReturnsUnauthorized`.

### 3F. clearVisitHistory / removeVisit — bookmarked-row-survives semantics

- [ ] 3.25 `Authed_ClearHistoryExcludeBookmarked_DeletesNonBookmarked_NullsBookmarkedLastVisited` — assert non-bookmarked rows deleted, bookmarked rows survive with `last_visited_at = null`, scoped to viewer.
- [ ] 3.26 `Authed_ClearHistoryIncludeBookmarked_DeletesAllViewerRows`.
- [ ] 3.27 `Unauthenticated_ClearHistory_ReturnsUnauthorized`.
- [ ] 3.28 `Authed_RemoveVisitBookmarkedRow_NullsLastVisited_RowSurvives`.
- [ ] 3.29 `Authed_RemoveVisitNonBookmarkedRow_DeletesRow`.
- [ ] 3.30 `Authed_RemoveVisitNoRow_ReturnsSuccessNoop`.
- [ ] 3.31 `Unauthenticated_RemoveVisit_ReturnsUnauthorized`.

### 3G. setListItems — ownership + diff-based add/remove + position base

- [ ] 3.32 `Owner_SetListItems_AddsAndRemovesByDiff_CallsUpdateTagItemsAndLists` — seed existing `list_items`; pass a new id set; assert only the diff is inserted/deleted and positions use the `COALESCE(MAX+65536)` base.
- [ ] 3.33 `Owner_SetListItemsNoChange_ReturnsNoChanges_NoUpdateTag` — identical set → `{ message: 'No changes' }`, no `updateTag`.
- [ ] 3.34 `NonOwner_SetListItems_ReturnsForbidden_Unchanged_NoUpdateTag`.
- [ ] 3.35 `Unauthenticated_SetListItems_ReturnsUnauthorized_NoUpdateTag`.
- [ ] 3.36 `Owner_SetListItemsMissingList_ReturnsNotFound`.
- [ ] 3.37 `Owner_SetListItemsInvalidIds_ReturnsInvalidInput` — empty-string id in array fails the Zod array check.

### 3H. updatePriority — ownership + fractional reposition + rebalance trigger

- [ ] 3.38 `Owner_UpdatePriorityMoveDown_ComputesMidpointPosition_CallsUpdateTagItems`.
- [ ] 3.39 `Owner_UpdatePriorityMoveUp_ComputesMidpointPosition`.
- [ ] 3.40 `Owner_UpdatePrioritySamePosition_ReturnsAlreadyAtTarget`.
- [ ] 3.41 `Owner_UpdatePriorityMissingItemOrTarget_ReturnsNotFound`.
- [ ] 3.42 `Owner_UpdatePriorityTriggersRebalance_WhenGapBelowMinGap` — seed two adjacent positions with a sub-`0.001` gap so `checkListBalance` returns true; assert `rebalanceList` runs (positions reset to `(index+1)*65536`). **Covers the rebalance branch.**
- [ ] 3.43 `NonOwner_UpdatePriority_ReturnsUnauthorized_Unchanged_NoUpdateTag`.
- [ ] 3.44 `Unauthenticated_UpdatePriority_ReturnsUnauthorized_NoUpdateTag`.

## 4. Write `app/actions/__tests__/items.test.ts` (node, universal COVERAGE_FLOOR)

### 4A. ModuleMocks + fixtures

- [ ] 4.1 Same `@/db` / `@/lib/auth` / `next/cache` mocks. `lib/listAccess` + `lib/sqlstate` NOT mocked (run real against pglite).
- [ ] 4.2 Seed: owner `OWNER` + email; non-owner `OTHER` + email; an `OWNER`-owned item `I_OWNER` on a viewable list; an `OTHER`-owned item `I_OTHER`; lists owned by each for the cross-list ownership test.

### 4B. getItemEditData — auth + ownership read

- [ ] 4.3 `Owner_GetItemEditData_ReturnsItemAndLists`.
- [ ] 4.4 `Unauthenticated_GetItemEditData_ReturnsNull`.
- [ ] 4.5 `NonOwner_GetItemEditData_ReturnsNull` — `getItemById(itemId, user.id)` scopes to the actor; a non-owner gets null.

### 4C. createItem — auth + nested list/store association

- [ ] 4.6 `Owner_CreateItem_PersistsWithSessionUserId_CallsUpdateTagItems`.
- [ ] 4.7 `Owner_CreateItemWithLists_AssociatesOwnedListsOnly`.
- [ ] 4.8 `Unauthenticated_CreateItem_ReturnsUnauthorized_NoRow_NoUpdateTag`.
- [ ] 4.9 `ValidationFailure_ReturnsFieldErrors_NoRow`.

### 4D. updateItem / archiveItem / deleteItem — ownership matrix

- [ ] 4.10 `Owner_UpdatesOwnItem_PersistsAndReassociates_CallsUpdateTag`.
- [ ] 4.11 `NonOwner_UpdateOthersItem_ReturnsUnauthorized_Unchanged_NoUpdateTag`.
- [ ] 4.12 `Unauthenticated_UpdateItem_ReturnsUnauthorized_NoUpdateTag`.
- [ ] 4.13 `Owner_ArchiveItem_SetsArchivedAt_CallsUpdateTag` + `Owner_UnarchiveItem_ClearsArchivedAt`.
- [ ] 4.14 `NonOwner_ArchiveItem_ReturnsForbidden_Unchanged_NoUpdateTag`.
- [ ] 4.15 `Unauthenticated_ArchiveItem_ReturnsUnauthorized`.
- [ ] 4.16 `Owner_DeletesOwnItem_RowGone_CallsUpdateTag`.
- [ ] 4.17 `NonOwner_DeleteOthersItem_ThrowsUnauthorized_RowSurvives` — `deleteItem` THROWS (caught → `{ success:false }`); assert the result shape AND row survival.
- [ ] 4.18 `Unauthenticated_DeleteItem_ReturnsFailure_NoUpdateTag`.

### 4E. updateItemLists / updateItemStores — cross-list ownership gate (server-endpoint-authorization SHALL)

- [ ] 4.19 `NonOwner_UpdateItemLists_ThrowsUnauthorized_NoListItemsWritten` **(server-endpoint-authorization SHALL)** — actor OTHER targeting `I_OWNER`; assert throw, no `list_items` change.
- [ ] 4.20 `Owner_UpdateItemListsWithForeignList_ThrowsUnauthorized` **(server-endpoint-authorization SHALL)** — owner attaches their item to `L_OTHER` (a list owned by OTHER); the all-target-lists-owned check rejects; assert throw, no `list_items` row inserted for the foreign list.
- [ ] 4.21 `NonOwner_UpdateItemStores_ThrowsUnauthorized_NoItemStoresWritten`.
- [ ] 4.22 `Owner_UpdateItemStores_DiffsExistingAssociations` — exercised via `updateItem`; assert update/insert/delete by position diff.

### 4F. createPurchase — guest write path + viewability + capacity (list-item-management SHALLs)

- [ ] 4.23 `Authed_ClaimViewableItem_InsertsWithUserId_GuestNameIgnored_CallsUpdateTag`.
- [ ] 4.24 `Guest_ClaimViewableItemWithName_InsertsWithNullUserIdAndGuestName`.
- [ ] 4.25 `Guest_ClaimWithoutName_ReturnsMissingIdentity_NoRow`.
- [ ] 4.26 `AnyCaller_ClaimNonViewableItem_ReturnsItemNotFound_NoRow` **(list-item-management SHALL)** — item on a private non-owned list; assert `{ error: 'Item not found' }`, no `purchases` row. Exercises the real `isItemViewable`.
- [ ] 4.27 `Authed_DuplicateClaim_InApp_ReturnsDuplicateClaim` — seed an existing purchase by the actor; in-app check rejects.
- [ ] 4.28 `Authed_DuplicateClaim_PartialIndexTrip_ReturnsDuplicateClaim` **(list-item-management SHALL, MODIFIED)** — bypass the in-app check by inserting a conflicting `purchases` row directly between the check and insert is not directly reproducible without a race; instead force the `23505` path by pre-inserting a row that the in-app check misses (e.g. insert directly via `raw` after the action reads), OR assert the `catch` maps a synthesized unique-violation. Disposition recorded in §7.4 if a `/* v8 ignore */` is needed for an unreachable sub-branch.
- [ ] 4.29 `AtLimit_Claim_ReturnsFullyClaimed_NoRow` **(list-item-management SHALL)** — `quantity_limit = 1` with one existing purchase; assert `{ error: 'Fully claimed' }`.
- [ ] 4.30 `MissingItem_Claim_ReturnsItemNotFound`.

### 4G. removePurchase — guest revoke identity gate (list-item-management SHALL)

- [ ] 4.31 `Authed_RemoveOwnClaimByPurchaseId_DeletesRow_CallsUpdateTag`.
- [ ] 4.32 `Authed_RemoveOthersClaimByPurchaseId_ReturnsNotYourClaim_RowSurvives`.
- [ ] 4.33 `Guest_RemoveOwnGuestClaimByPurchaseIdWithMatchingName_DeletesRow` **(list-item-management SHALL)**.
- [ ] 4.34 `Guest_RemoveGuestClaimWrongName_ReturnsNotYourClaim_RowSurvives` **(list-item-management SHALL)** — the critical cross-guest protection.
- [ ] 4.35 `Guest_RemoveAuthedUsersClaimByPurchaseId_ReturnsNotYourClaim` **(list-item-management SHALL)** — guest cannot revoke a row with non-null `user_id`.
- [ ] 4.36 `Authed_RemoveByItemIdLegacyPath_DeletesOwnRow`.
- [ ] 4.37 `Guest_RemoveByItemIdLegacyPath_ReturnsMissingIdentity` **(list-item-management SHALL)** — the legacy item-scoped path is authenticated-only.
- [ ] 4.38 `RemovePurchaseMissingRow_ReturnsNotFound`.

## 5. Write `app/actions/__tests__/follows.test.ts` (node, universal COVERAGE_FLOOR)

### 5A. ModuleMocks + fixtures

- [ ] 5.1 `@/db` / `@/lib/auth` / `next/cache` mocks. Seed `VIEWER`, `TARGET`, `THIRD` users + emails; `user_follows` / `user_blocks` rows as needed.

### 5B. followUser — auth, self, block-gating, idempotency (following SHALLs)

- [ ] 5.2 `Authed_FollowOther_InsertsRow_CallsUpdateTagUserFollows` — assert `follower_id = VIEWER` (session-resolved, not payload) **(server-endpoint-authorization SHALL)**.
- [ ] 5.3 `Authed_FollowSelf_ReturnsInvalid_NoRow` **(following SHALL)**.
- [ ] 5.4 `Authed_FollowWhenViewerBlockedTarget_ReturnsBlocked_NoRow` **(following SHALL)**.
- [ ] 5.5 `Authed_FollowWhenTargetBlockedViewer_ReturnsBlocked_NoRow` **(following SHALL)** — both-direction gating.
- [ ] 5.6 `Authed_FollowAlreadyFollowing_Idempotent_NoDuplicate` **(following SHALL)**.
- [ ] 5.7 `Unauthenticated_Follow_ReturnsUnauthorized_NoRow_NoUpdateTag` **(server-endpoint-authorization SHALL)**.

### 5C. unfollowUser / removeFollower — scoping (server-endpoint-authorization SHALL)

- [ ] 5.8 `Authed_Unfollow_DeletesViewerToTargetEdge_NoopIfAbsent`.
- [ ] 5.9 `Unauthenticated_Unfollow_ReturnsUnauthorized`.
- [ ] 5.10 `Authed_RemoveFollower_DeletesOnlyTargetToViewerEdge` **(server-endpoint-authorization SHALL)** — seed `(TARGET→VIEWER)` and `(TARGET→THIRD)`; assert only `(TARGET→VIEWER)` is deleted, `(TARGET→THIRD)` survives.
- [ ] 5.11 `Unauthenticated_RemoveFollower_ReturnsUnauthorized`.

### 5D. blockUser / unblockUser — self, block-first ordering (following + server-endpoint-authorization SHALLs)

- [ ] 5.12 `Authed_BlockOther_InsertsBlock_DeletesFollowBothDirections_CallsUpdateTags` **(following SHALL)** — seed mutual follow; assert block row inserted, both follow edges gone, `updateTag('user_follows')` + `updateTag('user_blocks')`.
- [ ] 5.13 `Authed_BlockSelf_ReturnsInvalid_NoRow` **(following SHALL)**.
- [ ] 5.14 `Authed_BlockAlreadyBlocked_Idempotent`.
- [ ] 5.15 `Unauthenticated_Block_ReturnsUnauthorized_NoRow_NoUpdateTag`.
- [ ] 5.16 `Authed_Unblock_DeletesBlockRow_ScopedToViewer`.
- [ ] 5.17 `Unauthenticated_Unblock_ReturnsUnauthorized`.

## 6. Write `app/actions/__tests__/user.test.ts` + `app/api/image-search/__tests__/route.test.ts`

### 6A. user.test.ts (node — NextAuth wrappers, no DB)

- [ ] 6.1 `vi.mock('@/lib/auth', () => ({ signIn: vi.fn(), signOut: vi.fn() }))`; `vi.mock('next/navigation', () => ({ redirect: vi.fn((t) => { throw new RedirectSignal(t); }) }))`.
- [ ] 6.2 `SignInUser_DelegatesToSignInGoogle` — assert `signIn` called with `'google'`.
- [ ] 6.3 `SignOutUser_SignsOutThenRedirectsToSignIn` — assert `signOut` called with `{ redirect: false }`, then `redirect('/sign-in')` (via the sentinel throw, `rejects.toThrow`).

### 6B. route.test.ts (node — auth + rate limit + query cap + provider chain)

- [ ] 6.4 ModuleMocks: `vi.mock('@/db')` holder, `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`. `beforeEach`: `vi.resetModules()` + dynamic `import('../route')` for fresh singleton maps (Decision 4); re-stub `global.fetch` to a `vi.fn()` returning a canned provider response; set `process.env.IMAGE_SEARCH_PROVIDERS` + a fake key so the chain selects a real (mocked-`fetch`) provider, not the mock provider.
- [ ] 6.5 `Unauthenticated_Get_Returns401_NoProviderFetch` **(server-endpoint-authorization SHALL)** — `auth()` → null; assert 401 + `expect(fetch).not.toHaveBeenCalled()`.
- [ ] 6.6 `AuthedButUserRowMissing_Returns401` — `auth()` returns an email with no matching `users` row.
- [ ] 6.7 `Authed_OverRateLimit_Returns429RateLimited_NoProviderFetch` **(server-endpoint-authorization SHALL)** — drive `RATE_LIMIT_PER_WINDOW + 1` calls for one user (the first 30 may hit `fetch`; the 31st asserts 429 `{ error: 'rate_limited' }` + no additional `fetch`). Use distinct `q` values to avoid the cache short-circuiting the count.
- [ ] 6.8 `Authed_QueryTooLong_Returns400QueryTooLong_NoProviderFetch` **(server-endpoint-authorization SHALL)** — `q` length 201; assert 400 `{ error: 'query_too_long' }` + no `fetch`.
- [ ] 6.9 `Authed_MissingOrBlankQuery_Returns400`.
- [ ] 6.10 `Authed_ValidQuery_DelegatesToProvider_ReturnsItems` — assert the response `items` shape matches the canned provider payload mapping, and `provider` name is set.
- [ ] 6.11 `Authed_CacheHit_ReturnsCachedTrue_NoSecondFetch` — same `q` twice; second call returns `{ cached: true }` with `fetch` called only once.
- [ ] 6.12 `Authed_ProviderQuotaExceeded_FallsThroughChain_Returns429QuotaExceeded` — first provider `fetch` resolves a 429; assert the chain advances and (if all exhausted) surfaces `{ error: 'quota_exceeded' }` 429, distinct from `rate_limited`.
- [ ] 6.13 `Authed_ProviderNonQuotaError_Returns500` — provider `fetch` throws a non-quota error; assert 500 `{ error: 'Failed to process image search' }`.

## 7. Audits

### 7.1 Assertion-substance audit (on the new tests)

- [ ] 7.1 Walk each of the five test files end-to-end. Every assertion SHALL name observable output: the action's `{ success, error, id, message }` shape; a follow-up pglite read confirming the row was/wasn't written or mutated; the exact `updateTag(...)` argument OR `expect(updateTag).not.toHaveBeenCalled()`; the HTTP status + parsed JSON body for the route; the redirect sentinel for `signOutUser`. **Specifically verify every unauthorized-path test asserts THREE things — error response + DB-unchanged (follow-up read) + `updateTag` not called** — so a buggy action that rejects but still mutates or still invalidates is caught (locks `server-endpoint-authorization`'s rejections-do-not-invalidate-caches SHALL). Flag and rewrite any test that asserts only the error response. Record dispositions.

### 7.2 Duplication audit (across the five files + helpers)

- [ ] 7.2 Identify shared patterns: (a) `@/db` getter-holder mock — expected in all four DB files → extract `test/helpers/db-mock.ts` if confirmed; (b) `sessionFor()` auth fixture — expected in all five → extract `test/helpers/auth-fixtures.ts` if confirmed; (c) `next/cache` mock — reuse existing `test/helpers/next-cache.ts`; (d) `RedirectSignal` — only `user.test.ts` needs it (inline). Record final disposition (extracted vs. inline) with file references.

### 7.3 Complexity audit (on the carve-out source)

- [ ] 7.3 Run `npm run lint`; record measured `sonarjs/cognitive-complexity` for each function. **Expected over-15 findings:** `createPurchase`, `removePurchase`, the image-search `GET` handler, possibly `updateItemStores` / `updateItemLists`. For each finding choose: **(a) in-place extraction** within the carve-out file (e.g. extract guest-identity resolution and the capacity check from `createPurchase` into named helpers; extract the purchase-id-vs-item-id branch from `removePurchase`; extract the provider-loop from `GET`), proven behavior-preserving by the new tests; OR **(b) a justified `// eslint-disable-next-line sonarjs/cognitive-complexity` with a reason comment**. Record each disposition with file + function + chosen option in §8.

### 7.4 Testability audit (on the carve-out source)

- [ ] 7.4 Coverage report at universal `COVERAGE_FLOOR` or above across all five files (record per-file metrics from `coverage/coverage-summary.json`). Record: (a) the image-search singleton-isolation disposition — `vi.resetModules()` (Decision 4) vs. an in-place reset seam; (b) any `/* v8 ignore */` annotation with a one-line rationale (expected candidate: `createPurchase`'s `throw insertError` re-throw of a non-`23505` error, if that branch is genuinely unreachable from a deterministic fixture); (c) any in-place refactor taken for testability, with file + line + rationale.

### 7.5 Invariant-elevation audit

- [ ] 7.5 Confirm every new/modified SHALL is asserted by at least one discrete `it()`:
  - ADDED `server-endpoint-authorization` follow-graph actor-resolution → §5.2 / §5.7 / §5.10 / §5.15.
  - MODIFIED `list-item-management` capacity enforcement → §4.27 / §4.28 / §4.29 (in-app check + partial-index trip + at-limit; the residual-race scenario is documented, not unit-asserted, since it requires true concurrency — noted as non-elevated-to-unit-test with rationale).
- [ ] 7.6 Confirm no test asserts an invariant lacking a corresponding SHALL — every assertion maps to a requirement in `server-endpoint-authorization`, `list-item-management`, `following`, `visit-history`, or `list-visibility`. Record any tested-but-not-elevated invariant with one-line rationale (e.g. `user.ts` sign-in/out delegation — derivable from the wrapper signatures, not elevated).

## 8. Audit disposition record

- [ ] 8.1 **§7.1 Assertion-substance** — record the per-file outcome (every assertion names observable output; unauthorized paths assert the three-way error+DB+cache).
- [ ] 8.2 **§7.2 Duplication** — record which helpers extracted to `test/helpers/` vs. stayed inline.
- [ ] 8.3 **§7.3 Complexity** — record each over-15 function and its disposition (extracted / justified-disable).
- [ ] 8.4 **§7.4 Testability** — record per-file coverage metrics, the singleton-isolation choice, and any `/* v8 ignore */` / in-place refactor.
- [ ] 8.5 **§7.5 Invariant-elevation** — record elevated SHALLs ↔ tests mapping and any non-elevations with rationale.

## 9. Config changes

- [ ] 9.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` with a comment header `// test-server-endpoint-authorization (sub-proposal 4.13) — locked at universal COVERAGE_FLOOR.` and the five paths: `app/actions/lists.ts`, `app/actions/items.ts`, `app/actions/follows.ts`, `app/actions/user.ts`, `app/api/image-search/route.ts`.
- [ ] 9.2 Add five per-file threshold entries in `vitest.config.ts`'s `thresholds` map, each referencing `COVERAGE_FLOOR`. Confirm the test file count is 5 and the threshold count is 5.
- [ ] 9.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line.

## 10. Apply spec deltas

- [ ] 10.1 Apply the ADDED requirement from `specs/server-endpoint-authorization/spec.md` into the active `openspec/specs/server-endpoint-authorization/spec.md`. Validate via `openspec validate server-endpoint-authorization --strict`.
- [ ] 10.2 Apply the MODIFIED requirement from `specs/list-item-management/spec.md` into the active `openspec/specs/list-item-management/spec.md`, replacing the existing "Purchase capacity SHALL be enforced atomically against concurrent callers" requirement in full. Validate via `openspec validate list-item-management --strict`.
- [ ] 10.3 Confirm the carve-out bookkeeping spec at `openspec/changes/test-server-endpoint-authorization/specs/testing-foundation/spec.md` stays archive-only — does NOT roll into the parent `test-coverage` accumulator and does NOT modify the active `openspec/specs/testing-foundation/spec.md` (Tier 2 per `test-coverage` design D13).
- [ ] 10.4 `openspec/changes/test-coverage/tasks.md` §4.13 checkbox — leave unchecked; it flips on archive of this sub-proposal, not at apply.

## 11. Pre-merge

- [ ] 11.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files are acceptable; this carve-out introduces zero new warnings or errors (justified `cognitive-complexity` disables, if any, carry reason comments).
- [ ] 11.2 `npx tsc --noEmit` exits 0.
- [ ] 11.3 `npm run build` completes successfully.
- [ ] 11.4 `npm run test:coverage` passes; the five carve-out files report at universal `COVERAGE_FLOOR` (98/98/95/100) or above.
- [ ] 11.5 `npm run test:e2e` — record outcome. If no e2e specs exist on this branch, "No tests found" is vacuously acceptable; the concurrency-residual claim in the MODIFIED capacity requirement is e2e/load territory and is NOT gated here.
