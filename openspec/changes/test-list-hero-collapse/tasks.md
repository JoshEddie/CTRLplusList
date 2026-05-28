## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [ ] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active.
- [ ] 1.3 Confirm `@testing-library/react`, `@testing-library/user-event`, and `vitest` are present (already installed for prior carve-outs).
- [ ] 1.4 Spec re-grep against `openspec/specs/list-hero-collapse/spec.md` at HEAD: confirm the six existing requirements; locate every scenario carrying the `Share` menu-item label and the `Just me` visibility-row label / the inconsistent "Private / Just-me / Shared" ordering (the R3 scenarios this change MODIFIES). Document the current text so the MODIFIED requirement in `specs/list-hero-collapse/spec.md` faithfully replaces it. Confirm the ADDED keyboard-operability requirement does not overlap or contradict any existing R1/R2/R4/R5/R6 SHALL.
- [ ] 1.5 Source re-grep: confirm `HeroCollapsedItems.tsx`'s `<ShareMenuItem>` renders the text `Share List` and that `VISIBILITY_ROWS` (in `visibility-rows.tsx`) is ordered `OWNER`(`Hidden`) → `LINK`(`Private`) → `FOLLOWERS`(`Shared`) and is consumed by BOTH `<VisibilityPicker>` and `<VisibilityMenuItems>`. This grounds the spec-follows-source corrections (Decision D3).
- [ ] 1.6 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**`. No barrel `index.ts` exists under the carve-out paths — no exclude change needed.
- [ ] 1.7 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block; new entries will append to its `files` array.

## 2. Write `app/(main)/lists/ui/components/__tests__/HeroCollapseShell.test.tsx` (universal COVERAGE_FLOOR)

### 2A. ModuleMocks — useSearchParams controlled per test; history spied

- [ ] 2.1 `vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }))` at file top; configure `vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(...))` per describe block.
- [ ] 2.2 `beforeEach` spies `window.history.replaceState` and `window.history.pushState` (and the `useRouter` push if imported); `afterEach` restores. Render helper passes `title`, a `collapsedKebab` sentinel (`<button data-testid="kebab" />`), and expanded `children` sentinel (`<div data-testid="expanded" />`).

### 2B. ExpandedState — default render, bottom handle, aria

- [ ] 2.3 `NoHeroParam_RendersExpandedChildren` — with empty search params, the `data-testid="expanded"` children render; the collapsed strip is absent.
- [ ] 2.4 `Expanded_RendersBottomCollapseHandle_AriaExpandedTrue_LabelCollapse` — `<button class="list-hero-collapse-handle">` with `aria-expanded="true"` and `aria-label="Collapse list info"`, containing the `FaChevronUp` chevron.
- [ ] 2.5 `Expanded_OuterWrapperHasShellClassWithoutCollapsedModifier` — `.list-hero-shell` present, `list-hero-shell-collapsed` absent.

### 2C. CollapsedState — initial-from-param, strip content, aria

- [ ] 2.6 `HeroClosedParam_RendersCollapsedStrip` — with `?hero=closed`, the `.list-hero-collapsed-strip` renders and the expanded children + bottom handle are absent.
- [ ] 2.7 `Collapsed_StripIsButtonRoleFocusable_AriaExpandedFalse_LabelExpand` **Spec delta SHALL** (ADDED keyboard requirement) — strip has `role="button"`, `tabIndex=0`, `aria-expanded="false"`, `aria-label="Expand list info"`.
- [ ] 2.8 `Collapsed_StripContentIsChevronTitleKebabOnly` — exactly the `FaChevronDown` chevron, `<h1 class="list-hero-collapsed-title">` with the title text, and the `data-testid="kebab"` inside `.list-hero-collapsed-trailing`; no other hero content.
- [ ] 2.9 `Collapsed_OuterWrapperHasCollapsedModifierClass` — `.list-hero-shell.list-hero-shell-collapsed`.

### 2D. ToggleInteraction — pointer

- [ ] 2.10 `ClickBottomHandle_Collapses` — from expanded, clicking the bottom handle renders the collapsed strip and flips `aria-expanded` to `false`.
- [ ] 2.11 `ClickCollapsedStrip_Expands` — from collapsed, clicking the strip re-renders the expanded children.
- [ ] 2.12 `ClickKebabExclusionZone_DoesNotExpand` — dispatch a click on `.list-hero-collapsed-trailing` (the `e.stopPropagation()` zone); assert the strip stays collapsed (children do NOT reappear).

### 2E. ToggleInteraction — keyboard (Decision D3 ADDED SHALL)

- [ ] 2.13 `EnterKeyOnStrip_Expands_PreventsDefault` **Spec delta SHALL** — focus the strip, press `Enter`; assert it expands and the keydown's `preventDefault` ran (assert via a spy on the dispatched event or that no default scroll occurs — assert state change as the observable).
- [ ] 2.14 `SpaceKeyOnStrip_Expands_PreventsDefault` **Spec delta SHALL** — same with `Space` (` `).
- [ ] 2.15 `OtherKeyOnStrip_DoesNotExpand` — pressing e.g. `'a'` or `Tab` does NOT expand (locks the `key === 'Enter' || key === ' '` filter).

### 2F. UrlState — replaceState only, param add/remove (R4)

- [ ] 2.16 `Collapse_AddsHeroClosedParamViaReplaceState` — collapsing calls `window.history.replaceState` with a URL whose search contains `hero=closed`.
- [ ] 2.17 `Expand_RemovesHeroParamViaReplaceState` — expanding calls `replaceState` with a URL that no longer contains the `hero` param.
- [ ] 2.18 `Toggle_NeverCallsPushState` — across collapse+expand, `window.history.pushState` has zero calls (locks "no new history entry"). Also assert `router.push` is never used if the router is imported.

## 3. Write `app/(main)/lists/ui/components/__tests__/HeroCollapsedItems.test.tsx` (universal COVERAGE_FLOOR)

### 3A. ModuleMocks — actions, router, toast, navigator (Decision D4)

- [ ] 3.1 `vi.mock('@/app/actions/lists', () => ({ setListVisibility: vi.fn(), bookmarkList: vi.fn(), unbookmarkList: vi.fn() }))`, `vi.mock('@/app/actions/follows', () => ({ followUser: vi.fn(), unfollowUser: vi.fn() }))`, `vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))`, `vi.mock('react-hot-toast', ...)` (default + `success`/`error`/`promise`). The `menu-system` primitives are NOT mocked; render each factory inside a real `<Menu open onClose={() => {}} anchorRef={ref}>`.
- [ ] 3.2 `beforeEach` stubs `navigator.share` and `navigator.clipboard.writeText` via `Object.defineProperty(navigator, ..., { configurable: true })`; `afterEach` resets both to `undefined`.

### 3B. ShareMenuItem (R3 + R6 by construction)

- [ ] 3.3 `Default_RendersShareListMenuItem` **Spec delta** — renders a `<MenuItem>` with text `Share List` and the share icon.
- [ ] 3.4 `SharePresent_PublicList_CallsNavigatorShareWithCanonicalUrl` — with `navigator.share` defined and a non-private list, clicking calls `navigator.share({ title: list.name, url: 'https://www.ctrlpluslist.com/lists/' + list.id })`. **Assert the URL contains NO `hero` param** (locks R6 by construction).
- [ ] 3.5 `ShareAbsent_FallsBackToClipboard` — with `navigator.share` undefined, clicking calls `navigator.clipboard.writeText` with the same canonical URL, wrapped in `toast.promise`.
- [ ] 3.6 `PrivateList_PromotesToLinkBeforeShare` — when list resolves to `VISIBILITY.OWNER`, clicking first calls `setListVisibility(list.id, VISIBILITY.LINK)` then performs the share.
- [ ] 3.7 `ShareAbortError_DoesNotToastError` — `navigator.share` rejecting with a `name: 'AbortError'` error does NOT call `toast.error`.
- [ ] 3.8 `ShareOtherError_ToastsFailure` — `navigator.share` rejecting with a non-abort error calls `toast.error('Failed to share list')`.

### 3C. VisibilityMenuItems (R3, source-ordered rows)

- [ ] 3.9 `Default_RendersThreeRadioRowsInSourceOrder` **Spec delta** — exactly three `<MenuItemRadio>` rows in order `Hidden` / `Private` / `Shared`.
- [ ] 3.10 `InitialVisibility_ChecksMatchingRow` — the row whose `value === initialVisibility` carries `checked`; the others do not.
- [ ] 3.11 `SelectRow_OptimisticallyChecks_CallsSetListVisibility_ToastsRowCopy` — selecting a different row flips `checked`, calls `setListVisibility(listId, nextValue)`, and on `{ success: true }` toasts that row's `toast` string.
- [ ] 3.12 `SelectRowFailure_RevertsChecked_ToastsError` — on `{ success: false, message }`, the checked state reverts to the prior row and `toast.error(message)` fires.
- [ ] 3.13 `SelectAlreadyCheckedRow_IsNoOp` — re-selecting the checked row does NOT call `setListVisibility`.
- [ ] 3.14 `PendingTransition_RowsDisabled` — while a transition is pending, the rows render `disabled`.

### 3D. BookmarkMenuItem

- [ ] 3.15 `NotBookmarked_RendersBookmarkLabelAndOutlineIcon` — text `Bookmark`, `FaRegBookmark`.
- [ ] 3.16 `Bookmarked_RendersBookmarkedLabelAndFilledIcon` — text `Bookmarked`, `FaBookmark`.
- [ ] 3.17 `Click_OptimisticToggle_CallsBookmarkAction_ToastsSuccess` — clicking from not-bookmarked calls `bookmarkList(listId)`, toasts `'Bookmarked'`; from bookmarked calls `unbookmarkList(listId)`, toasts `'Bookmark removed'`.
- [ ] 3.18 `ClickFailure_RevertsState_ToastsError` — on `{ success: false, message }`, the bookmark state reverts and `toast.error(message)` fires.

### 3E. FollowMenuItem (R3 disclosure gating)

- [ ] 3.19 `NotFollowing_WithOwnerName_RendersFollowName_PlusIcon` — text `Follow {ownerName}`, `FaPlus`.
- [ ] 3.20 `NotFollowing_NullOwnerName_RendersFollow` — text `Follow` when `ownerName` is null.
- [ ] 3.21 `Following_RendersFollowing_CheckIcon` — text `Following`, `FaCheck`.
- [ ] 3.22 `NotFollowing_RequireDisclosure_OpensDialog_NoImmediateFollow` — clicking opens `FollowDisclosureDialog` and does NOT call `followUser` until confirm; confirming then calls `followUser(ownerId)`.
- [ ] 3.23 `NotFollowing_NoDisclosure_CallsFollowDirectly` — with `requireDisclosure` false, clicking calls `followUser(ownerId)` immediately with optimistic state.
- [ ] 3.24 `Following_Click_CallsUnfollow` — clicking while following calls `unfollowUser(ownerId)`.
- [ ] 3.25 `FollowFailure_RevertsState_ToastsError` — on action `{ success: false }`, the following state reverts and `toast.error` fires (covers both follow and unfollow failure branches).

## 4. Write `app/(main)/lists/ui/components/__tests__/HeroCollapsedItemsContainer.test.tsx` (universal COVERAGE_FLOOR)

### 4A. ModuleMocks — DAL controlled per test (Decision D4); async invocation (Decision D5)

- [ ] 4.1 `vi.mock('@/lib/dal', () => ({ getBookmarkStatus: vi.fn(), isFollowing: vi.fn(), isBlocked: vi.fn(), viewerHasAnyFollows: vi.fn() }))`. Invoke each composer directly: `const tree = await HeroCollapsedViewerItems({...}); render(tree);`.

### 4B. OwnerItems

- [ ] 4.2 `Owner_RendersShareThenVisibility_NoBookmarkOrFollow` — `HeroCollapsedOwnerItems` returns `<ShareMenuItem>` followed by the three `<VisibilityMenuItems>` rows seeded with the passed `visibility`; no bookmark/follow rows.
- [ ] 4.3 `Owner_PerformsNoDalReads` — none of the four DAL mocks are called by the owner composer.

### 4C. ViewerItems — block-gating matrix (Decision D6 / testing-foundation regression-lock)

- [ ] 4.4 `Viewer_NeitherBlocks_RendersShareBookmarkFollow` — with both `isBlocked` calls resolving false, the tree contains `<ShareMenuItem>`, `<BookmarkMenuItem>` (seeded from `getBookmarkStatus`), and `<FollowMenuItem>` (seeded from `isFollowing`, `requireDisclosure = !viewerHasAnyFollows`).
- [ ] 4.5 `Viewer_OwnerBlocksViewer_SuppressesFollow` **Regression-lock** — `isBlocked(ownerId, viewerId)` true → no `<FollowMenuItem>`; Share + Bookmark still render.
- [ ] 4.6 `Viewer_ViewerBlocksOwner_SuppressesFollow` **Regression-lock** — `isBlocked(viewerId, ownerId)` true → no `<FollowMenuItem>`.
- [ ] 4.7 `Viewer_SeedsFollowMenuDisclosureFromHasAnyFollows` — assert `requireDisclosure` is `true` when `viewerHasAnyFollows` resolves false and `false` when it resolves true (observe via the dialog-vs-direct-follow behavior or the prop on the rendered item).

## 5. Write `app/(main)/lists/ui/components/__tests__/ListActionsMenu.test.tsx` (universal COVERAGE_FLOOR)

### 5A. ModuleMocks

- [ ] 5.1 `vi.mock('@/app/actions/lists', () => ({ deleteList: vi.fn() }))`, `vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))`, `vi.mock('react-hot-toast', ...)`. `Menu`/`MenuItem`/`MenuLinkItem`/`ConfirmDialog`/`ListFormContainer` are NOT mocked. A minimal `list` fixture (`ListTable`) and href props are shared via a render helper.

### 5B. Trigger + open

- [ ] 5.2 `Default_RendersKebabTrigger_AriaLabelHaspopupExpanded` — `<Button class="menu-trigger" aria-label="List actions" aria-haspopup="menu">` with `aria-expanded="false"`; clicking flips `aria-expanded` to `true` and opens the `<Menu>`.

### 5C. PrependedItems ordering (R3)

- [ ] 5.3 `PrependedItems_RenderAtTopOfMenu` **Regression-lock** — pass `prependedItems={<div data-testid="prepended" />}`; open; assert the sentinel precedes `Choose items` in DOM order (`compareDocumentPosition` / index).

### 5D. Owner (default isOwner=true), non-preview

- [ ] 5.4 `Owner_NonPreview_RendersFullBaseMenuInOrder` — `Choose items`, `Edit list`, spoiler toggle, preview toggle, `Delete list` in order.
- [ ] 5.5 `Owner_ShowSpoilersTrue_RendersHideSpoilers` / `Owner_ShowSpoilersFalse_RendersShowSpoilers` — spoiler toggle label + icon reflect `showSpoilers`.
- [ ] 5.6 `Owner_PreviewModeFalse_RendersPreviewAsViewer` / `Owner_PreviewModeTrue_RendersExitPreview` — preview toggle reflects `previewMode`.
- [ ] 5.7 `Owner_PreviewModeTrue_SuppressesChooseEditDelete` — `previewMode` true hides `Choose items`, `Edit list`, `Delete list` while keeping spoiler + `Exit preview`.

### 5E. Viewer (isOwner=false) — owner-item suppression (R3)

- [ ] 5.8 `Viewer_SuppressesChooseItems` **Regression-lock**
- [ ] 5.9 `Viewer_SuppressesEditList` **Regression-lock**
- [ ] 5.10 `Viewer_SuppressesSpoilerToggle` **Regression-lock**
- [ ] 5.11 `Viewer_SuppressesPreviewToggle` **Regression-lock**
- [ ] 5.12 `Viewer_SuppressesDeleteList` **Regression-lock**
- [ ] 5.13 `Viewer_WithPrependedItems_RendersOnlyPrependedItems` — with `isOwner={false}` and `prependedItems`, only the prepended sentinel renders (no base items).

### 5F. Delete + edit flows

- [ ] 5.14 `Delete_OpensConfirmDialog` — activating `Delete list` opens `ConfirmDialog`.
- [ ] 5.15 `DeleteConfirm_Success_CallsDeleteList_PushesLists_ToastsSuccess` — confirming calls `deleteList(list.id)`, then on `{ success: true }` calls `router.push('/lists')` + success toast.
- [ ] 5.16 `DeleteConfirm_Failure_ToastsError_NoNavigate` — `{ success: false, error }` toasts the error and does NOT navigate.
- [ ] 5.17 `Edit_OpensListFormContainer` — activating `Edit list` opens the `ListFormContainer` editing surface.

## 6. Write `app/(main)/lists/ui/components/__tests__/visibility-rows.test.tsx` (universal COVERAGE_FLOOR)

- [ ] 6.1 `VisibilityRows_HasThreeEntriesInSourceOrder` **Spec delta** — `VISIBILITY_ROWS` length is 3, ordered `OWNER`(`Hidden`) → `LINK`(`Private`) → `FOLLOWERS`(`Shared`).
- [ ] 6.2 `VisibilityRows_EachRowHasExpectedLabelDescriptionToastIcon` — assert each row's `label`, `description`, `toast`, and that `icon` is a valid React element.
- [ ] 6.3 `VisibilityRows_ValuesAreThreeDistinctVisibilities` — the `value` set equals `{ OWNER, LINK, FOLLOWERS }` with no duplicates.
- [ ] 6.4 `RowFor_ReturnsMatchingRowForEachValue` — `rowFor(OWNER|LINK|FOLLOWERS)` returns the matching row.
- [ ] 6.5 `RowFor_UnknownValue_ReturnsFirstRow` — `rowFor` with an unknown value returns `VISIBILITY_ROWS[0]` (exercises the `?? VISIBILITY_ROWS[0]` fallback so `functions:100` + `branches:95` are met).

## 7. Audits

### 7.1 Assertion-substance audit (on the new tests)

- [ ] 7.1 Walk each new test file end-to-end. Every assertion SHALL name observable output (DOM attributes, exact label text, exact-string classes, action-call arguments, toast strings, spy call shapes, rendered element identity). No internal-state assertions, no DOM snapshots, no tautologies. Verify specifically: the collapsed-kebab tests assert the FIXED wording (`Share List`, `Hidden`/`Private`/`Shared`) — not the stale `Share`/`Just me`; `ClickKebabExclusionZone_DoesNotExpand` asserts the strip remains collapsed (children absent), not merely that a handler ran; `SharePresent_PublicList_CallsNavigatorShareWithCanonicalUrl` asserts the exact `url` string with no `hero` param.

### 7.2 Duplication audit (across the five new test files)

- [ ] 7.2 Identify shared patterns: (a) the `<Menu open>` host wrapper (used in `HeroCollapsedItems.test.tsx` + `ListActionsMenu.test.tsx`); (b) the action-module mock factories (`@/app/actions/lists` in `HeroCollapsedItems` + `ListActionsMenu`); (c) the `navigator.share`/`clipboard` stub (`HeroCollapsedItems` only); (d) the `@/lib/dal` mock (`HeroCollapsedItemsContainer` only). Default disposition: keep inline (each pattern in ≤2 files). If a third file gains the `<Menu>` host or action-mock pattern during writing, extract to `app/(main)/lists/ui/components/__tests__/test-helpers.ts` and update consumers.

### 7.3 Complexity audit (on the carve-out source)

- [ ] 7.3 Run `npm run lint`; confirm zero `sonarjs/cognitive-complexity` warnings or errors for the five carve-out files. Expected: `HeroCollapseShell.tsx` ~6–9, `ListActionsMenu.tsx` ~6–8, each `HeroCollapsedItems` factory ~3–6, container + `visibility-rows` ≤3. Record measured complexities if surfaced.

### 7.4 Testability audit (on the carve-out source)

- [ ] 7.4 Coverage report at universal `COVERAGE_FLOOR` or above across all five carve-out files. Record per-file metrics from `coverage/coverage-summary.json` for `HeroCollapseShell.tsx`, `HeroCollapsedItems.tsx`, `HeroCollapsedItemsContainer.tsx`, `ListActionsMenu.tsx`, `visibility-rows.tsx`.
- [ ] 7.5 `/* v8 ignore */` annotations: list each annotated region with rationale. Expected candidate: `HeroCollapseShell.tsx`'s `if (typeof window === 'undefined') return;` SSR short-circuit (jsdom always defines `window`) — disposition (c) annotate with rationale "SSR-only guard; unreachable under jsdom". If a different exception surfaces, record disposition (a) write the test / (b) refactor / (c) annotate.
- [ ] 7.6 Module-boundary mocking record: confirm `@/app/actions/lists`, `@/app/actions/follows`, and `@/lib/dal` are mocked at the file level per Decision D4 (the DB/network boundary for client/async components), and that no source refactor was required. Confirm `navigator.share`/`clipboard` stubs are reset in `afterEach`.

### 7.5 Invariant-elevation audit

- [ ] 7.7 Confirm every spec delta in `specs/list-hero-collapse/spec.md` is asserted by at least one discrete `<State>_<Behavior>` `it()`:
  - MODIFIED R3 label/ordering (`Share List`; `Hidden`/`Private`/`Shared`) → §3.3 / §3.9 / §6.1 (and the ListActionsMenu order checks in §5).
  - ADDED keyboard-operability requirement → §2.7 / §2.13 / §2.14 / §2.15.
- [ ] 7.8 Confirm no test asserts an invariant lacking a corresponding SHALL — every assertion maps to an existing `list-hero-collapse` requirement (R1 toggle, R2 collapsed content, R3 kebab extension, R4 URL state, R5/R6 share-URL exclusion) or the ADDED keyboard SHALL. The optimistic-rollback assertions (§3.12 / §3.18 / §3.25) are tested for coverage but deliberately NOT elevated to a `list-hero-collapse` SHALL — their normative ownership stays with `list-visibility` / `list-collections` / `following` (Decision D6); record this in the disposition.

## 8. Config changes

- [ ] 8.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` to include the five executable files. Add a comment header: `// test-list-hero-collapse (sub-proposal 4.8) — locked at universal COVERAGE_FLOOR.`
  - `app/(main)/lists/ui/components/HeroCollapseShell.tsx`
  - `app/(main)/lists/ui/components/HeroCollapsedItems.tsx`
  - `app/(main)/lists/ui/components/HeroCollapsedItemsContainer.tsx`
  - `app/(main)/lists/ui/components/ListActionsMenu.tsx`
  - `app/(main)/lists/ui/components/visibility-rows.tsx`
- [ ] 8.2 Add five per-file threshold entries in `vitest.config.ts`'s `thresholds` map, each referencing `COVERAGE_FLOOR` (no per-file numeric variation). Confirm the test-file count is 5 and the threshold count is 5.
- [ ] 8.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line added.

## 9. Apply spec deltas

- [ ] 9.1 Apply the MODIFIED R3 requirement + the ADDED keyboard-operability requirement from `specs/list-hero-collapse/spec.md` into the active `openspec/specs/list-hero-collapse/spec.md`. Validate via `openspec validate list-hero-collapse --strict`. Only R3's labels/ordering and the new requirement change; R1/R2/R4/R5/R6 prose and scenarios are untouched.
- [ ] 9.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-list-hero-collapse/specs/testing-foundation/spec.md` stays archive-only — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md` (Tier 2 per `test-coverage` design D13).
- [ ] 9.3 Leave `openspec/changes/test-coverage/tasks.md` §4.8 unchecked; the checkbox flips on archive of this sub-proposal (not at apply).

## 10. Pre-merge

- [ ] 10.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files (carry-forward from prior carve-outs) are acceptable; this carve-out introduces zero new warnings or errors.
- [ ] 10.2 `npx tsc --noEmit` exits 0 with zero errors.
- [ ] 10.3 `npm run build` completes successfully — all routes generated.
- [ ] 10.4 `npm run test:coverage` passes; coverage for the five carve-out files at universal `COVERAGE_FLOOR` (98/98/95/100 minimum) or above.
- [ ] 10.5 `npm run test:e2e` — record outcome. If no e2e specs exist on this branch, "No tests found" is vacuously acceptable; the e2e gate lands with sub-proposal 6.x.

## 11. Audit disposition record

- [ ] 11.1 After implementation, fill in this section with the realized dispositions for §7.1–§7.8 (assertion-substance, duplication, complexity with measured values, per-file coverage metrics, `/* v8 ignore */` annotations with rationale, any in-place source refactors, the Decision D6 non-elevation note), plus the §10 pre-merge gate outcomes and any deviations from this proposal discovered during writing.
