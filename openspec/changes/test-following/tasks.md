## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Confirm `test/helpers/db.ts` `bootPglite()` migrates `user_follows`, `user_blocks`, `users`, `lists` (composite PKs included) and returns a `drizzle` client with `casing: 'snake_case'`.
- [ ] 1.2 Confirm `test/helpers/next-cache.ts` `mockNextCache()` no-ops `cacheTag` and spies `updateTag` / `revalidateTag`.
- [ ] 1.3 Confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` + RTL `cleanup` (jsdom files only; node files do not use it).
- [ ] 1.4 Confirm the node project (`*.test.ts`) and jsdom project (`*.test.tsx`) resolve `@/` and that `@vitejs/plugin-react` is active for jsdom.
- [ ] 1.5 Spec re-grep at HEAD against `openspec/specs/following/spec.md`: confirm the 12 active requirements; confirm none already names the `user_follows` PK as the dedup backstop (the ADDED requirement does not collide); confirm "Follow-graph mutations SHALL NOT use interactive transactions" and "First follow … disclosure dialog" wording the tests assert against.
- [ ] 1.6 Confirm `db/schema.ts` `user_follows` PK is `primaryKey({ columns: [follower_id, followee_id] })` and `followUser` uses `onConflictDoNothing()` — the basis for the spec-delta correction.
- [ ] 1.7 Confirm `eslint.config.mjs` per-file `sonarjs/cognitive-complexity = error` override block exists; new entries append to its `files` array.

## 2. Establish the DAL + server-action pglite harness (Tier 1)

- [ ] 2.1 Author the harness pattern (design.md Decision 2): getter-on-mutable-holder `vi.mock('@/db')` + `beforeEach` `bootPglite()` + `mockNextCache()` + `vi.mock('@/lib/auth')`. Land it inline in the first node file; promote a shared `test/helpers/seedFollowGraph.ts` per the §6 duplication audit if both node files reuse the seed (default: extract — two near-identical seed blocks).
- [ ] 2.2 Confirm the `'use cache'` directive on `isFollowing` / `isBlocked` / `viewerHasAnyFollows` is inert under the node project and the bodies run against pglite (Decision 3).
- [ ] 2.3 Verify no carve-out module needs the `getDb()` fallback indirection; if one does, land the minimal source refactor and record it in §6 (testability audit).

## 3. Write `app/actions/__tests__/follows.test.ts` (node, universal COVERAGE_FLOOR)

### 3A. Harness — pglite + auth + cache mocks
- [ ] 3.1 `vi.mock('@/db')` → holder-backed pglite; `mockNextCache()`; `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`; seed viewer + target users in `beforeEach`.

### 3B. followUser
- [ ] 3.2 `AuthedNewTarget_InsertsFollowRow` — one `user_follows(viewer→target)` row exists.
- [ ] 3.3 `AlreadyFollowing_NoDuplicateRowNoError` **Spec delta SHALL** (following: composite-PK dedup) — second call inserts no second row, returns success.
- [ ] 3.4 `SelfFollow_ReturnsInvalid_NoRow` — `followUser(viewerId)` → `error:'Invalid'`, zero rows.
- [ ] 3.5 `BlockedByTarget_ReturnsBlocked_NoRow` — target blocked viewer → `error:'Blocked'`, zero rows.
- [ ] 3.6 `BlockedViewer_ReturnsBlocked_NoRow` — viewer blocked target (reverse direction) → `error:'Blocked'`, zero rows.
- [ ] 3.7 `NoSession_ReturnsUnauthorized_NoRow` — `auth()` resolves null → `error:'Unauthorized'`, zero rows.
- [ ] 3.8 `Success_CallsUpdateTagUserFollowsOnce` — `updateTag('user_follows')` called exactly once on success.
- [ ] 3.9 `EarlyReturns_DoNotCallUpdateTag` — unauthorized / self / blocked paths call `updateTag` zero times.
- [ ] 3.10 `InsertThrows_ReturnsFailed_NoUpdateTag` — inject a DB error → `error:'Failed'`, no `updateTag`.

### 3C. unfollowUser
- [ ] 3.11 `Following_DeletesRow` — removes the `(viewer→target)` row.
- [ ] 3.12 `NotFollowing_NoOpSuccess` — no matching row → success, still zero rows.
- [ ] 3.13 `NoSession_ReturnsUnauthorized`.
- [ ] 3.14 `Success_CallsUpdateTagUserFollowsOnce`; early-return / error path does not.

### 3D. removeFollower
- [ ] 3.15 `FollowerExists_DeletesInvertedRow` — removes `(other→viewer)` (direction inverted from unfollow).
- [ ] 3.16 `NoSuchFollower_NoOpSuccess`.
- [ ] 3.17 `NoSession_ReturnsUnauthorized`; `Success_CallsUpdateTag`.

### 3E. blockUser
- [ ] 3.18 `Authed_InsertsBlockRow_AndDeletesBothFollowDirections` — `user_blocks(viewer→target)` inserted, both `user_follows` directions deleted.
- [ ] 3.19 `BlockFirstOrdering_RacingFollowStillGated` **Spec delta-adjacent** (following: block-first idempotent ordering) — after the block row exists, a follow attempt by the blocked party is rejected by the block check.
- [ ] 3.20 `Reblock_CleansLeftoverFollowRowIdempotently` — re-running `blockUser` removes a follow row inserted between calls.
- [ ] 3.21 `SelfBlock_ReturnsInvalid_NoRows`.
- [ ] 3.22 `NoSession_ReturnsUnauthorized`.
- [ ] 3.23 `Success_CallsUpdateTagUserFollowsAndUserBlocksOnceEach`.
- [ ] 3.24 `StatementThrows_NeitherUpdateTagFires` — inject error → no tag invalidation.

### 3F. unblockUser
- [ ] 3.25 `Blocked_DeletesBlockRow`; `NotBlocked_NoOpSuccess`; `NoSession_ReturnsUnauthorized`; `Success_CallsUpdateTagUserBlocksOnly`.

### 3G. No-transactions contract
- [ ] 3.26 `NoCodePath_UsesTransactionApi` **Spec SHALL** (following: no interactive transactions) — assert the mocked `db` surface the actions touch never invokes `transaction`/`tx.*` (behavioral: all paths complete via sequential single statements).

## 4. Write `lib/__tests__/dal.following.test.ts` (node, function-level coverage)

### 4A. Harness — pglite + cache mock; seed users / follows / blocks / public lists.
- [ ] 4.1 Shared seed via §2.1 helper (or inline if not extracted).

### 4B. getFollowingByUser
- [ ] 4.2 `ViewerFollowsTwo_ReturnsFolloweesWithUserJoin` — `{id,name,image}` join present.
- [ ] 4.3 `OrdersByCreatedAtDesc` — newest follow first.
- [ ] 4.4 `FollowsNoOne_ReturnsEmptyArray`.

### 4C. getFollowersOfUser
- [ ] 4.5 `HasFollowers_ReturnsFollowersWithJoin` — inverted direction (`followee_id = userId`).
- [ ] 4.6 `OrdersByCreatedAtDesc`; `NoFollowers_ReturnsEmptyArray`.

### 4D. getFollowingFeedUsers (also relied on by home-digest 4.3 — owned here)
- [ ] 4.7 `FolloweeWithPublicLists_LatestSharedAtIsMax` — `latest_shared_at = MAX(shared_at)` over the followee's `public` lists.
- [ ] 4.8 `NewCount_CountsListsSharedAfterGreatestLastSeenOrFollow` — `new_count` per the `GREATEST(COALESCE(last_seen_following_at, follow_created_at), follow_created_at)` filter.
- [ ] 4.9 `NewCount_CoercedToNumber` — Postgres count-string → JS number.
- [ ] 4.10 `OrdersByMaxSharedAtDesc`.
- [ ] 4.11 `FolloweeNoPublicLists_LatestNull_NewCountZero` — left-join null case.
- [ ] 4.12 `NullLastSeen_FollowNewerThanLists_PreexistingListsNotCountedNew` — the clamp suppresses pre-existing lists.

### 4E. follow-graph predicates
- [ ] 4.13 `isFollowing_TrueWhenRowExists` / `FalseWhenAbsent`.
- [ ] 4.14 `isBlocked_DirectionalTrueFalse` — `(blocker, blocked)` order matters.
- [ ] 4.15 `viewerHasAnyFollows_TrueWhenAtLeastOne` / `FalseWhenZero` (drives first-follow disclosure).

## 5. Write component + page test files (jsdom, universal COVERAGE_FLOOR)

### 5A. FollowButton — `__tests__/FollowButton.test.tsx`
- [ ] 5.1 `Following_LabelFollowing_CheckIcon_PressedTrue`.
- [ ] 5.2 `NotFollowingWithName_LabelFollowName_PlusIcon`.
- [ ] 5.3 `NotFollowingNullName_LabelFollow`.
- [ ] 5.4 `Pending_AriaDisabledTrue`; `AriaLabelMatchesLabel`.
- [ ] 5.5 `Click_FiresOnClick`; renders through the real `Button` (variant pass-through).

### 5B. FollowControls — `__tests__/FollowControls.test.tsx` (mock `@/app/actions/follows`, `next/navigation`, `react-hot-toast`)
- [ ] 5.6 `ClickFollow_OptimisticTrue_CallsFollowUser_ToastSuccess_RouterRefresh`.
- [ ] 5.7 `FollowFails_RevertsToFalse_ToastError`.
- [ ] 5.8 `ClickUnfollow_OptimisticFalse_CallsUnfollowUser_ToastSuccess`.
- [ ] 5.9 `UnfollowFails_RevertsToTrue_ToastError`.
- [ ] 5.10 `WhilePending_ClickIsNoOp`.
- [ ] 5.11 `RequireDisclosureAndNotFollowing_ClickOpensDialog_NoActionYet` **Spec SHALL** (following: first-follow disclosure).
- [ ] 5.12 `DialogConfirm_ClosesAndPerformsFollow`.
- [ ] 5.13 `DialogCancel_ClosesWithoutFollowing` **Spec SHALL** (following: Cancel aborts).
- [ ] 5.14 `Following_ClickAlwaysUnfollows_NoDialogGate` **Spec SHALL** (following: unfollow never gates on dialog).

### 5C. FollowContainer — `__tests__/FollowContainer.test.tsx` (async server component; mock `@/lib/dal`)
- [ ] 5.15 `BlockedByOwner_ReturnsNull` **Spec SHALL** (following: hidden when blocked).
- [ ] 5.16 `BlockedByViewer_ReturnsNull` **Spec SHALL**.
- [ ] 5.17 `NotBlocked_RendersFollowControls_InitialFollowingFromIsFollowing`.
- [ ] 5.18 `RequireDisclosure_IsNegationOfViewerHasAnyFollows`.

### 5D. FollowDisclosureDialog — `__tests__/FollowDisclosureDialog.test.tsx` (stub `showModal`/`close`, Decision 6)
- [ ] 5.19 `OpenTrue_CallsShowModal_FocusesConfirm`.
- [ ] 5.20 `OpenFalse_CallsClose`.
- [ ] 5.21 `Title_ReadsFollowOwnerName`; `Body_IsDisclosureSentence`.
- [ ] 5.22 `CancelButton_FiresOnCancel`; `FollowButton_FiresOnConfirm`.
- [ ] 5.23 `CancelEvent_PreventedAndRoutesToOnCancel`.
- [ ] 5.24 `CloseEventWhileOpen_RoutesToOnCancel`; `CloseEventWhileClosed_DoesNot`.

### 5E. FollowPrompt — `__tests__/FollowPrompt.test.tsx`
- [ ] 5.25 `WithName_RendersStatusWithName`; `NullName_FallsBackToThisUser`.

### 5F. ProfileHeader — `__tests__/ProfileHeader.test.tsx` (mock `FollowContainer` to stub)
- [ ] 5.26 `HasImage_RendersPriorityImage_FetchPriorityHigh`.
- [ ] 5.27 `NoImage_RendersInitialsFromInitialsOf`.
- [ ] 5.28 `Name_RendersName`; `NullName_RendersUnnamed`.
- [ ] 5.29 `OneList_Singular`; `ZeroOrManyLists_Plural`.
- [ ] 5.30 `OwnProfile_RendersManageConnectionsLink` (`/settings/connections`).
- [ ] 5.31 `NonOwnerShowFollowWithViewer_RendersFollowContainer`.
- [ ] 5.32 `NoFollowConditions_RendersNothingInActions`.

### 5G. PublicListsGrid — `__tests__/PublicListsGrid.test.tsx` (stub `ListCard`, Decision 7)
- [ ] 5.33 `EmptyLists_RendersProfileEmptyMessage`.
- [ ] 5.34 `NonEmpty_RendersListRoleWithListCardPerItem_ShowOwnerFalse`.

### 5H. Avatar — `__tests__/Avatar.test.tsx`
- [ ] 5.35 `HasSrc_RendersImg`.
- [ ] 5.36 `ImgOnError_FallsBackToInitials` (state flip).
- [ ] 5.37 `NoSrcWithName_RendersInitials`; `NoSrcNoName_RendersFaUserFallback`.
- [ ] 5.38 `AriaHidden_AndSizeStyleApplied`.

### 5I. UserCard — `__tests__/UserCard.test.tsx`
- [ ] 5.39 `LinksToUserIdRoute` (`/user/{id}`).
- [ ] 5.40 `Compact_TogglesClassAndAvatarSize`.
- [ ] 5.41 `HasImage_RendersImg`; `NoImage_RendersInitials`.
- [ ] 5.42 `NewCountPositive_RendersBadgeWithAriaLabel`; `NewCountZero_NoBadge`.
- [ ] 5.43 `NonCompactSubLine_NewVsActiveVsNoSharedLists` (per `newCount` + `latestSharedAt`).
- [ ] 5.44 `NullName_RendersUnnamed`.

### 5J. UserCardGrid — `__tests__/UserCardGrid.test.tsx`
- [ ] 5.45 `EmptyUsers_RendersFollowingEmptyWithMessage`.
- [ ] 5.46 `NonEmpty_RendersUserCardPerUser_MapsNewCountAndLatestShared`.
- [ ] 5.47 `MoreCountPositiveAndHref_RendersMoreCard`; `Otherwise_NoMoreCard`.

### 5K. FollowingPage — `__tests__/FollowingPage.test.tsx` (async server component; mock auth, dal, `redirect`, `after`, `@/db`, `next/cache`)
- [ ] 5.48 `NoSessionEmail_RedirectsToRoot`.
- [ ] 5.49 `UnknownUser_RedirectsToRoot` (`getUserIdByEmail` null).
- [ ] 5.50 `HappyPath_RendersListCollectionsNavAndUserCardGrid` fed by `getFollowingFeedUsers(viewer.id)`.
- [ ] 5.51 `AfterCallback_SingleStatementLastSeenWrite_ThenUpdateTag` **Spec SHALL** (following: inline last-seen single-statement write) — captured `after` callback issues exactly one `db.update(users)…where(eq(id, viewerId))` + `updateTag('user_follows')`.
- [ ] 5.52 `AfterCallback_SwallowsError` — thrown DB error is caught/logged, does not reject.

### 5L. page.tsx — `__tests__/page.test.tsx`
- [ ] 5.53 `RendersMainContainerWrappingFollowingPage` (stub `FollowingPage`); `Metadata_TitleFollowing`.

## 6. Four audits (testing-foundation) — dispose of every finding in-place

- [ ] 6.1 **Duplication audit** — `initialsOf` is triplicated (`ProfileHeader.tsx` `'?'`, `UserCard.tsx` `'?'`, `Avatar.tsx` `''`). Disposition: **extract-in-place** to `app/(main)/users/ui/initials.ts` returning `''`; call sites apply `|| '?'` where needed (Decision 8). Add a direct unit test `app/(main)/users/ui/__tests__/initials.test.ts` and a `COVERAGE_FLOOR` entry. Also resolve seed-helper duplication across the two node files per §2.1.
- [ ] 6.2 **Complexity audit** — measure `sonarjs/cognitive-complexity` on the executable carve-out files; all expected ≤ ~8 (heaviest: `blockUser`, `FollowControls`). Confirm under ceiling 15; promote each to `error` (§7.1).
- [ ] 6.3 **Testability audit** — `@/db` static-import swap (Decision 2) + `'use cache'` (Decision 3) + jsdom `<dialog>` (Decision 6) + async server components (Decision 4). Record dispositions; land the `getDb()` fallback only if §2.3 requires it.
- [ ] 6.4 **Assertion-substance audit** — every test names an observable property (row presence/count, `updateTag` call args, DOM attribute/text, callback invocation, optimistic-state flip). No tautologies, no execute-for-coverage, no lone `toBeDefined()`.

## 7. Config + spec-delta application

- [ ] 7.1 `eslint.config.mjs` — append the executable carve-out files to the per-file `sonarjs/cognitive-complexity = error` override `files` array (action, the six DAL functions' file caveat, the ten components, `FollowingPage`, `initials.ts`). Note: `lib/dal.ts` is multi-capability — promote only if the whole file is clean at HEAD; otherwise defer the file-level promotion (record rationale).
- [ ] 7.2 `vitest.config.ts` — add one `thresholds` entry per executable carve-out file referencing `COVERAGE_FLOOR` (components, `FollowingPage.tsx`, `page.tsx`, `initials.ts`). Do NOT add a file-level `lib/dal.ts` entry (multi-capability aggregate — Tier 2 requirement defers it).
- [ ] 7.3 Apply the `following` spec delta: ADD the composite-PK dedup-backstop requirement to `openspec/specs/following/spec.md`.
- [ ] 7.4 Apply the `testing-foundation` Tier 1 delta into the parent accumulator `openspec/changes/test-coverage/specs/testing-foundation/spec.md` (DAL/action pglite-harness requirement). Leave the Tier 2 carve-out lock in this sub-proposal's delta only.
- [ ] 7.5 Re-run `openspec validate test-following --strict`.

## 8. Pre-merge gate

- [ ] 8.1 `npm test` — all new node + jsdom suites pass; per-file coverage meets `COVERAGE_FLOOR` for every enumerated file.
- [ ] 8.2 `npm run lint` — zero errors, zero warnings (carve-out files at `sonarjs/cognitive-complexity = error`).
- [ ] 8.3 `npx tsc --noEmit` — zero errors.
- [ ] 8.4 `npm run build` — succeeds.
