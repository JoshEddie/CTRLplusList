## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [ ] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active.
- [ ] 1.3 Confirm `@testing-library/react`, `@testing-library/user-event`, and `vitest` are present (already installed for prior carve-outs).
- [ ] 1.4 Confirm `app/ui/components/__tests__/test-helpers.tsx` exports `MockNextLink` (used by the `app-frame` tests); the four card/nav tests reuse it for `next/link`.
- [ ] 1.5 Spec re-grep against `openspec/specs/list-collections/spec.md` at HEAD: confirm the four existing requirements (R1 peer group, R2 tab strip + active marking, R3 right-side actions, R4 global-nav). Confirm the three NEW requirements (ListCard link/date/placeholder; ListCard conditional bookmark + byline; ListCardRow empty-state + more-affordance + MoreCard label) do not overlap or contradict R1–R4. Confirm R4's global-nav contract is already locked by `test-app-frame`'s `app-frame` spec addition (do NOT re-assert here).
- [ ] 1.6 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block; new entries append to its `files` array.
- [ ] 1.7 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**`. No new exclude line needed (no `index.ts` barrels in the carve-out paths).

## 2. Write `app/ui/components/__tests__/ListCard.test.tsx` (universal COVERAGE_FLOOR)

### 2A. ModuleMocks + fixture

- [ ] 2.1 `vi.mock('next/link', async () => ({ default: (await import('./test-helpers')).MockNextLink }))` at file top.
- [ ] 2.2 Define (or import per §5.2) a `makeList(overrides)` builder producing a valid `ListCardData` with a deterministic fixed `Date`.

### 2B. LinkAndFields — link target, name/title, occasion, date

- [ ] 2.3 `Default_RendersAnchorWithListDetailHref` — root is `<a class="list-card" href="/lists/${id}">`.
- [ ] 2.4 `Default_NameRendersInNameTextSpan_WithTitleAttr` — `.list-card-name-text` text equals the name AND its `title` attribute equals the name.
- [ ] 2.5 `Default_OccasionRendersInOccasionSpan` — `.list-card-occasion` text equals the occasion.
- [ ] 2.6 `Date_RendersInUtcTimeZone_NotLocalDay` **Spec delta SHALL** — Decision 3a. Fixture `date` = `2025-01-01T00:30:00Z`; assert `.list-card-date` renders the UTC day (`Jan 01, 2025`), locking the `timeZone:'UTC'` option independent of runner `TZ`.

### 2C. Subtitle — present vs placeholder (Decision 3a ADDED SHALL)

- [ ] 2.7 `SubtitlePresent_RendersSubtitleDiv_NoPlaceholder` **Spec delta SHALL** — `.list-card-subtitle` renders with text; `.list-card-subtitle-placeholder` absent.
- [ ] 2.8 `SubtitleAbsent_RendersAriaHiddenPlaceholder_NoSubtitle` **Spec delta SHALL** — null subtitle → `.list-card-subtitle-placeholder[aria-hidden]` renders; `.list-card-subtitle` absent.

### 2D. Bookmark indicator (Decision 3b ADDED SHALL)

- [ ] 2.9 `Bookmarked_RendersLabeledIndicatorInsideName` **Spec delta SHALL** — `bookmarked` true → element with `aria-label="Bookmarked"` inside `.list-card-name`.
- [ ] 2.10 `NotBookmarked_NoIndicator` **Spec delta SHALL** — `bookmarked` false/omitted → no `aria-label="Bookmarked"` element.

### 2E. Owner byline gating (Decision 3b ADDED SHALL)

- [ ] 2.11 `ShowOwnerTrueWithName_RendersByline` **Spec delta SHALL** — `showOwner` true + `user.name` set → `.list-card-byline` with the name text.
- [ ] 2.12 `ShowOwnerFalse_NoByline_EvenWithName` **Spec delta SHALL** — `showOwner` false/omitted + name present → no `.list-card-byline`.
- [ ] 2.13 `ShowOwnerTrueButNullUser_NoByline` **Spec delta SHALL** — `showOwner` true + `user` null → no byline.
- [ ] 2.14 `ShowOwnerTrueButNullName_NoByline` **Spec delta SHALL** — `showOwner` true + `user.name` null → no byline.

## 3. Write `app/ui/components/__tests__/ListCardRow.test.tsx` (universal COVERAGE_FLOOR)

### 3A. ModuleMocks + fixture

- [ ] 3.1 `vi.mock('next/link', ...)` → `MockNextLink` (the row renders real `ListCard` + `MoreCard`, both of which use `next/link`).
- [ ] 3.2 Reuse the `makeList(overrides)` builder.

### 3B. EmptyState (Decision 3c ADDED SHALL)

- [ ] 3.3 `EmptyLists_RendersEmptyMessage_NoListRole` **Spec delta SHALL** — empty array → `.list-card-row-empty` with the `emptyMessage`; no `[role="list"]`.

### 3C. ListSemantics — list/listitem, source order, prop threading (Decision 3c ADDED SHALL)

- [ ] 3.4 `NonEmpty_RendersListRoleWithItemsInOrder` **Spec delta SHALL** — `role="list"` with one `role="listitem"` per list in order, each wrapping a `.list-card`.
- [ ] 3.5 `ShowOwner_ThreadsToEachCard` — `showOwner` true + owner names → each card renders its byline.
- [ ] 3.6 `BookmarkedIds_ThreadsToEachCard` — id in the set → that card shows the indicator; id not in the set → no indicator.
- [ ] 3.7 `NoBookmarkedIds_AllCardsUnbookmarked` — absent `bookmarkedIds` → every card defaults to not-bookmarked (the `?? false`).

### 3D. MoreAffordance — dual-condition gate (Decision 3c ADDED SHALL)

- [ ] 3.8 `CountPositiveAndHrefPresent_RendersTrailingMoreCard` **Spec delta SHALL** — `moreCount > 0` + `seeAllHref` → `MoreCard` renders as the LAST `.list-card-row-item`.
- [ ] 3.9 `CountZero_NoMoreCard` **Spec delta SHALL** — `moreCount` 0 + href present → no `MoreCard`.
- [ ] 3.10 `HrefAbsent_NoMoreCard` **Spec delta SHALL** — `moreCount > 0` + href omitted → no `MoreCard`.
- [ ] 3.11 `CountZeroAndHrefAbsent_NoMoreCard` — both falsey → no `MoreCard` (covers the remaining combination).

## 4. Write `app/ui/components/__tests__/MoreCard.test.tsx` (universal COVERAGE_FLOOR)

### 4A. ModuleMocks

- [ ] 4.1 `vi.mock('next/link', ...)` → `MockNextLink`.

### 4B. DomShape + a11y (Decision 3c ADDED SHALL)

- [ ] 4.2 `Default_RendersAnchorWithHrefAndAriaLabel` **Spec delta SHALL** — `<a class="more-card" href="/lists">` with `aria-label="4 more — see all"` (exact template incl. em-dash).
- [ ] 4.3 `Default_VisibleTextIsPlusCountMore` — `.more-card-text` visible text is `+4 more →`.
- [ ] 4.4 `Default_ArrowGlyphIsAriaHidden` **Spec delta SHALL** — the `→` glyph is inside a `<span aria-hidden="true">` so the accessible name comes from the `aria-label`, not the arrow.

## 5. Write `app/ui/components/__tests__/ListCollectionsNav.test.tsx` (universal COVERAGE_FLOOR)

### 5A. ModuleMocks — usePathname controlled per test

- [ ] 5.1 `vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))` + `vi.mock('next/link', ...)` → `MockNextLink`. Configure `vi.mocked(usePathname).mockReturnValue(...)` per describe/it.

### 5B. TabStrip — structure (locks R2 at component level)

- [ ] 5.2 `Default_RendersNavWrapperAndTablist` — root `.list-collections-nav` > `<nav class="list-collections-tabs" aria-label="List collections">`.
- [ ] 5.3 `Default_RendersFourTabsWithHrefsAndLabelsInOrder` — four `<a>` in order: `/lists`→My Lists, `/lists/bookmarks`→Bookmarks, `/lists/history`→Recently visited, `/following`→Following.

### 5C. ActiveMarking — exact-match per route (locks R2 at component level)

- [ ] 5.4 `PathnameLists_MyListsTabActive_OthersInactive` — `/lists` → My Lists has `list-collections-tab--active` + `aria-current="page"`; others plain class, no `aria-current`.
- [ ] 5.5 `PathnameBookmarks_BookmarksTabActive_MyListsInactive` — `/lists/bookmarks` → Bookmarks active; My Lists NOT active (exact match, not prefix).
- [ ] 5.6 `PathnameHistory_RecentlyVisitedTabActive`
- [ ] 5.7 `PathnameFollowing_FollowingTabActive`
- [ ] 5.8 `PathnameNonPeer_NoTabActive` — `/user/abc123` (where `ProfilePage` also renders the nav) → no tab carries the active class or `aria-current` (exact-match negative case).

### 5D. ActionsSlot — children rendering (locks R3 at component level)

- [ ] 5.9 `ChildrenProvided_RendersActionsSlot` — passing children → `.list-collections-actions` renders containing them.
- [ ] 5.10 `NoChildren_NoActionsSlot` — children omitted → no `.list-collections-actions` element (the `{children && ...}` omission).

## 6. Audits

### 6.1 Assertion-substance audit (on the new tests)

- [ ] 6.1 Walk each new test file end-to-end. Every assertion SHALL name observable output (DOM attributes, exact-string classes, accessible names, rendered text content, element presence/absence). No internal-state assertions, no DOM snapshots, no tautologies. Specifically verify: `Date_RendersInUtcTimeZone_NotLocalDay` asserts the EXACT formatted string for a fixed UTC instant (not a regex or partial match) so a dropped `timeZone:'UTC'` option fails it; the byline-gating tests assert ABSENCE (`queryBy... === null`) for the negative cases, not just presence for the positive; the more-affordance tests cover all four `(count, href)` combinations. Record disposition for any flagged test.

### 6.2 Duplication audit (across the new test files + carve-out source)

- [ ] 6.2 Identify shared patterns: (a) `MockNextLink` mock (reused across all four files — already shared via `test-helpers.tsx`, no new duplication); (b) the `makeList(overrides)` fixture builder (used by `ListCard.test.tsx` + `ListCardRow.test.tsx` = 2 files). **Default disposition: extract `makeList` to `app/ui/components/__tests__/test-helpers.tsx`** (centralizes the fixed-`Date` fixture so the two files' UTC-date expectations cannot drift — per Decision 6); if kept inline, record the rationale. Confirm no SOURCE duplication: `ListCardRow` delegates the more-affordance to `MoreCard` (no copy-paste between them).

### 6.3 Complexity audit (on the carve-out source)

- [ ] 6.3 Run `npm run lint` and confirm zero `sonarjs/cognitive-complexity` warnings or errors for any of the four carve-out files. Expected: `ListCardRow.tsx` highest (~4–5: empty branch + `showMore` gate + `.map`), the other three ≤3. Record measured complexities if surfaced.

### 6.4 Testability audit (on the carve-out source)

- [ ] 6.4 Coverage report at universal `COVERAGE_FLOOR` or above across all four carve-out files. Record per-file metrics from `coverage/coverage-summary.json` for `ListCard.tsx`, `ListCardRow.tsx`, `MoreCard.tsx`, `ListCollectionsNav.tsx`.
- [ ] 6.5 `/* v8 ignore */` annotations: list each annotated region with its rationale comment. Expected: none (all four files are fully exercisable in jsdom). If one surfaces, record disposition (a) write the test / (b) refactor / (c) annotate-with-reason.
- [ ] 6.6 Source refactors taken in-place: list each with file + line + rationale. Expected: none (no observed latent quirks). If the assertion-substance audit surfaces one, record it here per the no-backdoor rule.

### 6.5 Invariant-elevation audit

- [ ] 6.7 Confirm every new SHALL in the `list-collections` spec delta is asserted by at least one discrete `<State>_<Behavior>` `it()`:
  - ADDED ListCard link/name/occasion/UTC-date/subtitle-placeholder → §2.3 / §2.4 / §2.5 / §2.6 / §2.7 / §2.8.
  - ADDED ListCard conditional bookmark indicator + owner byline → §2.9 / §2.10 / §2.11 / §2.12 / §2.13 / §2.14.
  - ADDED ListCardRow empty-state + more-affordance + MoreCard label → §3.3 / §3.4 / §3.8 / §3.9 / §3.10 / §3.11 / §4.2 / §4.4.
- [ ] 6.8 Confirm no test asserts an invariant lacking a corresponding SHALL — every assertion maps to either an existing `list-collections` requirement (R2 tab strip + active marking via §5.2–§5.8; R3 actions slot via §5.9–§5.10) or one of the three new ADDED SHALLs. The `ListCollectionsNav` tests do NOT assert R1 (page set), R2's heading clause, or R4 (global nav) — those are page-/app-frame-level (Decision 5).
- [ ] 6.9 **Deferred invariant-elevation finding (R1 page-set drift):** `ProfilePage` (`/user/[id]`) renders `<ListCollectionsNav />`, but `list-collections` R1's exclusion scenario lists `/u/[id]` (stale spelling) as a route that SHALL NOT render the sub-nav. Component behavior is correct (no active tab on a non-peer route — locked by §5.8). Disposition (b): record this as a finding for the owning page capability (a future `test-following` / profile-page carve-out or a dedicated R1 reconciliation); do NOT modify R1 from this component carve-out. See Decision 5.

## 7. Config changes

- [ ] 7.1 Extend the per-file `sonarjs/cognitive-complexity = error` override `files` array in `eslint.config.mjs` to include the four carve-out files, with a comment header: `// test-list-collections (sub-proposal 4.6) — locked at universal COVERAGE_FLOOR.`
  - `app/ui/components/ListCard.tsx`
  - `app/ui/components/ListCardRow.tsx`
  - `app/ui/components/MoreCard.tsx`
  - `app/ui/components/ListCollectionsNav.tsx`
- [ ] 7.2 Add four per-file threshold entries in `vitest.config.ts`'s `thresholds` map, each referencing `COVERAGE_FLOOR`. Confirm the test file count is 4 and the threshold count is 4 (one per source file).
- [ ] 7.3 Confirm `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line added.

## 8. Apply spec deltas

- [ ] 8.1 Apply the three ADDED Requirements from `specs/list-collections/spec.md` into the active `openspec/specs/list-collections/spec.md`. Validate via `openspec validate list-collections --strict`. No existing R1–R4 prose body or scenario is modified.
- [ ] 8.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-list-collections/specs/testing-foundation/spec.md` stays archive-only — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`. Per `test-coverage` design D13 two-tier rollup, this carve-out's `testing-foundation` delta is Tier 2 (archive-only).
- [ ] 8.3 Leave `openspec/changes/test-coverage/tasks.md` §4.6 checkbox unchecked; it flips on archive of this sub-proposal (not at apply).

## 9. Pre-merge

- [ ] 9.1 `npm run lint` passes with zero errors. Pre-existing warnings in unrelated files (the carry-forward set from prior carve-outs) are acceptable; this carve-out introduces zero new warnings or errors.
- [ ] 9.2 `npx tsc --noEmit` exits 0 with zero errors.
- [ ] 9.3 `npm run build` completes successfully — all routes generated.
- [ ] 9.4 `npm run test:coverage` passes; coverage report for the four carve-out files at universal `COVERAGE_FLOOR` (98/98/95/100 minimum) or above.
- [ ] 9.5 `npm run test:e2e` — record outcome. If no e2e specs exist on this branch, "No tests found" is vacuously acceptable. The e2e gate is not blocked by this carve-out; it lands with sub-proposal 6.x.
