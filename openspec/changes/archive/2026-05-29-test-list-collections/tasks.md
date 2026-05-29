## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach`.
- [x] 1.2 Verify the jsdom project resolves `@/` and the `react()` plugin is active.
- [x] 1.3 Confirm `@testing-library/react`, `@testing-library/user-event`, and `vitest` are present (already installed for prior carve-outs).
- [x] 1.4 Confirm `app/ui/components/__tests__/test-helpers.tsx` exports `MockNextLink` (used by the `app-frame` tests); the four card/nav tests reuse it for `next/link`.
- [x] 1.5 Spec re-grep against `openspec/specs/list-collections/spec.md` at HEAD: confirm the four existing requirements (R1 peer group, R2 tab strip + active marking, R3 right-side actions, R4 global-nav). Confirm the three NEW requirements (ListCard link/date/placeholder; ListCard conditional bookmark + byline; ListCardRow empty-state + more-affordance + MoreCard label) do not overlap or contradict R1–R4. Confirm R4's global-nav contract is already locked by `test-app-frame`'s `app-frame` spec addition (do NOT re-assert here).
- [x] 1.6 Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block; new entries append to its `files` array.
- [x] 1.7 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**`. No new exclude line needed (no `index.ts` barrels in the carve-out paths).

## 2. Write `app/ui/components/__tests__/ListCard.test.tsx` (universal COVERAGE_FLOOR)

### 2A. ModuleMocks + fixture

- [x] 2.1 `vi.mock('next/link', async () => ({ default: (await import('./test-helpers')).MockNextLink }))` at file top.
- [x] 2.2 Define (or import per §5.2) a `makeList(overrides)` builder producing a valid `ListCardData` with a deterministic fixed `Date`. — Extracted to `test-helpers.tsx` per Decision 6 (see §6.2).

### 2B. LinkAndFields — link target, name/title, occasion, date

- [x] 2.3 `Default_RendersAnchorWithListDetailHref` — root is `<a class="list-card" href="/lists/${id}">`.
- [x] 2.4 `Default_NameRendersInNameTextSpan-WithTitleAttr` — `.list-card-name-text` text equals the name AND its `title` attribute equals the name. (Title dash-joins the two facets per the `<State>_<Behavior>-<Behavior>` lint shape.)
- [x] 2.5 `Default_OccasionRendersInOccasionSpan` — `.list-card-occasion` text equals the occasion.
- [x] 2.6 `Date_RendersInUtcTimeZone-NotLocalDay` **Spec delta SHALL** — Decision 3a. Fixture `date` = `2025-01-01T00:30:00Z`; assert `.list-card-date` renders the UTC day (`Jan 01, 2025`), locking the `timeZone:'UTC'` option independent of runner `TZ`.

### 2C. Subtitle — present vs placeholder (Decision 3a ADDED SHALL)

- [x] 2.7 `SubtitlePresent_RendersSubtitleDiv-NoPlaceholder` **Spec delta SHALL** — `.list-card-subtitle` renders with text; `.list-card-subtitle-placeholder` absent.
- [x] 2.8 `SubtitleAbsent_RendersAriaHiddenPlaceholder-NoSubtitle` **Spec delta SHALL** — null subtitle → `.list-card-subtitle-placeholder[aria-hidden]` renders; `.list-card-subtitle` absent.

### 2D. Bookmark indicator (Decision 3b ADDED SHALL)

- [x] 2.9 `Bookmarked_RendersLabeledIndicatorInsideName` **Spec delta SHALL** — `bookmarked` true → element with `aria-label="Bookmarked"` inside `.list-card-name`.
- [x] 2.10 `NotBookmarked_NoIndicator` **Spec delta SHALL** — `bookmarked` false/omitted → no `aria-label="Bookmarked"` element.

### 2E. Owner byline gating (Decision 3b ADDED SHALL)

- [x] 2.11 `ShowOwnerTrueWithName_RendersByline` **Spec delta SHALL** — `showOwner` true + `user.name` set → `.list-card-byline` with the name text.
- [x] 2.12 `ShowOwnerFalse_NoByline-EvenWithName` **Spec delta SHALL** — `showOwner` false/omitted + name present → no `.list-card-byline`.
- [x] 2.13 `ShowOwnerTrueButNullUser_NoByline` **Spec delta SHALL** — `showOwner` true + `user` null → no byline.
- [x] 2.14 `ShowOwnerTrueButNullName_NoByline` **Spec delta SHALL** — `showOwner` true + `user.name` null → no byline.

## 3. Write `app/ui/components/__tests__/ListCardRow.test.tsx` (universal COVERAGE_FLOOR)

### 3A. ModuleMocks + fixture

- [x] 3.1 `vi.mock('next/link', ...)` → `MockNextLink` (the row renders real `ListCard` + `MoreCard`, both of which use `next/link`).
- [x] 3.2 Reuse the `makeList(overrides)` builder.

### 3B. EmptyState (Decision 3c ADDED SHALL)

- [x] 3.3 `EmptyLists_RendersEmptyMessage-NoListRole` **Spec delta SHALL** — empty array → `.list-card-row-empty` with the `emptyMessage`; no `[role="list"]`.

### 3C. ListSemantics — list/listitem, source order, prop threading (Decision 3c ADDED SHALL)

- [x] 3.4 `NonEmpty_RendersListRoleWithItemsInOrder` **Spec delta SHALL** — `role="list"` with one `role="listitem"` per list in order, each wrapping a `.list-card`.
- [x] 3.5 `ShowOwner_ThreadsToEachCard` — `showOwner` true + owner names → each card renders its byline.
- [x] 3.6 `BookmarkedIds_ThreadsToEachCard` — id in the set → that card shows the indicator; id not in the set → no indicator.
- [x] 3.7 `NoBookmarkedIds_AllCardsUnbookmarked` — absent `bookmarkedIds` → every card defaults to not-bookmarked (the `?? false`).

### 3D. MoreAffordance — dual-condition gate (Decision 3c ADDED SHALL)

- [x] 3.8 `CountPositiveAndHrefPresent_RendersTrailingMoreCard` **Spec delta SHALL** — `moreCount > 0` + `seeAllHref` → `MoreCard` renders as the LAST `.list-card-row-item`.
- [x] 3.9 `CountZero_NoMoreCard` **Spec delta SHALL** — `moreCount` 0 + href present → no `MoreCard`.
- [x] 3.10 `HrefAbsent_NoMoreCard` **Spec delta SHALL** — `moreCount > 0` + href omitted → no `MoreCard`.
- [x] 3.11 `CountZeroAndHrefAbsent_NoMoreCard` — both falsey → no `MoreCard` (covers the remaining combination).

## 4. Write `app/ui/components/__tests__/MoreCard.test.tsx` (universal COVERAGE_FLOOR)

### 4A. ModuleMocks

- [x] 4.1 `vi.mock('next/link', ...)` → `MockNextLink`.

### 4B. DomShape + a11y (Decision 3c ADDED SHALL)

- [x] 4.2 `Default_RendersAnchorWithHrefAndAriaLabel` **Spec delta SHALL** — `<a class="more-card" href="/lists">` with `aria-label="4 more — see all"` (exact template incl. em-dash).
- [x] 4.3 `Default_VisibleTextIsPlusCountMore` — `.more-card-text` visible text is `+4 more →`.
- [x] 4.4 `Default_ArrowGlyphIsAriaHidden` **Spec delta SHALL** — the `→` glyph is inside a `<span aria-hidden="true">` so the accessible name comes from the `aria-label`, not the arrow.

## 5. Write `app/ui/components/__tests__/ListCollectionsNav.test.tsx` (universal COVERAGE_FLOOR)

### 5A. ModuleMocks — usePathname controlled per test

- [x] 5.1 `vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))` + `vi.mock('next/link', ...)` → `MockNextLink`. Configure `vi.mocked(usePathname).mockReturnValue(...)` per describe/it.

### 5B. TabStrip — structure (locks R2 at component level)

- [x] 5.2 `Default_RendersNavWrapperAndTablist` — root `.list-collections-nav` > `<nav class="list-collections-tabs" aria-label="List collections">`.
- [x] 5.3 `Default_RendersFourTabsWithHrefsAndLabelsInOrder` — four `<a>` in order: `/lists`→My Lists, `/lists/bookmarks`→Bookmarks, `/lists/history`→Recently visited, `/following`→Following.

### 5C. ActiveMarking — exact-match per route (locks R2 at component level)

- [x] 5.4 `PathnameLists_MyListsTabActive-OthersInactive` — `/lists` → My Lists has `list-collections-tab--active` + `aria-current="page"`; others plain class, no `aria-current`.
- [x] 5.5 `PathnameBookmarks_BookmarksTabActive-MyListsInactive` — `/lists/bookmarks` → Bookmarks active; My Lists NOT active (exact match, not prefix).
- [x] 5.6 `PathnameHistory_RecentlyVisitedTabActive`
- [x] 5.7 `PathnameFollowing_FollowingTabActive`
- [x] 5.8 `PathnameNonPeer_NoTabActive` — `/user/abc123` (where `ProfilePage` also renders the nav) → no tab carries the active class or `aria-current` (exact-match negative case).

### 5D. ActionsSlot — children rendering (locks R3 at component level)

- [x] 5.9 `ChildrenProvided_RendersActionsSlot` — passing children → `.list-collections-actions` renders containing them.
- [x] 5.10 `NoChildren_NoActionsSlot` — children omitted → no `.list-collections-actions` element (the `{children && ...}` omission).

## 6. Audits

### 6.1 Assertion-substance audit (on the new tests)

- [x] 6.1 Walked all four files end-to-end. **PASS** — every assertion names observable output (DOM attribute, exact class string, accessible name, rendered text, element presence/absence). No internal-state assertions, no DOM snapshots, no tautologies. Confirmed specifics: `Date_RendersInUtcTimeZone-NotLocalDay` asserts the exact string `Jan 01, 2025` for the fixed `2025-01-01T00:30:00Z` instant (no regex/partial match — a dropped `timeZone:'UTC'` option flips it to `Dec 31, 2024` in any zone west of UTC and fails); the byline-gating negatives (§2.12–§2.14) assert `toBeNull()` absence, not just presence for the positive (§2.11); the more-affordance tests cover all four `(count, href)` combinations (§3.8 both-present, §3.9 count-0, §3.10 href-absent, §3.11 both-falsey). No test flagged.

### 6.2 Duplication audit (across the new test files + carve-out source)

- [x] 6.2 (a) `MockNextLink` reused across all four files via the existing shared `test-helpers.tsx` — no new duplication. (b) `makeList(overrides)` fixture used by `ListCard.test.tsx` + `ListCardRow.test.tsx` (2 files): **extracted to `app/ui/components/__tests__/test-helpers.tsx`** per Decision 6 default disposition — centralizes the fixed `Date` so the two files' UTC-date expectations cannot drift. No SOURCE duplication: `ListCardRow` delegates the "+N more" affordance to `MoreCard` (composition, not copy-paste); `MoreCard.test.tsx` and `ListCard.test.tsx` independently pin their own contracts.

### 6.3 Complexity audit (on the carve-out source)

- [x] 6.3 `npm run lint` reports zero `sonarjs/cognitive-complexity` warnings or errors for any of the four carve-out files (now at `error` level). All four are well under the ceiling of 15 — `ListCardRow.tsx` is the highest (empty branch + `showMore` gate + `.map`), the other three are flat presentational renders. No surfaced complexity number above threshold.

### 6.4 Testability audit (on the carve-out source)

- [x] 6.4 Coverage report at or above the universal `COVERAGE_FLOOR` across all four files. Measured from `coverage/coverage-summary.json`: `ListCard.tsx`, `ListCardRow.tsx`, `MoreCard.tsx`, `ListCollectionsNav.tsx` each at **lines 100 / statements 100 / branches 100 / functions 100** (floor is 98 / 98 / 95 / 100). `npm run test:coverage` exits 0.
- [x] 6.5 `/* v8 ignore */` annotations: **none** — all four files are fully exercisable in jsdom (confirmed by 100% across every metric). No annotated regions.
- [x] 6.6 Source refactors taken in-place: **none** — no latent class-string or correctness quirks surfaced by the assertion-substance audit. The four files were testable as-shipped.

### 6.5 Invariant-elevation audit

- [x] 6.7 Every new SHALL in the `list-collections` spec delta is asserted by at least one discrete `<State>_<Behavior>` `it()`:
  - ADDED ListCard link/name/occasion/UTC-date/subtitle-placeholder → §2.3 / §2.4 / §2.5 / §2.6 / §2.7 / §2.8.
  - ADDED ListCard conditional bookmark indicator + owner byline → §2.9 / §2.10 / §2.11 / §2.12 / §2.13 / §2.14.
  - ADDED ListCardRow empty-state + more-affordance + MoreCard label → §3.3 / §3.4 / §3.8 / §3.9 / §3.10 / §3.11 / §4.2 / §4.4.
- [x] 6.8 No test asserts an invariant lacking a corresponding SHALL — every assertion maps to either an existing `list-collections` requirement (R2 tab strip + active marking via §5.2–§5.8; R3 actions slot via §5.9–§5.10) or one of the three new ADDED SHALLs. The `ListCollectionsNav` tests do NOT assert R1 (page set), R2's heading clause, or R4 (global nav) — those are page-/app-frame-level (Decision 5).
- [x] 6.9 **Deferred invariant-elevation finding (R1 page-set drift):** `ProfilePage` (`/user/[id]`) renders `<ListCollectionsNav />`, but `list-collections` R1's exclusion scenario lists `/u/[id]` (stale spelling) as a route that SHALL NOT render the sub-nav. Component behavior is correct (no active tab on a non-peer route — locked by §5.8 `PathnameNonPeer_NoTabActive`). Disposition (b): recorded here as a finding for the owning page capability (a future `test-following` / profile-page carve-out or a dedicated R1 reconciliation); R1 is NOT modified from this component carve-out. See Decision 5.

## 7. Config changes

- [x] 7.1 Extended the per-file `sonarjs/cognitive-complexity = error` override `files` array in `eslint.config.mjs` to include the four carve-out files, under the comment header `// test-list-collections (sub-proposal 4.6) — locked at universal COVERAGE_FLOOR.`
  - `app/ui/components/ListCard.tsx`
  - `app/ui/components/ListCardRow.tsx`
  - `app/ui/components/MoreCard.tsx`
  - `app/ui/components/ListCollectionsNav.tsx`
- [x] 7.2 Added four per-file threshold entries in `vitest.config.ts`'s `thresholds` map, each referencing `COVERAGE_FLOOR`. Test file count = 4, threshold count = 4 (one per source file).
- [x] 7.3 Confirmed `vitest.config.ts`'s `coverage.exclude` already covers `**/__tests__/**`. No new exclude line added.

## 8. Apply spec deltas

- [x] 8.1 Applied the three ADDED Requirements from `specs/list-collections/spec.md` into the active `openspec/specs/list-collections/spec.md`. Validated via `openspec validate list-collections --strict` (valid). No existing R1–R4 prose body or scenario modified.
- [x] 8.2 Confirmed the carve-out bookkeeping spec at `openspec/changes/test-list-collections/specs/testing-foundation/spec.md` stays archive-only — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`. Per `test-coverage` design D13 two-tier rollup, this carve-out's `testing-foundation` delta is Tier 2 (archive-only).
- [x] 8.3 Left `openspec/changes/test-coverage/tasks.md` §4.6 checkbox unchecked; it flips on archive of this sub-proposal (not at apply).

## 9. Pre-merge

- [x] 9.1 `npm run lint` passes with zero errors (exit 0). Pre-existing `warn`-level `sonarjs/cognitive-complexity` warnings in unrelated files (the carry-forward set from prior carve-outs) remain; this carve-out introduces zero new warnings or errors.
- [x] 9.2 `npx tsc --noEmit` exits 0 with zero errors.
- [x] 9.3 `npm run build` completes successfully — all routes generated.
- [x] 9.4 `npm run test:coverage` passes (exit 0); the four carve-out files report 100/100/100/100, above the universal `COVERAGE_FLOOR` (98/98/95/100).
- [x] 9.5 `npm run test:e2e` — "No tests found" (vacuously acceptable; no e2e specs on this branch). The e2e gate is not blocked by this carve-out; it lands with sub-proposal 6.x.
