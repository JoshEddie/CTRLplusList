## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach` (jsdom project).
- [ ] 1.2 Confirm the node project (`vitest.config.ts` `name: 'node'`) resolves `@/` and runs `**/*.test.ts`; confirm `test/helpers/db.ts#bootPglite` works (exercised by `test/helpers/db.test.ts`).
- [ ] 1.3 Confirm `@testing-library/react`, `@testing-library/user-event`, `vitest`, and `@electric-sql/pglite` are present.
- [ ] 1.4 Verify a `.test.ts` in the node project can import a `.tsx` source and invoke it (JSX transform). If not, add `esbuild: { jsx: 'automatic', jsxImportSource: 'react' }` to the node project config (Decision 4). Record which path was taken.
- [ ] 1.5 Verify the `@/db` connection-swap mock pattern (Decision 9): `vi.mock('@/db', () => ({ get db() { return testDb; } }))` with `testDb` set from `bootPglite()` in `beforeEach`, and confirm a DAL read sees the PGlite client.
- [ ] 1.6 Spec re-grep against `openspec/specs/home-digest/spec.md` at HEAD: confirm the 10 existing requirements; confirm the new ADDED toast-no-flash SHALL does not overlap/contradict the existing migration-toast requirement; note the placeholder `Purpose` text to be replaced. Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block to append to.

## 2. Extract `capRail` and refactor the four rails (in-place, Decision 3)

- [ ] 2.1 Create `app/(main)/lists/ui/components/rails/capRail.ts` exporting `capRail<T>(all: T[], limit = 5): { shown: T[]; moreCount: number }`.
- [ ] 2.2 Refactor `MyListsRail.tsx`, `BookmarksRail.tsx`, `FollowingRail.tsx`, `RecentlyVisitedRail.tsx` to call `capRail(...)` in place of the inline `slice` + `Math.max` logic. Preserve each rail's variable naming and downstream usage.
- [ ] 2.3 Write `app/(main)/lists/ui/components/rails/__tests__/capRail.test.ts` (node, pure):
  - [ ] 2.3a `EmptyArray_ReturnsEmptyShownZeroMore` — `[]` → `{ shown: [], moreCount: 0 }`.
  - [ ] 2.3b `BelowLimit_ReturnsAllShownZeroMore` — 3 items → `shown.length === 3`, `moreCount === 0`.
  - [ ] 2.3c `AtLimit_ReturnsAllShownZeroMore` — 5 items → `shown.length === 5`, `moreCount === 0`.
  - [ ] 2.3d `AboveLimit_CapsShownAndCountsRemainder` — 17 items → `shown.length === 5`, `moreCount === 12`, `shown` is the first 5 in input order.
  - [ ] 2.3e `CustomLimit_RespectsLimitArg` — `capRail(items, 3)` with 10 items → `shown.length === 3`, `moreCount === 7`.

## 3. Write `lib/__tests__/getUserIdByEmail.test.ts` (node + PGlite, COVERAGE_FLOOR — Decision 9)

- [ ] 3.1 `vi.mock('@/db', …)` getter-over-mutable-holder; `beforeEach` boots PGlite, applies migrations (via `bootPglite`), assigns the holder, and seeds `users` rows.
- [ ] 3.2 `MatchingEmail_ReturnsSeededUserRow` — seed `{ id, email }`; `getUserIdByEmail(email)` returns the row with matching `id`/`email`.
- [ ] 3.3 `NonMatchingEmail_ReturnsNull` — query an email not seeded → `null`.
- [ ] 3.4 `EmptyUsersTable_ReturnsNull` — no seed → `null` (the `result[0] || null` branch).
- [ ] 3.5 `CaseSensitiveExactMatch_OnlyExactReturns` — seed lowercase email; querying a differently-cased value returns `null` (locks the exact-`eq` match, no implicit normalization). Adjust to observed behavior; if the schema/collation normalizes, assert the observed contract instead and record it.

## 4. Write `app/(main)/__tests__/HomePage.test.ts` (node + PGlite, COVERAGE_FLOOR — Decision 4)

### 4A. ModuleMocks

- [ ] 4.1 `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))` (NextAuth network-boundary allowance); `vi.mock('next/navigation', () => ({ redirect: vi.fn() }))`; `@/db` swapped to PGlite per §1.5. `getUserIdByEmail` runs real against seeded data.

### 4B. RedirectBranches

- [ ] 4.2 `NoSessionEmail_RedirectsToSignIn` — `auth()` resolves to `null` (or session without `user.email`); assert `redirect('/sign-in')` called.
- [ ] 4.3 `EmailResolvesToNoUser_RedirectsToSignIn` — `auth()` resolves with an email absent from the seeded `users`; `getUserIdByEmail` → `null`; assert `redirect('/sign-in')` called.

### 4C. DigestComposition (viewer resolves)

- [ ] 4.4 `ViewerResolved_RendersToastThenFourRailsInOrder` — seed the viewer; assert the returned tree's children are, in order: `BookmarkMigrationToast`, `CollapsibleRail(my-lists)`, divider, `CollapsibleRail(following)`, divider, `CollapsibleRail(bookmarks)`, divider, `CollapsibleRail(recently-visited)`.
- [ ] 4.5 `EachRail_HasExpectedNameTitleSeeAllHref` — assert the four `<CollapsibleRail>` props: `my-lists`/`My Lists`/`/lists`; `following`/`Following`/`/following`; `bookmarks`/`Bookmarks`/`/lists/bookmarks`; `recently-visited`/`Recently visited`/`/lists/history`.
- [ ] 4.6 `EachRail_WrapsMatchingRailInSuspenseWithViewerId` — each `<CollapsibleRail>`'s child is a `<Suspense>` whose child is the matching rail element with `userId === viewer.id`.
- [ ] 4.7 `ThreeDividers_RenderBetweenRails` — exactly three `home-rail-divider` separators (`role="separator"`).

## 5. Write the four rail tests (node + PGlite prop-inspection, COVERAGE_FLOOR — Decisions 2 & 4)

### 5A. `…/rails/__tests__/MyListsRail.test.ts`

- [ ] 5.1 `OverFiveLists_CapsAtFiveWithRemainder` — seed 8 owned lists; invoke; `tree.props.lists.length === 5`, `tree.props.moreCount === 3`, `seeAllHref === '/lists'`.
- [ ] 5.2 `FiveOrFewer_ShowsAllZeroMore` — seed 4; `lists.length === 4`, `moreCount === 0`.
- [ ] 5.3 `NoLists_PassesEmptyMessage` — seed 0; `lists.length === 0`, `emptyMessage === 'No lists yet. Create your first one.'`.
- [ ] 5.4 (NOT a sort assertion — Decision 2.)

### 5B. `…/rails/__tests__/BookmarksRail.test.ts`

- [ ] 5.5 `OverFiveBookmarks_CapsAtFiveWithRemainder` — seed list_visits with `favorited_at` for 7 lists; `lists.length === 5`, `moreCount === 2`, `seeAllHref === '/lists/bookmarks'`, `showOwner === true`.
- [ ] 5.6 `MapsListVisitRowToCardShape` — assert a mapped entry: `id === list_id`, `name === list.name`, `subtitle === (list.subtitle ?? null)`, `occasion`/`date`/`user` carried through.
- [ ] 5.7 `NoBookmarks_PassesEmptyMessage` — `lists.length === 0`, `emptyMessage === 'No bookmarks yet.'`.

### 5C. `…/rails/__tests__/FollowingRail.test.ts`

- [ ] 5.8 `NoFollowees_RendersEmptyState` — seed none; returned tree is `<div className="list-card-row-empty">Not following anyone yet.</div>`.
- [ ] 5.9 `OverFiveFollowees_CapsCardsAtFiveAndRendersMoreCard` — seed 7 followees with FOLLOWERS-visible lists; mapped `<UserCard>` children count === 5; trailing `<MoreCard moreCount={2} href="/following">` present.
- [ ] 5.10 `FiveOrFewer_NoMoreCard` — seed 3; 3 `<UserCard>`, no `<MoreCard>`.
- [ ] 5.11 `UserCard_ReceivesIdNameImageNewCountLatestSharedCompact` — assert the props handed to a `<UserCard>` (sibling-owned; props only, not render).

### 5D. `…/rails/__tests__/RecentlyVisitedRail.test.ts`

- [ ] 5.12 `NoVisits_RendersEmptyState` — `<div className="list-card-row-empty">No visits yet.</div>`.
- [ ] 5.13 `OverFiveVisits_CapsCardsAtFiveAndRendersMoreCard` — `<HistoryCard>` children === 5; trailing `<MoreCard href="/lists/history">` present.
- [ ] 5.14 `FiveOrFewer_NoMoreCard`.
- [ ] 5.15 `CallsGetVisitHistoryWithLimitFifty` **Decision 5** — assert the read is invoked with `{ limit: 50 }` (spy on the DAL read's call args; the read still runs real against PGlite).
- [ ] 5.16 `HistoryCard_ReceivesRowProp` — assert the `row` prop handed to a `<HistoryCard>`.

## 6. Write `app/(main)/__tests__/page.test.tsx` (jsdom + RTL, COVERAGE_FLOOR)

- [ ] 6.1 `vi.mock('./HomePage', () => ({ default: () => <div data-testid="home-stub" /> }))` (async server comp can't render in jsdom).
- [ ] 6.2 `Default_RendersMainContainerWrappingHomePage` — `<main class="container">` contains the `home-stub`.
- [ ] 6.3 `Suspense_FallbackIsPageLoadingIndicator` — the `<Suspense>` `fallback` prop is `<LoadingIndicator size="page" />` (assert the element type + `size` prop; `LoadingIndicator` is sibling-owned — prop assertion, not behavior).

## 7. Write `app/(main)/lists/ui/components/__tests__/CollapsibleRail.test.tsx` (jsdom + RTL, COVERAGE_FLOOR)

### 7A. DefaultState

- [ ] 7.1 `NoStoredValue_RendersOpenWithBodyAndAriaExpandedTrue` — empty `localStorage` → `.rail` without `collapsed`, toggle `aria-expanded="true"`, `.rail-body` present with children.
- [ ] 7.2 `StoredFalse_RendersCollapsedNoBody` — preset `localStorage['home.rail.x.open'] = 'false'` → `.rail.collapsed`, `aria-expanded="false"`, no `.rail-body`.

### 7B. ToggleBehavior

- [ ] 7.3 `ClickToggle_WritesFalseAndCollapses` — from open, click `.rail-toggle` → `localStorage['home.rail.x.open'] === 'false'`, `aria-expanded="false"`, `.rail-body` removed.
- [ ] 7.4 `ClickToggleTwice_WritesTrueAndExpands` — toggle then toggle again → `'true'`, body returns.
- [ ] 7.5 `ChevronReflectsState` — `.rail-chevron` has the `collapsed` class only when collapsed.

### 7C. HeaderSlots

- [ ] 7.6 `SeeAllHrefProvided_RendersLinkButtonAnchor` — `<a>` "See all" with `href="/h"` inside `.rail-header-extra`.
- [ ] 7.7 `NoSeeAllHref_RendersNoSeeAllLink`.
- [ ] 7.8 `HeaderExtraProvided_RendersIntoHeaderExtra` — a passed `headerExtra` node appears in `.rail-header-extra`.
- [ ] 7.9 `TitleRendersInRailTitle` — `title` prop is the `.rail-title` text.

### 7D. StorageFailureTolerance

- [ ] 7.10 `SetItemThrows_ToggleSwallowsError` — stub `localStorage.setItem` to throw; clicking the toggle does not surface an error (the `try/catch` write branch).

## 8. Write `app/(main)/lists/ui/components/__tests__/BookmarkMigrationToast.test.tsx` (jsdom + RTL, COVERAGE_FLOOR — Decision 6 SHALL)

- [ ] 8.1 `NoFlag_RendersToastWithStatusRoleCopyAndDismiss` **Spec delta SHALL** — no `localStorage` flag → `role="status"`, the rename copy text, a dismiss button with `aria-label="Dismiss"`.
- [ ] 8.2 `FlagSetTrue_DoesNotRender` **Spec delta SHALL** — preset `localStorage['home.bookmark-migration-toast.dismissed'] = 'true'` → toast absent.
- [ ] 8.3 `ClickDismiss_WritesFlagAndUnmounts` — click dismiss → flag `=== 'true'`, toast removed.
- [ ] 8.4 `GetItemThrows_TreatedAsNotDismissed` — stub `getItem` to throw → toast renders (the read `try/catch` fallback).
- [ ] 8.5 `SetItemThrows_DismissSwallowsError` — stub `setItem` to throw → dismiss handler does not surface an error.
- [ ] 8.6 `ServerSnapshot_ReportsDismissed` **Spec delta SHALL** — assert the un-hydrated/initial snapshot path resolves to dismissed (no-flash contract). Exercise via the `useSyncExternalStore` `getServerSnapshot` (`() => true`) — assert the toast is hidden in the pre-hydration render path (e.g. via `renderToString` / server-snapshot harness), distinct from the hydrated client render in §8.1.

## 9. Audits

### 9.1 Assertion-substance audit (on the new tests)

- [ ] 9.1 Walk each new test file. Every assertion names observable output (element `type`/`props`, exact class strings, exact `localStorage` values, exact copy text, DAL call args, exact return values/`null`, mapped-shape fields). No internal-state assertions, no DOM snapshots, no tautologies. Specifically: rail tests assert cap counts + `moreCount` + child props (NOT sort order); `getUserIdByEmail` asserts the exact returned row / `null`; toast tests assert the exact `localStorage` key + value. Record disposition for any flagged test.

### 9.2 Duplication audit (on carve-out source + new tests)

- [ ] 9.2 Source: the four rails' `slice(0,5)` + `moreCount` duplication → **fixed in-place** by `capRail` extraction (§2). Record "fixed in-place" with file references. Tests: the `@/db`→PGlite boot + seed glue appears in `getUserIdByEmail.test.ts`, `HomePage.test.ts`, and the four rail tests. **Default disposition:** keep inline for this carve-out OR extract a `test/helpers/` DB harness if the inline copies are non-trivially identical. Decide at apply: if the seed/boot/swap glue is >~10 identical lines across 3+ files, extract to `test/helpers/db-integration.ts` (and import from all consumers) per the testing-foundation shared-fixture rule; otherwise inline and record the deferral (first extraction naturally lands when the 2nd DAL carve-out arrives). Record the chosen disposition.

### 9.3 Complexity audit (on carve-out source)

- [ ] 9.3 `npm run lint`: zero `sonarjs/cognitive-complexity` warnings/errors on all carve-out files. Expected complexity ≤ ~4 for every file (`CollapsibleRail` highest). Record measured values if surfaced.

### 9.4 Testability audit (on carve-out source)

- [ ] 9.4 Coverage report at `COVERAGE_FLOOR` for every enumerated carve-out file. Record per-file metrics from `coverage/coverage-summary.json` for `HomePage.tsx`, `page.tsx`, the four rails, `capRail.ts`, `CollapsibleRail.tsx`, `BookmarkMigrationToast.tsx`.
- [ ] 9.5 `/* v8 ignore */` annotations: list each with rationale. Expected candidates: the `typeof window === 'undefined'` SSR short-circuit in `CollapsibleRail.tsx`/`BookmarkMigrationToast.tsx` `subscribe` (jsdom always defines `window`) — prefer testing the equivalent path; fall back to `/* v8 ignore */` with rationale only if v8 flags the specific line.
- [ ] 9.6 Source refactors taken in-place: list each. Expected: the `capRail` extraction + four rail call-site updates (§2). Disposition (a) fix-in-place; tests in §2.3 + §5 prove preservation.
- [ ] 9.7 **`lib/dal.ts` per-file coverage deferral** (Decision 7) — record that `getUserIdByEmail` is behavior-tested but `lib/dal.ts` is NOT added to `vitest.config.ts` thresholds (vitest per-file gate cannot isolate one function of a 708-line shared module). Disposition: **deferred** → §13 governance checkbox.

### 9.5 Invariant-elevation audit

- [ ] 9.8 Confirm the new ADDED `home-digest` SHALL (toast pre-hydration no-flash) is asserted by ≥1 discrete `it()` → §8.6 (+ §8.1/§8.2 for the hydrated branches).
- [ ] 9.9 Record NON-elevated invariants with one-line rationale:
  - RecentlyVisited `{ limit: 50 }` over-fetch / 45-bounded "+N more" (Decision 5) — NOT elevated: fails criterion (b) (incidental limit, would not survive an exact-count reimplementation). Tested (§5.15), not spec'd.
  - HomePage's `redirect('/sign-in')` auth-gate — NOT elevated: a repeated app-wide page guard, derivable; tested (§4.2/§4.3), not a home-digest-specific contract (page-level auth is adjacent to 4.13's server-action/route authorization scope).
  - `CollapsibleRail`'s `() => null` server snapshot — NOT separately elevated: resolves to the existing "Default state is open" SHALL (null → default `true`). Locked by §7.1 against the existing requirement.
  - Rail empty-state copy strings — NOT elevated: trivial/derivable; tested.
- [ ] 9.10 Confirm no test asserts an invariant lacking a corresponding SHALL — every assertion maps to an existing `home-digest` requirement (rail caps, tile gate, collapse + localStorage, migration toast, rails-in-order) or the new ADDED toast no-flash SHALL.
- [ ] 9.11 Record the two **deferred spec-drift findings** discovered during spec-grep (§1.6): (2) My-Lists sort drift (spec `updated_at DESC` vs `getListsByUser` `created_at DESC`) → 4.6; (3) Following "public" vs `FOLLOWERS` visibility wording → 4.2. Both → §13 governance checkboxes.

## 10. Config changes

- [ ] 10.1 Extend the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` with a header comment `// test-home-digest (sub-proposal 4.3) — locked at universal COVERAGE_FLOOR.` and the executable files:
  - `app/(main)/HomePage.tsx`
  - `app/(main)/page.tsx`
  - `app/(main)/lists/ui/components/rails/MyListsRail.tsx`
  - `app/(main)/lists/ui/components/rails/FollowingRail.tsx`
  - `app/(main)/lists/ui/components/rails/BookmarksRail.tsx`
  - `app/(main)/lists/ui/components/rails/RecentlyVisitedRail.tsx`
  - `app/(main)/lists/ui/components/rails/capRail.ts`
  - `app/(main)/lists/ui/components/CollapsibleRail.tsx`
  - `app/(main)/lists/ui/components/BookmarkMigrationToast.tsx`
- [ ] 10.2 Add per-file threshold entries in `vitest.config.ts`'s `thresholds` map for the nine files above, each referencing `COVERAGE_FLOOR`. **Do NOT add `lib/dal.ts`** (Decision 7 / §9.7).
- [ ] 10.3 Confirm `vitest.config.ts` `coverage.exclude` already covers `**/__tests__/**` and `app/**/layout.tsx`. No new exclude line needed (`page.tsx` is intentionally included/gated).
- [ ] 10.4 If §1.4 required it, add `esbuild: { jsx: 'automatic', jsxImportSource: 'react' }` to the node project config and record it.

## 11. Apply spec deltas

- [ ] 11.1 Apply the ADDED toast-no-flash requirement from `specs/home-digest/spec.md` into the active `openspec/specs/home-digest/spec.md`. Validate via `openspec validate home-digest --strict`.
- [ ] 11.2 Replace the active `openspec/specs/home-digest/spec.md` placeholder `## Purpose` ("TBD - created by archiving add-following-and-history…") with a real statement describing the home digest (the authenticated landing view: four collapsible, recency-capped rails — My Lists, Following, Bookmarks, Recently visited — with a one-time bookmark-migration toast). Direct edit (Purpose is not a delta requirement — Decision 6).
- [ ] 11.3 Confirm the `testing-foundation` carve-out delta at `openspec/changes/test-home-digest/specs/testing-foundation/spec.md` stays archive-only (Tier 2 per D13) — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`.

## 12. Pre-merge

- [ ] 12.1 `npm run lint` passes with zero errors and zero NEW warnings (pre-existing carry-forward warnings acceptable per §7.4 of the parent).
- [ ] 12.2 `npx tsc --noEmit` exits 0.
- [ ] 12.3 `npm run build` completes — all routes generated.
- [ ] 12.4 `npm run test:coverage` passes; the nine enumerated carve-out files at `COVERAGE_FLOOR` (98/98/95/100) or above. `getUserIdByEmail` test passes (not coverage-gated per Decision 7).
- [ ] 12.5 `npm run test:e2e` — record outcome (vacuously acceptable if no e2e specs on branch; e2e lands with 6.x).

## 13. Governance (deferred findings → new checkboxes in `test-coverage/tasks.md`)

- [ ] 13.1 Add a governance checkbox under `openspec/changes/test-coverage/tasks.md` §7: **Define the `lib/dal.ts` per-file coverage-attribution strategy.** vitest gates per-file but `testing-foundation` intends per-function floors for `dal.ts`; first surfaced by `test-home-digest` (4.3). Resolution options: split `lib/dal.ts` into per-capability modules; adopt per-function coverage tooling; or enumerate `lib/dal.ts` at `COVERAGE_FLOOR` only at the §7.3 governance close-out once every function is covered across sibling carve-outs. (Audit deferral §9.7.)
- [ ] 13.2 Add a note/checkbox flagging the **My-Lists sort drift** for 4.6 `test-list-collections` (owns `getListsByUser`): the `home-digest` spec says My Lists shows owned lists "ordered by `updated_at DESC`" but `getListsByUser` orders by `created_at DESC`. 4.6 SHALL resolve (correct the spec to match source, or fix the source). (Audit deferral §9.11.)
- [ ] 13.3 Add a note/checkbox flagging the **Following "public"-vs-FOLLOWERS wording** for 4.2 `test-following` (owns `getFollowing*`): the spec's Following-sort prose says "public lists" but `getFollowingFeedUsers` filters `VISIBILITY.FOLLOWERS`. 4.2 SHALL reconcile the spec vocabulary with the visibility taxonomy. (Audit deferral §9.11.)
- [ ] 13.4 Leave the parent's §4.3 `test-home-digest` checkbox UNCHECKED — it flips on archive of this sub-proposal, not at apply.
