## 1. Confirm foundation surfaces are usable

- [x] 1.1 Re-confirm `test/helpers/setup.ts` loads `@testing-library/jest-dom/vitest` and registers RTL `cleanup` via `afterEach` (jsdom project). → Confirmed: setup.ts imports `@testing-library/jest-dom/vitest` and registers `afterEach(cleanup)`.
- [x] 1.2 Confirm the node project (`vitest.config.ts` `name: 'node'`) resolves `@/` and runs `**/*.test.ts`; confirm `test/helpers/db.ts#bootPglite` works (exercised by `test/helpers/db.test.ts`). → Confirmed: node project has `resolve.alias` `@`→repo root, `include: ['**/*.test.ts']`; `bootPglite` boots PGlite + applies journal migrations and is exercised by `db.test.ts` and the landed `dal.following.test.ts`.
- [x] 1.3 Confirm `@testing-library/react`, `@testing-library/user-event`, `vitest`, and `@electric-sql/pglite` are present. → Present: `@testing-library/react ^16.3.2`, `@testing-library/user-event ^14.6.1`, `vitest ^4.1.7`, `@electric-sql/pglite ^0.4.6`.
- [x] 1.4 Verify a `.test.ts` in the node project can import a `.tsx` source and invoke it (JSX transform). If not, add `esbuild: { jsx: 'automatic', jsxImportSource: 'react' }` to the node project config (Decision 4). Record which path was taken. → **Path taken: NO config change.** A node `.test.ts` (`MyListsRail.test.ts`) imports `../MyListsRail` (`.tsx`) and `@/app/ui/components/ListCardRow` and invokes the async component; vitest's default esbuild transform handles the JSX out of the box. `esbuild.jsx` was NOT added.
- [x] 1.5 Verify the `@/db` connection-swap mock pattern (Decision 9): `vi.mock('@/db', () => ({ get db() { return testDb; } }))` with `testDb` set from `bootPglite()` in `beforeEach`, and confirm a DAL read sees the PGlite client. → Confirmed working. The established pattern (`vi.hoisted` holder + getter + `await import('@/lib/dal')` in `beforeEach`) was already extracted by the prior 4.2 carve-out; reused verbatim. `getUserIdByEmail` and all four rail reads see the PGlite client.
- [x] 1.6 Spec re-grep against `openspec/specs/home-digest/spec.md` at HEAD: confirm the 10 existing requirements; confirm the new ADDED toast-no-flash SHALL does not overlap/contradict the existing migration-toast requirement; note the placeholder `Purpose` text to be replaced. Confirm `eslint.config.mjs` has the per-file `sonarjs/cognitive-complexity = error` override block to append to. → Confirmed: 10 requirements (four-rail digest, My Lists, Following, Bookmarks, Recently visited, migration toast, horizontal-scroll layout, card slots, hover, trailing tile). The ADDED no-flash SHALL is orthogonal (it adds the SSR-hide concern; the existing toast req covers first-render-shows + dismissal-persists). Placeholder `Purpose`: "TBD - created by archiving change add-following-and-history. Update Purpose after archive." The per-file `error`-level override array exists in `eslint.config.mjs` (ends at the 4.2 `following/page.tsx` entry).

## 2. Extract `capRail` and refactor the four rails (in-place, Decision 3)

- [x] 2.1 Create `app/(main)/lists/ui/components/rails/utils.ts` exporting `capRail<T>(all: T[], limit = 5): { shown: T[]; moreCount: number }`.
- [x] 2.2 Refactor `MyListsRail.tsx`, `BookmarksRail.tsx`, `FollowingRail.tsx`, `RecentlyVisitedRail.tsx` to call `capRail(...)` in place of the inline `slice` + `Math.max` logic. Preserve each rail's variable naming and downstream usage. → Done via `const { shown: <lists|rows|users>, moreCount } = capRail(all);` in each rail, preserving the existing destructured name.
- [x] 2.3 Write `app/(main)/lists/ui/components/rails/__tests__/utils.test.ts` (node, pure):
  - [x] 2.3a `EmptyArray_ReturnsEmptyShownZeroMore` — `[]` → `{ shown: [], moreCount: 0 }`.
  - [x] 2.3b `BelowLimit_ReturnsAllShownZeroMore` — 3 items → `shown.length === 3`, `moreCount === 0`.
  - [x] 2.3c `AtLimit_ReturnsAllShownZeroMore` — 5 items → `shown.length === 5`, `moreCount === 0`.
  - [x] 2.3d `AboveLimit_CapsShownAndCountsRemainder` — 17 items → `shown.length === 5`, `moreCount === 12`, `shown` is the first 5 in input order.
  - [x] 2.3e `CustomLimit_RespectsLimitArg` — `capRail(items, 3)` with 10 items → `shown.length === 3`, `moreCount === 7`.

## 3. Write `lib/__tests__/getUserIdByEmail.test.ts` (node + PGlite, COVERAGE_FLOOR — Decision 9)

- [x] 3.1 `vi.mock('@/db', …)` getter-over-mutable-holder; `beforeEach` boots PGlite, applies migrations (via `bootPglite`), assigns the holder, and seeds `users` rows. → Uses `mockNextCache()` + `vi.hoisted` holder + `seedUsers`.
- [x] 3.2 `MatchingEmail_ReturnsSeededUserRow` — seed `{ id, email }`; `getUserIdByEmail(email)` returns the row with matching `id`/`email`.
- [x] 3.3 `NonMatchingEmail_ReturnsNull` — query an email not seeded → `null`.
- [x] 3.4 `EmptyUsersTable_ReturnsNull` — no seed → `null` (the `result[0] || null` branch).
- [x] 3.5 `CaseSensitiveExactMatch_OnlyExactReturns` — seed lowercase email; querying a differently-cased value returns `null`. → **Observed contract:** `eq(users.email, …)` is byte-exact (no implicit normalization / no case-insensitive collation); `'ALICE@test.local'` returns `null` while `'alice@test.local'` returns the row. Locked.

## 4. Write `app/(main)/__tests__/HomePage.test.ts` (node + PGlite, COVERAGE_FLOOR — Decision 4)

### 4A. ModuleMocks

- [x] 4.1 `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))` (NextAuth network-boundary allowance); `vi.mock('next/navigation', () => ({ redirect: redirectMock }))` (redirect throws `REDIRECT:<url>` to halt execution); `@/db` swapped to PGlite per §1.5; `mockNextCache()` so `lib/dal`'s `next/cache` import resolves. `getUserIdByEmail` runs real against seeded data.

### 4B. RedirectBranches

- [x] 4.2 `NoSessionEmail_RedirectsToSignIn` — `auth()` resolves to a session without `user.email`; assert `redirect('/sign-in')` called.
- [x] 4.3 `EmailResolvesToNoUser_RedirectsToSignIn` — `auth()` resolves with an email absent from the seeded `users`; `getUserIdByEmail` → `null`; assert `redirect('/sign-in')` called.

### 4C. DigestComposition (viewer resolves)

- [x] 4.4 `ViewerResolved_RendersToastThenFourRailsInOrder` — child[0] is `BookmarkMigrationToast`; the four `CollapsibleRail` children are in order `my-lists`, `following`, `bookmarks`, `recently-visited`.
- [x] 4.5 `EachRail_HasExpectedNameTitleSeeAllHref` — asserts the four `<CollapsibleRail>` `name`/`title`/`seeAllHref` triples.
- [x] 4.6 `EachRail_WrapsMatchingRailInSuspenseWithViewerId` — each `<CollapsibleRail>`'s child is a `<Suspense>` whose child is the matching rail element with `userId === 'viewer'`.
- [x] 4.7 `ThreeDividers_RenderBetweenRails` — exactly three `home-rail-divider` separators (`role="separator"`).

## 5. Write the four rail tests (node + PGlite prop-inspection, COVERAGE_FLOOR — Decisions 2 & 4)

### 5A. `…/rails/__tests__/MyListsRail.test.ts`

- [x] 5.1 `OverFiveLists_CapsAtFiveWithRemainder` — seed 8 owned lists; `lists.length === 5`, `moreCount === 3`, `seeAllHref === '/lists'`.
- [x] 5.2 `FiveOrFewer_ShowsAllZeroMore` — seed 4; `lists.length === 4`, `moreCount === 0`.
- [x] 5.3 `NoLists_PassesEmptyMessage` — seed 0; `lists.length === 0`, `emptyMessage === 'No lists yet. Create your first one.'`.
- [x] 5.4 (NOT a sort assertion — Decision 2.) → Intentionally omitted; `getListsByUser` sort is sibling-owned (4.6).

### 5B. `…/rails/__tests__/BookmarksRail.test.ts`

- [x] 5.5 `OverFiveBookmarks_CapsAtFiveWithRemainder` — seed `list_visits` with `favorited_at` for 7 lists; `lists.length === 5`, `moreCount === 2`, `seeAllHref === '/lists/bookmarks'`, `showOwner === true`.
- [x] 5.6 `BookmarkRow_MapsToCardShape` — asserts a mapped entry: `id === list_id`, `name === list.name`, `subtitle === (list.subtitle ?? null)`, `occasion`/`date`/`user` carried through. (Renamed from the draft `MapsListVisitRowToCardShape` to satisfy the `<State>_<Behavior>` `it()` shape.)
- [x] 5.7 `NoBookmarks_PassesEmptyMessage` — `lists.length === 0`, `emptyMessage === 'No bookmarks yet.'`.

### 5C. `…/rails/__tests__/FollowingRail.test.ts`

- [x] 5.8 `NoFollowees_RendersEmptyState` — returned tree is `<div className="list-card-row-empty">Not following anyone yet.</div>`.
- [x] 5.9 `OverFiveFollowees_CapsCardsAtFiveAndRendersMoreCard` — seed 7 followees with FOLLOWERS-visible lists; mapped `<UserCard>` children count === 5; trailing `<MoreCard moreCount={2} href="/following">` present.
- [x] 5.10 `FiveOrFewer_NoMoreCard` — seed 3; 3 `<UserCard>`, no `<MoreCard>`.
- [x] 5.11 `UserCard_ReceivesIdNameImageNewCountLatestSharedCompact` — asserts the props handed to a `<UserCard>` (props only, not render).

### 5D. `…/rails/__tests__/RecentlyVisitedRail.test.ts`

- [x] 5.12 `NoVisits_RendersEmptyState` — `<div className="list-card-row-empty">No visits yet.</div>`.
- [x] 5.13 `OverFiveVisits_CapsCardsAtFiveAndRendersMoreCard` — `<HistoryCard>` children === 5; trailing `<MoreCard href="/lists/history">` present.
- [x] 5.14 `FiveOrFewer_NoMoreCard`.
- [x] 5.15 `Invoked_CallsGetVisitHistoryWithLimitFifty` **Decision 5** — `vi.spyOn(dal, 'getVisitHistoryByUser')` (real impl preserved) records `('viewer', { limit: 50 })`. (Renamed from the draft `CallsGetVisitHistoryWithLimitFifty` for the `it()` shape.) Note: the rail test mocks `@/lib/auth` to short-circuit the `HistoryCard → HistoryActions → @/app/actions/lists → @/lib/auth → next-auth` transitive import (NextAuth network-boundary allowance) — without it the file fails to load in the full node suite (`next/server` ESM subpath resolution).
- [x] 5.16 `HistoryCard_ReceivesRowProp` — asserts the `row` prop handed to a `<HistoryCard>`.

## 6. Write `app/(main)/__tests__/page.test.tsx` (jsdom + RTL, COVERAGE_FLOOR)

- [x] 6.1 `vi.mock('../HomePage', () => ({ default: () => <div data-testid="home-stub" /> }))` (async server comp can't render in jsdom).
- [x] 6.2 `Default_RendersMainContainerWrappingHomePage` — `screen.getByRole('main')` has class `container` and contains the `home-stub` (role-based query avoids `no-container`).
- [x] 6.3 `Suspense_FallbackIsPageLoadingIndicator` — element prop-inspection of `Page()`: the `<Suspense>` `fallback` is `<LoadingIndicator size="page" />` (element type + `size` prop).

## 7. Write `app/(main)/lists/ui/components/__tests__/CollapsibleRail.test.tsx` (jsdom + RTL, COVERAGE_FLOOR)

### 7A. DefaultState

- [x] 7.1 `NoStoredValue_RendersOpenWithBodyAndAriaExpandedTrue` — empty `localStorage` → `.rail` without `collapsed`, toggle `aria-expanded="true"`, `.rail-body` present with children.
- [x] 7.2 `StoredFalse_RendersCollapsedNoBody` — preset `localStorage['home.rail.x.open'] = 'false'` → `.rail.collapsed`, `aria-expanded="false"`, no `.rail-body`.
- [x] 7.x `ServerSnapshot_RendersOpenWithBody` (added) — `renderToString` covers the `getServerSnapshot` `() => null` path → resolves to the `true` default → open with body. Maps to the existing "Default state is open" SHALL (per Decision 6 / §9.9).
- [x] 7.x `GetItemThrows_FallsBackToOpenDefault` (added) — `getItem` throws → snapshot read catches → `null` → default open. Covers the `getSnapshot` `catch` branch.

### 7B. ToggleBehavior

- [x] 7.3 `ClickToggle_WritesFalseAndCollapses` — from open, click `.rail-toggle` → `localStorage['home.rail.x.open'] === 'false'`, `aria-expanded="false"`, `.rail-body` removed.
- [x] 7.4 `ClickToggleTwice_WritesTrueAndExpands` — toggle then toggle again → `'true'`, body returns.
- [x] 7.5 `ClickToggle_ChevronGetsCollapsedClass` — `.rail-chevron` has the `collapsed` class only when collapsed. (Renamed from the draft `ChevronReflectsState` for the `it()` shape.)

### 7C. HeaderSlots

- [x] 7.6 `SeeAllHrefProvided_RendersLinkButtonAnchor` — `<a>` "See all" with `href="/h"` inside `.rail-header-extra`.
- [x] 7.7 `NoSeeAllHref_RendersNoSeeAllLink`.
- [x] 7.8 `HeaderExtraProvided_RendersIntoHeaderExtra` — a passed `headerExtra` node appears in `.rail-header-extra`.
- [x] 7.9 `TitleProp_RendersInRailTitle` — `title` prop is the `.rail-title` text. (Renamed from the draft `TitleRendersInRailTitle` for the `it()` shape.)

### 7D. StorageFailureTolerance

- [x] 7.10 `SetItemThrows_ToggleSwallowsError` — stub `localStorage.setItem` to throw; clicking the toggle does not surface an error (the `try/catch` write branch).

## 8. Write `app/(main)/lists/ui/components/__tests__/BookmarkMigrationToast.test.tsx` (jsdom + RTL, COVERAGE_FLOOR — Decision 6 SHALL)

- [x] 8.1 `NoFlag_RendersToastWithStatusRoleCopyAndDismiss` **Spec delta SHALL** — no `localStorage` flag → `role="status"`, the rename copy text, a dismiss button with `aria-label="Dismiss"`.
- [x] 8.2 `FlagSetTrue_DoesNotRender` **Spec delta SHALL** — preset `localStorage['home.bookmark-migration-toast.dismissed'] = 'true'` → toast absent.
- [x] 8.3 `ClickDismiss_WritesFlagAndUnmounts` — click dismiss → flag `=== 'true'`, toast removed.
- [x] 8.4 `GetItemThrows_TreatedAsNotDismissed` — stub `getItem` to throw → toast renders (the read `try/catch` fallback).
- [x] 8.5 `SetItemThrows_DismissSwallowsError` — stub `setItem` to throw → dismiss handler does not surface an error.
- [x] 8.6 `ServerSnapshot_ReportsDismissed` **Spec delta SHALL** — `renderToString(<BookmarkMigrationToast />)` returns `''` (the `getServerSnapshot` `() => true` path hides the toast pre-hydration), distinct from the hydrated client render in §8.1.

## 9. Audits

### 9.1 Assertion-substance audit (on the new tests)

- [x] 9.1 Walked each new test file. Every assertion names observable output: element `type`/`props`, exact class strings, exact `localStorage` values, exact copy text, DAL call args (`{ limit: 50 }`), exact return values/`null`, mapped-shape fields. No internal-state assertions, no DOM snapshots, no tautologies. Rail tests assert cap counts + `moreCount` + child props (NOT sort order); `getUserIdByEmail` asserts the exact returned row / `null`; toast tests assert the exact `localStorage` key + value. **No test flagged.**

### 9.2 Duplication audit (on carve-out source + new tests)

- [x] 9.2 **Source:** the four rails' `slice(0,5)` + `Math.max` duplication → **fixed in-place** by the `capRail` extraction (§2) in `MyListsRail.tsx`, `BookmarksRail.tsx`, `FollowingRail.tsx`, `RecentlyVisitedRail.tsx`. **Tests:** the `@/db`→PGlite boot + connection-swap + next-cache + user-seed glue is ALREADY extracted to `test/helpers/` (`db.ts#bootPglite`, `next-cache.ts#mockNextCache`, `seedFollowGraph.ts#{seedUsers,seedFollow,seedPublicList}`) by the landed 4.2 carve-out — this carve-out **reuses** them across `getUserIdByEmail.test.ts`, `HomePage.test.ts`, and the four rail tests (no re-invention; the testing-foundation shared-fixture rule is satisfied). **Deferred:** `list_visits` seeding (`seedBookmark` / `seedVisit`) is kept **inline** in the two rail tests that need it (≈8 lines each, divergent shapes — `favorited_at` vs `last_visited_at`); extract a `seedVisit` helper when a 3rd consumer appears.

### 9.3 Complexity audit (on carve-out source)

- [x] 9.3 `npm run lint`: **zero** `sonarjs/cognitive-complexity` warnings/errors on any carve-out file. All carve-out files are trivial (≤ ~4; `CollapsibleRail` highest). The 10 remaining repo-wide warnings are pre-existing carry-forward in unrelated files (`Item.tsx`, `ItemsToolbar.tsx`, `itemFilters.ts`, `useItemForm.ts`, `ChooseItemsForm.tsx`, `ListDetails.tsx`, `Avatar.tsx` img, `items.ts`, `lists.ts`, `seed-dev-users.ts`).

### 9.4 Testability audit (on carve-out source)

- [x] 9.4 Coverage report at `COVERAGE_FLOOR` for every enumerated carve-out file. Per-file metrics from `coverage/coverage-summary.json`: `HomePage.tsx`, `page.tsx`, `MyListsRail.tsx`, `FollowingRail.tsx`, `BookmarksRail.tsx`, `RecentlyVisitedRail.tsx`, `rails/utils.ts`, `CollapsibleRail.tsx`, `BookmarkMigrationToast.tsx` — **all at 100% lines / 100% statements / 100% branches / 100% functions** (≥ floor 98/98/95/100).
- [x] 9.5 `/* v8 ignore */` annotations: **two**, both for the `typeof window === 'undefined'` SSR short-circuit in the `subscribe`/`subscribeLocalStorage` helpers of `CollapsibleRail.tsx` and `BookmarkMigrationToast.tsx` (jsdom always defines `window`, so the early-return is unreachable in tests) — same rationale + comment style as `useKeyboardOffset.ts`. The analogous `getServerSnapshot` paths are NOT ignored: they are TESTED via `renderToString` (CollapsibleRail `ServerSnapshot_RendersOpenWithBody`, toast §8.6), and the `getSnapshot` `catch` branches are tested via the `GetItemThrows` tests.
- [x] 9.6 Source refactors taken in-place: the `capRail` extraction + four rail call-site updates (§2). Disposition (a) fix-in-place; behavior preservation proven by `capRail.test.ts` (§2.3) + the rail integration tests (§5).
- [x] 9.7 **`lib/dal.ts` per-file coverage deferral** (Decision 7) — `getUserIdByEmail` is behavior-tested against PGlite but `lib/dal.ts` is NOT added to `vitest.config.ts` thresholds (the per-file gate cannot isolate one function of a 708-line shared module). Disposition: **deferred** → §13.1 governance checkbox (`test-coverage/tasks.md` §7.7).

### 9.5 Invariant-elevation audit

- [x] 9.8 The new ADDED `home-digest` SHALL (toast pre-hydration no-flash) is asserted by ≥1 discrete `it()` → §8.6 (`ServerSnapshot_ReportsDismissed`) plus §8.1/§8.2 for the hydrated branches.
- [x] 9.9 NON-elevated invariants recorded:
  - RecentlyVisited `{ limit: 50 }` over-fetch / 45-bounded "+N more" (Decision 5) — NOT elevated: fails criterion (b) (incidental limit, would not survive an exact-count reimplementation). Tested (§5.15), not spec'd.
  - HomePage's `redirect('/sign-in')` auth-gate — NOT elevated: a repeated app-wide page guard, derivable; tested (§4.2/§4.3), not a home-digest-specific contract (page-level auth is adjacent to 4.13's authorization scope).
  - `CollapsibleRail`'s `() => null` server snapshot — NOT separately elevated: resolves to the existing "Default state is open" SHALL (null → default `true`). Locked by §7.1 + the added `ServerSnapshot_RendersOpenWithBody` against the existing requirement.
  - Rail empty-state copy strings — NOT elevated: trivial/derivable; tested.
- [x] 9.10 No test asserts an invariant lacking a corresponding SHALL — every assertion maps to an existing `home-digest` requirement (rail caps, tile gate, collapse + localStorage, migration toast, rails-in-order) or the new ADDED toast no-flash SHALL.
- [x] 9.11 Two **deferred spec-drift findings** discovered during spec-grep (§1.6): (2) My-Lists sort drift (spec `updated_at DESC` vs `getListsByUser` `created_at DESC`) → 4.6; (3) Following "public" vs `FOLLOWERS` visibility wording → 4.2. Both → §13 governance checkboxes (`test-coverage/tasks.md` §7.8, §7.9).

## 10. Config changes

- [x] 10.1 Extended the per-file `sonarjs/cognitive-complexity = error` override array in `eslint.config.mjs` with the header comment `// test-home-digest (sub-proposal 4.3) — locked at universal COVERAGE_FLOOR.` and the nine executable files (`HomePage.tsx`, `page.tsx`, the four rails, `rails/utils.ts`, `CollapsibleRail.tsx`, `BookmarkMigrationToast.tsx`).
- [x] 10.2 Added per-file threshold entries in `vitest.config.ts`'s `thresholds` map for the nine files above, each referencing `COVERAGE_FLOOR`. **`lib/dal.ts` NOT added** (Decision 7 / §9.7).
- [x] 10.3 Confirmed `vitest.config.ts` `coverage.exclude` already covers `**/__tests__/**` and `app/**/layout.tsx`. No new exclude line needed (`page.tsx` is intentionally included/gated).
- [x] 10.4 §1.4 did **not** require it — the node project imports `.tsx` and invokes out of the box, so NO `esbuild: { jsx: 'automatic', … }` was added.

## 11. Apply spec deltas

- [x] 11.1 Applied the ADDED toast-no-flash requirement into the active `openspec/specs/home-digest/spec.md` (after the existing migration-toast requirement). Validated: `openspec validate home-digest --strict` → "Specification 'home-digest' is valid".
- [x] 11.2 Replaced the active `openspec/specs/home-digest/spec.md` placeholder `## Purpose` with a real statement describing the home digest (authenticated landing view: four collapsible, recency-capped rails — My Lists, Following, Bookmarks, Recently visited — with a one-time bookmark-migration toast). Direct edit (Purpose is not a delta requirement — Decision 6).
- [x] 11.3 Confirmed the `testing-foundation` carve-out delta at `openspec/changes/test-home-digest/specs/testing-foundation/spec.md` stays archive-only (Tier 2 per D13) — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`.

## 12. Pre-merge

- [x] 12.1 `npm run lint` passes: **0 errors, 10 warnings**; all 10 are pre-existing carry-forward `sonarjs/cognitive-complexity` (+ one `@next/next/no-img-element`) warnings in unrelated files — zero NEW warnings, zero on carve-out files (acceptable per parent §7.4).
- [x] 12.2 `npx tsc --noEmit` exits 0 — "No errors found".
- [x] 12.3 `npm run build` completes — all routes generated (incl. `/`).
- [x] 12.4 `npm run test:coverage` passes (817 tests); the nine enumerated carve-out files at 100% (≥ `COVERAGE_FLOOR` 98/98/95/100). `getUserIdByEmail` test passes (not coverage-gated per Decision 7).
- [x] 12.5 `npm run test:e2e` — **vacuously acceptable**: no e2e specs on the branch (`e2e/` holds only `tsconfig.json`); e2e lands with 6.x.

## 13. Governance (deferred findings → new checkboxes in `test-coverage/tasks.md`)

- [x] 13.1 Added governance checkbox `test-coverage/tasks.md` §7.7: **Define the `lib/dal.ts` per-file coverage-attribution strategy.** (Audit deferral §9.7.)
- [x] 13.2 Added note/checkbox `test-coverage/tasks.md` §7.8 flagging the **My-Lists sort drift** for 4.6 `test-list-collections`. (Audit deferral §9.11.)
- [x] 13.3 Added note/checkbox `test-coverage/tasks.md` §7.9 flagging the **Following "public"-vs-FOLLOWERS wording** for 4.2 `test-following`. (Audit deferral §9.11.)
- [x] 13.4 Left the parent's §4.3 `test-home-digest` checkbox UNCHECKED — it flips on archive of this sub-proposal, not at apply.
