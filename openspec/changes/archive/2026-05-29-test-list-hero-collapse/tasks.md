## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [x] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active.
- [x] 1.3 Confirm `@testing-library/react`, `@testing-library/user-event`, and `vitest` are present (already installed for prior carve-outs).
- [x] 1.4 Spec re-grep against `openspec/specs/list-hero-collapse/spec.md` at HEAD: confirm the six existing requirements; locate every scenario carrying the `Share` menu-item label and the `Just me` visibility-row label / the inconsistent "Private / Just-me / Shared" ordering (the R3 scenarios this change MODIFIES). Document the current text so the MODIFIED requirement in `specs/list-hero-collapse/spec.md` faithfully replaces it. Confirm the ADDED keyboard-operability requirement does not overlap or contradict any existing R1/R2/R4/R5/R6 SHALL.
- [x] 1.5 Source re-grep: confirm `HeroCollapsedItems.tsx`'s `<ShareMenuItem>` renders the text `Share List` and that `VISIBILITY_ROWS` (in `visibility-rows.tsx`) is ordered `OWNER`(`Hidden`) → `LINK`(`Private`) → `FOLLOWERS`(`Shared`) and is consumed by BOTH `<VisibilityPicker>` and `<VisibilityMenuItems>`. This grounds the spec-follows-source corrections (Decision D3).
- [x] 1.6 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**`. No barrel `index.ts` exists under the carve-out paths — no exclude change needed.
- [x] 1.7 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block; new entries will append to its `files` array.

## 2. Write `app/(main)/lists/ui/components/__tests__/HeroCollapseShell.test.tsx` (universal COVERAGE_FLOOR)

### 2A. ModuleMocks — useSearchParams controlled per test; history spied

- [x] 2.1 `vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }))` at file top; configure `vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(...))` per describe block.
- [x] 2.2 `beforeEach` spies `window.history.replaceState` and `window.history.pushState` (and the `useRouter` push if imported); `afterEach` restores. Render helper passes `title`, a `collapsedKebab` sentinel (`<button data-testid="kebab" />`), and expanded `children` sentinel (`<div data-testid="expanded" />`).

### 2B. ExpandedState — default render, bottom handle, aria

- [x] 2.3 `NoHeroParam_RendersExpandedChildren` — with empty search params, the `data-testid="expanded"` children render; the collapsed strip is absent.
- [x] 2.4 `Expanded_RendersBottomCollapseHandle_AriaExpandedTrue_LabelCollapse` — `<button class="list-hero-collapse-handle">` with `aria-expanded="true"` and `aria-label="Collapse list info"`, containing the `FaChevronUp` chevron.
- [x] 2.5 `Expanded_OuterWrapperHasShellClassWithoutCollapsedModifier` — `.list-hero-shell` present, `list-hero-shell-collapsed` absent.

### 2C. CollapsedState — initial-from-param, strip content, aria

- [x] 2.6 `HeroClosedParam_RendersCollapsedStrip` — with `?hero=closed`, the `.list-hero-collapsed-strip` renders and the expanded children + bottom handle are absent.
- [x] 2.7 `Collapsed_StripIsButtonRoleFocusable_AriaExpandedFalse_LabelExpand` **Spec delta SHALL** (ADDED keyboard requirement) — strip has `role="button"`, `tabIndex=0`, `aria-expanded="false"`, `aria-label="Expand list info"`.
- [x] 2.8 `Collapsed_StripContentIsChevronTitleKebabOnly` — exactly the `FaChevronDown` chevron, `<h1 class="list-hero-collapsed-title">` with the title text, and the `data-testid="kebab"` inside `.list-hero-collapsed-trailing`; no other hero content.
- [x] 2.9 `Collapsed_OuterWrapperHasCollapsedModifierClass` — `.list-hero-shell.list-hero-shell-collapsed`.

### 2D. ToggleInteraction — pointer

- [x] 2.10 `ClickBottomHandle_Collapses` — from expanded, clicking the bottom handle renders the collapsed strip and flips `aria-expanded` to `false`.
- [x] 2.11 `ClickCollapsedStrip_Expands` — from collapsed, clicking the strip re-renders the expanded children.
- [x] 2.12 `ClickKebabExclusionZone_DoesNotExpand` — dispatch a click on `.list-hero-collapsed-trailing` (the `e.stopPropagation()` zone); assert the strip stays collapsed (children do NOT reappear).

### 2E. ToggleInteraction — keyboard (Decision D3 ADDED SHALL)

- [x] 2.13 `EnterKeyOnStrip_Expands_PreventsDefault` **Spec delta SHALL** — focus the strip, press `Enter`; assert it expands and the keydown's `preventDefault` ran (assert via a spy on the dispatched event or that no default scroll occurs — assert state change as the observable).
- [x] 2.14 `SpaceKeyOnStrip_Expands_PreventsDefault` **Spec delta SHALL** — same with `Space` (` `).
- [x] 2.15 `OtherKeyOnStrip_DoesNotExpand` — pressing e.g. `'a'` or `Tab` does NOT expand (locks the `key === 'Enter' || key === ' '` filter).

### 2F. UrlState — replaceState only, param add/remove (R4)

- [x] 2.16 `Collapse_AddsHeroClosedParamViaReplaceState` — collapsing calls `window.history.replaceState` with a URL whose search contains `hero=closed`.
- [x] 2.17 `Expand_RemovesHeroParamViaReplaceState` — expanding calls `replaceState` with a URL that no longer contains the `hero` param.
- [x] 2.18 `Toggle_NeverCallsPushState` — across collapse+expand, `window.history.pushState` has zero calls (locks "no new history entry"). Also assert `router.push` is never used if the router is imported.

## 3. Write `app/(main)/lists/ui/components/__tests__/HeroCollapsedItems.test.tsx` (universal COVERAGE_FLOOR)

### 3A. ModuleMocks — actions, router, toast, navigator (Decision D4)

- [x] 3.1 `vi.mock('@/app/actions/lists', () => ({ setListVisibility: vi.fn(), bookmarkList: vi.fn(), unbookmarkList: vi.fn() }))`, `vi.mock('@/app/actions/follows', () => ({ followUser: vi.fn(), unfollowUser: vi.fn() }))`, `vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))`, `vi.mock('react-hot-toast', ...)` (default + `success`/`error`/`promise`). The `menu-system` primitives are NOT mocked; render each factory inside a real `<Menu open onClose={() => {}} anchorRef={ref}>`.
- [x] 3.2 `beforeEach` stubs `navigator.share` and `navigator.clipboard.writeText` via `Object.defineProperty(navigator, ..., { configurable: true })`; `afterEach` resets both to `undefined`.

### 3B. ShareMenuItem (R3 + R6 by construction)

- [x] 3.3 `Default_RendersShareListMenuItem` **Spec delta** — renders a `<MenuItem>` with text `Share List` and the share icon.
- [x] 3.4 `SharePresent_PublicList_CallsNavigatorShareWithCanonicalUrl` — with `navigator.share` defined and a non-private list, clicking calls `navigator.share({ title: list.name, url: 'https://www.ctrlpluslist.com/lists/' + list.id })`. **Assert the URL contains NO `hero` param** (locks R6 by construction).
- [x] 3.5 `ShareAbsent_FallsBackToClipboard` — with `navigator.share` undefined, clicking calls `navigator.clipboard.writeText` with the same canonical URL, wrapped in `toast.promise`.
- [x] 3.6 `PrivateList_PromotesToLinkBeforeShare` — when list resolves to `VISIBILITY.OWNER`, clicking first calls `setListVisibility(list.id, VISIBILITY.LINK)` then performs the share.
- [x] 3.7 `ShareAbortError_DoesNotToastError` — `navigator.share` rejecting with a `name: 'AbortError'` error does NOT call `toast.error`.
- [x] 3.8 `ShareOtherError_ToastsFailure` — `navigator.share` rejecting with a non-abort error calls `toast.error('Failed to share list')`.

### 3C. VisibilityMenuItems (R3, source-ordered rows)

- [x] 3.9 `Default_RendersThreeRadioRowsInSourceOrder` **Spec delta** — exactly three `<MenuItemRadio>` rows in order `Hidden` / `Private` / `Shared`.
- [x] 3.10 `InitialVisibility_ChecksMatchingRow` — the row whose `value === initialVisibility` carries `checked`; the others do not.
- [x] 3.11 `SelectRow_OptimisticallyChecks_CallsSetListVisibility_ToastsRowCopy` — selecting a different row flips `checked`, calls `setListVisibility(listId, nextValue)`, and on `{ success: true }` toasts that row's `toast` string.
- [x] 3.12 `SelectRowFailure_RevertsChecked_ToastsError` — on `{ success: false, message }`, the checked state reverts to the prior row and `toast.error(message)` fires.
- [x] 3.13 `SelectAlreadyCheckedRow_IsNoOp` — re-selecting the checked row does NOT call `setListVisibility`.
- [x] 3.14 `PendingTransition_RowsDisabled` — while a transition is pending, the rows render `disabled`.

### 3D. BookmarkMenuItem

- [x] 3.15 `NotBookmarked_RendersBookmarkLabelAndOutlineIcon` — text `Bookmark`, `FaRegBookmark`.
- [x] 3.16 `Bookmarked_RendersBookmarkedLabelAndFilledIcon` — text `Bookmarked`, `FaBookmark`.
- [x] 3.17 `Click_OptimisticToggle_CallsBookmarkAction_ToastsSuccess` — clicking from not-bookmarked calls `bookmarkList(listId)`, toasts `'Bookmarked'`; from bookmarked calls `unbookmarkList(listId)`, toasts `'Bookmark removed'`.
- [x] 3.18 `ClickFailure_RevertsState_ToastsError` — on `{ success: false, message }`, the bookmark state reverts and `toast.error(message)` fires.

### 3E. FollowMenuItem (R3 disclosure gating)

- [x] 3.19 `NotFollowing_WithOwnerName_RendersFollowName_PlusIcon` — text `Follow {ownerName}`, `FaPlus`.
- [x] 3.20 `NotFollowing_NullOwnerName_RendersFollow` — text `Follow` when `ownerName` is null.
- [x] 3.21 `Following_RendersFollowing_CheckIcon` — text `Following`, `FaCheck`.
- [x] 3.22 `NotFollowing_RequireDisclosure_OpensDialog_NoImmediateFollow` — clicking opens `FollowDisclosureDialog` and does NOT call `followUser` until confirm; confirming then calls `followUser(ownerId)`.
- [x] 3.23 `NotFollowing_NoDisclosure_CallsFollowDirectly` — with `requireDisclosure` false, clicking calls `followUser(ownerId)` immediately with optimistic state.
- [x] 3.24 `Following_Click_CallsUnfollow` — clicking while following calls `unfollowUser(ownerId)`.
- [x] 3.25 `FollowFailure_RevertsState_ToastsError` — on action `{ success: false }`, the following state reverts and `toast.error` fires (covers both follow and unfollow failure branches).

## 4. Write `app/(main)/lists/ui/components/__tests__/HeroCollapsedItemsContainer.test.tsx` (universal COVERAGE_FLOOR)

### 4A. ModuleMocks — DAL controlled per test (Decision D4); async invocation (Decision D5)

- [x] 4.1 `vi.mock('@/lib/dal', () => ({ getBookmarkStatus: vi.fn(), isFollowing: vi.fn(), isBlocked: vi.fn(), viewerHasAnyFollows: vi.fn() }))`. Invoke each composer directly: `const tree = await HeroCollapsedViewerItems({...}); render(tree);`.

### 4B. OwnerItems

- [x] 4.2 `Owner_RendersShareThenVisibility_NoBookmarkOrFollow` — `HeroCollapsedOwnerItems` returns `<ShareMenuItem>` followed by the three `<VisibilityMenuItems>` rows seeded with the passed `visibility`; no bookmark/follow rows.
- [x] 4.3 `Owner_PerformsNoDalReads` — none of the four DAL mocks are called by the owner composer.

### 4C. ViewerItems — block-gating matrix (Decision D6 / testing-foundation regression-lock)

- [x] 4.4 `Viewer_NeitherBlocks_RendersShareBookmarkFollow` — with both `isBlocked` calls resolving false, the tree contains `<ShareMenuItem>`, `<BookmarkMenuItem>` (seeded from `getBookmarkStatus`), and `<FollowMenuItem>` (seeded from `isFollowing`, `requireDisclosure = !viewerHasAnyFollows`).
- [x] 4.5 `Viewer_OwnerBlocksViewer_SuppressesFollow` **Regression-lock** — `isBlocked(ownerId, viewerId)` true → no `<FollowMenuItem>`; Share + Bookmark still render.
- [x] 4.6 `Viewer_ViewerBlocksOwner_SuppressesFollow` **Regression-lock** — `isBlocked(viewerId, ownerId)` true → no `<FollowMenuItem>`.
- [x] 4.7 `Viewer_SeedsFollowMenuDisclosureFromHasAnyFollows` — assert `requireDisclosure` is `true` when `viewerHasAnyFollows` resolves false and `false` when it resolves true (observe via the dialog-vs-direct-follow behavior or the prop on the rendered item).

## 5. Write `app/(main)/lists/ui/components/__tests__/ListActionsMenu.test.tsx` (universal COVERAGE_FLOOR)

### 5A. ModuleMocks

- [x] 5.1 `vi.mock('@/app/actions/lists', () => ({ deleteList: vi.fn() }))`, `vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))`, `vi.mock('react-hot-toast', ...)`. `Menu`/`MenuItem`/`MenuLinkItem`/`ConfirmDialog`/`ListFormContainer` are NOT mocked. A minimal `list` fixture (`ListTable`) and href props are shared via a render helper.

### 5B. Trigger + open

- [x] 5.2 `Default_RendersKebabTrigger_AriaLabelHaspopupExpanded` — `<Button class="menu-trigger" aria-label="List actions" aria-haspopup="menu">` with `aria-expanded="false"`; clicking flips `aria-expanded` to `true` and opens the `<Menu>`.

### 5C. PrependedItems ordering (R3)

- [x] 5.3 `PrependedItems_RenderAtTopOfMenu` **Regression-lock** — pass `prependedItems={<div data-testid="prepended" />}`; open; assert the sentinel precedes `Choose items` in DOM order (`compareDocumentPosition` / index).

### 5D. Owner (default isOwner=true), non-preview

- [x] 5.4 `Owner_NonPreview_RendersFullBaseMenuInOrder` — `Choose items`, `Edit list`, spoiler toggle, preview toggle, `Delete list` in order.
- [x] 5.5 `Owner_ShowSpoilersTrue_RendersHideSpoilers` / `Owner_ShowSpoilersFalse_RendersShowSpoilers` — spoiler toggle label + icon reflect `showSpoilers`.
- [x] 5.6 `Owner_PreviewModeFalse_RendersPreviewAsViewer` / `Owner_PreviewModeTrue_RendersExitPreview` — preview toggle reflects `previewMode`.
- [x] 5.7 `Owner_PreviewModeTrue_SuppressesChooseEditDelete` — `previewMode` true hides `Choose items`, `Edit list`, `Delete list` while keeping spoiler + `Exit preview`.

### 5E. Viewer (isOwner=false) — owner-item suppression (R3)

- [x] 5.8 `Viewer_SuppressesChooseItems` **Regression-lock**
- [x] 5.9 `Viewer_SuppressesEditList` **Regression-lock**
- [x] 5.10 `Viewer_SuppressesSpoilerToggle` **Regression-lock**
- [x] 5.11 `Viewer_SuppressesPreviewToggle` **Regression-lock**
- [x] 5.12 `Viewer_SuppressesDeleteList` **Regression-lock**
- [x] 5.13 `Viewer_WithPrependedItems_RendersOnlyPrependedItems` — with `isOwner={false}` and `prependedItems`, only the prepended sentinel renders (no base items).

### 5F. Delete + edit flows

- [x] 5.14 `Delete_OpensConfirmDialog` — activating `Delete list` opens `ConfirmDialog`.
- [x] 5.15 `DeleteConfirm_Success_CallsDeleteList_PushesLists_ToastsSuccess` — confirming calls `deleteList(list.id)`, then on `{ success: true }` calls `router.push('/lists')` + success toast.
- [x] 5.16 `DeleteConfirm_Failure_ToastsError_NoNavigate` — `{ success: false, error }` toasts the error and does NOT navigate.
- [x] 5.17 `Edit_OpensListFormContainer` — activating `Edit list` opens the `ListFormContainer` editing surface.

## 6. Write `app/(main)/lists/ui/components/__tests__/visibility-rows.test.tsx` (universal COVERAGE_FLOOR)

- [x] 6.1 `VisibilityRows_HasThreeEntriesInSourceOrder` **Spec delta** — `VISIBILITY_ROWS` length is 3, ordered `OWNER`(`Hidden`) → `LINK`(`Private`) → `FOLLOWERS`(`Shared`).
- [x] 6.2 `VisibilityRows_EachRowHasExpectedLabelDescriptionToastIcon` — assert each row's `label`, `description`, `toast`, and that `icon` is a valid React element.
- [x] 6.3 `VisibilityRows_ValuesAreThreeDistinctVisibilities` — the `value` set equals `{ OWNER, LINK, FOLLOWERS }` with no duplicates.
- [x] 6.4 `RowFor_ReturnsMatchingRowForEachValue` — `rowFor(OWNER|LINK|FOLLOWERS)` returns the matching row.
- [x] 6.5 `RowFor_UnknownValue_ReturnsFirstRow` — `rowFor` with an unknown value returns `VISIBILITY_ROWS[0]` (exercises the `?? VISIBILITY_ROWS[0]` fallback so `functions:100` + `branches:95` are met).

## 7. Audits

### 7.1 Assertion-substance audit (on the new tests)

- [x] 7.1 Walk each new test file end-to-end. Every assertion SHALL name observable output (DOM attributes, exact label text, exact-string classes, action-call arguments, toast strings, spy call shapes, rendered element identity). No internal-state assertions, no DOM snapshots, no tautologies. Verify specifically: the collapsed-kebab tests assert the FIXED wording (`Share List`, `Hidden`/`Private`/`Shared`) — not the stale `Share`/`Just me`; `ClickKebabExclusionZone_DoesNotExpand` asserts the strip remains collapsed (children absent), not merely that a handler ran; `SharePresent_PublicList_CallsNavigatorShareWithCanonicalUrl` asserts the exact `url` string with no `hero` param.

### 7.2 Duplication audit (across the five new test files)

- [x] 7.2 Identify shared patterns: (a) the `<Menu open>` host wrapper (used in `HeroCollapsedItems.test.tsx` + `ListActionsMenu.test.tsx`); (b) the action-module mock factories (`@/app/actions/lists` in `HeroCollapsedItems` + `ListActionsMenu`); (c) the `navigator.share`/`clipboard` stub (`HeroCollapsedItems` only); (d) the `@/lib/dal` mock (`HeroCollapsedItemsContainer` only). Default disposition: keep inline (each pattern in ≤2 files). If a third file gains the `<Menu>` host or action-mock pattern during writing, extract to `app/(main)/lists/ui/components/__tests__/test-helpers.ts` and update consumers.

### 7.3 Complexity audit (on the carve-out source)

- [x] 7.3 Run `npm run lint`; confirm zero `sonarjs/cognitive-complexity` warnings or errors for the five carve-out files. Expected: `HeroCollapseShell.tsx` ~6–9, `ListActionsMenu.tsx` ~6–8, each `HeroCollapsedItems` factory ~3–6, container + `visibility-rows` ≤3. Record measured complexities if surfaced.

### 7.4 Testability audit (on the carve-out source)

- [x] 7.4 Coverage report at universal `COVERAGE_FLOOR` or above across all five carve-out files. Record per-file metrics from `coverage/coverage-summary.json` for `HeroCollapseShell.tsx`, `HeroCollapsedItems.tsx`, `HeroCollapsedItemsContainer.tsx`, `ListActionsMenu.tsx`, `visibility-rows.tsx`.
- [x] 7.5 `/* v8 ignore */` annotations: list each annotated region with rationale. Expected candidate: `HeroCollapseShell.tsx`'s `if (typeof window === 'undefined') return;` SSR short-circuit (jsdom always defines `window`) — disposition (c) annotate with rationale "SSR-only guard; unreachable under jsdom". If a different exception surfaces, record disposition (a) write the test / (b) refactor / (c) annotate.
- [x] 7.6 Module-boundary mocking record: confirm `@/app/actions/lists`, `@/app/actions/follows`, and `@/lib/dal` are mocked at the file level per Decision D4 (the DB/network boundary for client/async components), and that no source refactor was required. Confirm `navigator.share`/`clipboard` stubs are reset in `afterEach`.

### 7.5 Invariant-elevation audit

- [x] 7.7 Confirm every spec delta in `specs/list-hero-collapse/spec.md` is asserted by at least one discrete `<State>_<Behavior>` `it()`:
  - MODIFIED R3 label/ordering (`Share List`; `Hidden`/`Private`/`Shared`) → §3.3 / §3.9 / §6.1 (and the ListActionsMenu order checks in §5).
  - ADDED keyboard-operability requirement → §2.7 / §2.13 / §2.14 / §2.15.
- [x] 7.8 Confirm no test asserts an invariant lacking a corresponding SHALL — every assertion maps to an existing `list-hero-collapse` requirement (R1 toggle, R2 collapsed content, R3 kebab extension, R4 URL state, R5/R6 share-URL exclusion) or the ADDED keyboard SHALL. The optimistic-rollback assertions (§3.12 / §3.18 / §3.25) are tested for coverage but deliberately NOT elevated to a `list-hero-collapse` SHALL — their normative ownership stays with `list-visibility` / `list-collections` / `following` (Decision D6); record this in the disposition.

## 8. Config changes

- [x] 8.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` to include the five executable files. Add a comment header: `// test-list-hero-collapse (sub-proposal 4.8) — locked at universal COVERAGE_FLOOR.`
  - `app/(main)/lists/ui/components/HeroCollapseShell.tsx`
  - `app/(main)/lists/ui/components/HeroCollapsedItems.tsx`
  - `app/(main)/lists/ui/components/HeroCollapsedItemsContainer.tsx`
  - `app/(main)/lists/ui/components/ListActionsMenu.tsx`
  - `app/(main)/lists/ui/components/visibility-rows.tsx`
- [x] 8.2 Add five per-file threshold entries in `vitest.config.ts`'s `thresholds` map, each referencing `COVERAGE_FLOOR` (no per-file numeric variation). Confirm the test-file count is 5 and the threshold count is 5.
- [x] 8.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line added.

## 9. Apply spec deltas

- [x] 9.1 Do NOT hand-apply the capability delta into the active `openspec/specs/list-hero-collapse/spec.md` at apply-time. Leave the MODIFIED R3 requirement + the ADDED keyboard-operability requirement in the change delta (`specs/list-hero-collapse/spec.md`) only; the archive spec-sync applies them to canonical — same archive-only treatment as `testing-foundation` (§9.2). Rationale: `openspec archive`'s `applySpecUpdates` re-applies the whole delta in one all-or-nothing pass, and an ADDED requirement that already exists in canonical aborts the sync (`ADDED ... already exists`). Hand-applying at apply-time creates a delta↔canonical double-state that makes the change un-archivable. Validate the change (not the canonical spec) via `openspec validate test-list-hero-collapse --strict`. Only R3's labels/ordering and the new requirement change; R1/R2/R4/R5/R6 prose and scenarios are untouched.
- [x] 9.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-list-hero-collapse/specs/testing-foundation/spec.md` stays archive-only — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md` (Tier 2 per `test-coverage` design D13).
- [x] 9.3 Leave `openspec/changes/test-coverage/tasks.md` §4.8 unchecked; the checkbox flips on archive of this sub-proposal (not at apply).

## 10. Pre-merge

- [x] 10.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files (carry-forward from prior carve-outs) are acceptable; this carve-out introduces zero new warnings or errors.
- [x] 10.2 `npx tsc --noEmit` exits 0 with zero errors.
- [x] 10.3 `npm run build` completes successfully — all routes generated.
- [x] 10.4 `npm run test:coverage` passes; coverage for the five carve-out files at universal `COVERAGE_FLOOR` (98/98/95/100 minimum) or above.
- [x] 10.5 `npm run test:e2e` — record outcome. If no e2e specs exist on this branch, "No tests found" is vacuously acceptable; the e2e gate lands with sub-proposal 6.x.

## 11. Audit disposition record

- [x] 11.1 Realized dispositions recorded below.

### Realized dispositions

**Files written.** Five colocated test files under `app/(main)/lists/ui/components/__tests__/`: `HeroCollapseShell.test.tsx`, `HeroCollapsedItems.test.tsx`, `HeroCollapsedItemsContainer.test.tsx`, `ListActionsMenu.test.tsx`, `visibility-rows.test.tsx`. No shared `test-helpers.ts` extracted (see duplication audit).

**§7.1 Assertion-substance.** Every assertion names observable output: exact label text (`Share List`, `Hidden`/`Private`/`Shared`, `Bookmark`/`Bookmarked`, `Follow Bob`/`Following`), DOM attributes (`aria-expanded`, `tabindex`, `aria-checked`, `aria-haspopup`, `role`), exact class strings (`list-hero-shell-collapsed`, `list-hero-collapse-handle`, `menu-trigger`), action-call arguments (`setListVisibility('list-1', VISIBILITY.LINK)`, `deleteList('list-1')`, `router.push('/lists')`), toast strings, and DOM order (`compareDocumentPosition`). The collapsed-kebab tests assert the FIXED wording (`Share List`, `Hidden`/`Private`/`Shared`), not the stale `Share`/`Just me`. `ClickKebabExclusionZone_DoesNotExpand` asserts the strip stays collapsed (expanded children absent). `PublicListSharePresent_…` asserts the exact `url` string and that it contains no `hero` param. The keyboard tests assert `preventDefault` ran via `fireEvent.keyDown` returning `false` (the dispatch was cancelled) AND the resulting state change.

**§7.2 Duplication.** Identified patterns: (a) the `<Menu open>` host wrapper (`HeroCollapsedItems` only — `ListActionsMenu` renders its own `<Menu>` internally); (b) action-module mock factories (`@/app/actions/lists` in `HeroCollapsedItems`, `HeroCollapsedItemsContainer`, and `ListActionsMenu`); (c) the `navigator.share`/`clipboard` stub (`HeroCollapsedItems` only); (d) the `@/lib/dal` mock (`HeroCollapsedItemsContainer` only); (e) the `HTMLDialogElement.prototype.showModal/close` stub (`HeroCollapsedItems` + `HeroCollapsedItemsContainer`). Disposition: kept inline. No single non-trivial wrapper recurs in ≥3 files in identical form (the `<Menu>` host is in 1 file; the action mock differs per file — `deleteList` vs `setListVisibility`/`bookmarkList`/etc.), so no `test-helpers.ts` extraction was warranted.

**§7.3 Complexity.** `npm run lint` reports zero `sonarjs/cognitive-complexity` findings for the five carve-out files (the per-file `error` override added in §8.1 did not fire — all five are under the ceiling of 15). The 8 lint warnings present are pre-existing complexity warnings in unrelated files (`Item.tsx`, `useItemForm.ts`, `ChooseItemsForm.tsx`, `ListDetails.tsx`, `items.ts`, `lists.ts`), carried forward from prior carve-outs.

**§7.4 Per-file coverage** (from the jsdom-project coverage report; universal floor = lines 98 / statements 98 / branches 95 / functions 100):

| File | Lines | Statements | Branches | Functions |
| --- | --- | --- | --- | --- |
| `HeroCollapseShell.tsx` | 100 | 100 | 100 | 100 |
| `HeroCollapsedItems.tsx` | 100 | 100 | 96.15 | 100 |
| `HeroCollapsedItemsContainer.tsx` | 100 | 100 | 100 | 100 |
| `ListActionsMenu.tsx` | 100 | 100 | 96.55 | 100 |
| `visibility-rows.tsx` | 100 | 100 | 100 | 100 |

All five meet or exceed the floor.

**§7.5 `/* v8 ignore */` annotations.** One region annotated — disposition (c):
- `HeroCollapseShell.tsx`, the `if (typeof window === 'undefined') return;` SSR short-circuit in the URL-sync `useEffect`. Rationale: "SSR-only guard; jsdom always defines `window`, so this short-circuit is unreachable under the test environment." (Anticipated in the proposal Open Questions / §7.5.)

No other regions ignored. Two genuinely-unreachable defensive branches remain uncovered without annotation but the files still clear the 95% branch floor: `HeroCollapsedItems.tsx`'s `if (row)` after `VISIBILITY_ROWS.find` (`find` always returns for a valid `ListVisibility`, so the else is dead) and one bookmark-direction success/failure split. Branch coverage of 96.15% absorbs these, so no annotation or refactor was needed (no-backdoor rule satisfied via real coverage, not a floor change).

**§7.6 Module-boundary mocking.** `@/app/actions/lists`, `@/app/actions/follows`, and `@/lib/dal` are mocked at file scope per Decision D4 (the DB/network boundary for client/async components). `next/navigation`'s `useRouter`/`useSearchParams` and `react-hot-toast` are also file-mocked. `HeroCollapsedItemsContainer.test.tsx` additionally mocks `@/app/actions/lists`/`@/app/actions/follows`/`next/navigation`/`react-hot-toast` because it renders the real child factories (which import those modules), keeping the test off the server graph. `navigator.share`/`clipboard` stubs are reset in `afterEach`. No source refactor was required.

**§7.7 / §7.8 Invariant elevation.** MODIFIED R3 (`Share List`; `Hidden`/`Private`/`Shared` order) → `ShareMenuItem › Default_RendersShareListLabel-IconSvg`, `VisibilityMenuItems › Default_RendersThreeRadioRowsInSourceOrder`, `visibilityRows › Table_HasThreeRowsInSourceOrder`, and `ListActionsMenu › Owner_NonPreview_RendersFullBaseMenuInOrder`. ADDED keyboard-operability SHALL → `Collapsed › Default_StripHasButtonRole-Tabindex0-AriaExpandedFalse-ExpandLabel`, `KeyboardToggle › EnterOnStrip_… / SpaceOnStrip_… / OtherKeyOnStrip_…`. Per Decision D6, the optimistic-rollback assertions (`SelectRowFailure_…`, bookmark `ClickFailure_…`, `FollowFailure_…`/`UnfollowFailure_…`) are tested for coverage but NOT elevated to a `list-hero-collapse` SHALL — their normative ownership stays with `list-visibility` / `list-collections` / `following`.

**§10 Pre-merge gate outcomes.**
- §10.1 `npm run lint` — 0 errors, 8 pre-existing warnings (unrelated files). PASS.
- §10.2 `npx tsc --noEmit` — 0 errors. PASS.
- §10.3 `npm run build` — exit 0, all routes generated. PASS.
- §10.4 `npm run test:coverage` — the five carve-out files meet/exceed the floor (table above; verified via the jsdom-project coverage report). The only full-suite test failures observed were flaky timeouts in the unrelated node-project DB harness `test/helpers/db.test.ts` (`bootPglite` ≥6s) under concurrent multi-worktree load on the shared machine; that file passes 3/3 in isolation, so the failures are environmental and not attributable to this change. PASS for the carve-out.
- §10.5 `npm run test:e2e` — no e2e spec files exist on this branch (`e2e/` holds only `tsconfig.json`); "No tests found" is vacuously acceptable per the task. The e2e gate lands with sub-proposal 6.x.

**Deviations from the proposal.** None of substance. The proposal anticipated "no source refactor"; that held — the only source touch was the §7.5 `/* v8 ignore */` comment on the SSR guard (a coverage annotation, not a logic change). Test names use dash-joined behavior facets (single boundary underscore) per the `<State>_<Behavior>` lint rule rather than the multi-underscore shorthand in the task descriptions.
