## 1. Confirm foundation surfaces are usable

- [x] 1.1 Confirm the node project resolves `@/` and runs `.test.ts` files (`test/helpers/db.test.ts` + `next-cache.test.ts` already pass under it).
- [x] 1.2 Confirm `bootPglite()` (`test/helpers/db.ts`) boots an in-memory Postgres and replays all `drizzle/` migrations including the `list_visits` table (composite PK `(user_id, list_id)`).
- [x] 1.3 Confirm `mockNextCache()` (`test/helpers/next-cache.ts`) stubs `cacheTag` / `updateTag` / `revalidateTag` to `vi.fn()`.
- [x] 1.4 Confirm `@testing-library/react`, `@testing-library/user-event`, `react-hot-toast`, and `vitest` are present (installed by prior carve-outs).
- [x] 1.5 Spec re-grep against `openspec/specs/visit-history/spec.md` at HEAD: confirm the six existing requirements; locate the R3 prose "Remove SHALL be disabled for bookmarked rows" and the two scenarios this change MODIFIES; confirm R1's "upsert … keyed by `(user_id, list_id)`" so the composite-PK clarification slots in without contradiction; confirm no existing SHALL contradicts the new `last_visited_at IS NULL` exclusion requirement.
- [x] 1.6 Read `db/schema.ts` `list_visits` and confirm the dedupe backstop is `primaryKey({ columns: [user_id, list_id] })` (composite PK), NOT a partial unique index — record this as the Decision 4 finding.
- [x] 1.7 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**` and `**/*.test.*`; confirm `lib/dal.ts` and `app/actions/lists.ts` are NOT currently in `thresholds` (they will remain absent per Decision 2).
- [x] 1.8 Determine the `vi.mock('@/db')` + per-`beforeEach` `bootPglite()` wiring (hoisted getter or `vi.hoisted()` per Decision 3/9); record the exact pattern here once proven.

## 2. Write `lib/__tests__/visitHistory.dal.test.ts` (node, PGlite)

### 2A. Setup — PGlite + mocked db + mocked next/cache

- [x] 2.1 `mockNextCache()` at file top; `vi.mock('@/db', …)` resolving to the per-test PGlite instance (Decision 3 wiring).
- [x] 2.2 `beforeEach`: `bootPglite()`; seed a deterministic fixture (two users, lists owned by each, `list_visits` rows covering bookmarked / visited / both / neither, with controlled `favorited_at` and `last_visited_at` timestamps for ordering assertions).
- [x] 2.3 Import the REAL `getBookmarkedListsByUser`, `getBookmarkStatus`, `getVisitHistoryByUser` from `@/lib/dal` (NOT re-implemented).

### 2B. getBookmarkedListsByUser

- [x] 2.4 `FavoritedRowsOnly_ReturnsBookmarkedListsForUser` — returns only `favorited_at IS NOT NULL` rows for the requesting user; excludes another user's bookmarks.
- [x] 2.5 `MultipleBookmarks_OrdersByFavoritedAtDesc` — most-recently-bookmarked first.
- [x] 2.6 `Result_IncludesJoinedOwnerName` — each returned row carries the joined list owner `name`.
- [x] 2.7 `NullLastVisitedButFavorited_StillReturned` **Spec ADDED SHALL** (Decision 6) — a row with `last_visited_at IS NULL` and `favorited_at` set is returned (bookmarks read is independent of `last_visited_at`).

### 2C. getBookmarkStatus

- [x] 2.8 `FavoritedRowExists_ReturnsTrue` — `(listId, userId)` with `favorited_at IS NOT NULL` → `true`.
- [x] 2.9 `RowWithNullFavoritedAt_ReturnsFalse` — visited-but-not-bookmarked → `false`.
- [x] 2.10 `NoRow_ReturnsFalse` — no `list_visits` row → `false`.

### 2D. getVisitHistoryByUser

- [x] 2.11 `LastVisitedRowsOnly_ReturnsVisitedListsForUser` — returns only `last_visited_at IS NOT NULL` rows for the user; excludes another user's visits.
- [x] 2.12 `MultipleVisits_OrdersByLastVisitedAtDesc` **Spec ADDED SHALL** (Decision 6) — most-recently-visited first.
- [x] 2.13 `NullLastVisitedButFavorited_Excluded` **Spec ADDED SHALL** (Decision 6) — a removed-but-bookmarked row (`last_visited_at IS NULL`, `favorited_at` set) is NOT returned.
- [x] 2.14 `LimitAndOffset_PaginatesResult` — `limit`/`offset` honored against the `last_visited_at DESC` order.
- [x] 2.15 `Result_IncludesJoinedOwnerName` — joined owner `name` present.

## 3. Write `app/actions/__tests__/visitHistory.actions.test.ts` (node, PGlite)

### 3A. Setup — PGlite + mocked db + mocked auth + mocked next/cache

- [x] 3.1 `mockNextCache()`; `vi.mock('@/db', …)` → PGlite; `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`.
- [x] 3.2 `beforeEach`: `bootPglite()`; seed users + lists (one `VISIBILITY.OWNER`/private, one `LINK`, one `FOLLOWERS`, one `public`) so the viewability matrix is reachable; configure `auth()` per test.
- [x] 3.3 Import the REAL `bookmarkList`, `unbookmarkList`, `clearVisitHistory`, `removeVisit` from `@/app/actions/lists`.

### 3B. bookmarkList — happy path + viewability gate + auth

- [x] 3.4 `AuthedNonOwnerPublicList_UpsertsFavoritedAt_ReturnsSuccess` — inserts/updates the row with `favorited_at` set; returns `{ success: true }`.
- [x] 3.5 `Success_CallsUpdateTagListVisits` — asserts the mocked `updateTag` was called with `'list_visits'`.
- [x] 3.6 `NonOwnerPrivateList_ReturnsListNotViewable_NoRowInserted` **Spec R5 (existing SHALL)** — non-owner + `VISIBILITY.OWNER` list → `{ success: false, error: 'List not viewable' }`; no `list_visits` row; `updateTag` NOT called.
- [x] 3.7 `OwnerPrivateList_UpsertsFavoritedAt_ReturnsSuccess` — owner bookmarking own private list succeeds.
- [x] 3.8 `AuthedAnyUserLinkOrFollowersList_ReturnsSuccess` — `LINK` and `FOLLOWERS` lists are bookmarkable by any authed caller.
- [x] 3.9 `Unauthenticated_ReturnsUnauthorized` — `auth()` → null → `{ success: false, error: 'Unauthorized' }`; no row.
- [x] 3.10 `BookmarkBeforeAnyVisit_CreatesRowWithFavoritedAt` **Spec R2** — upsert creates the row when none exists.

### 3C. unbookmarkList

- [x] 3.11 `Bookmarked_NullsFavoritedAt_PreservesVisitFields` **Spec R2** — `favorited_at` → null; `last_visited_at` and `visit_count` unchanged; row not deleted.
- [x] 3.12 `Unauthenticated_ReturnsUnauthorized`.

### 3D. clearVisitHistory

- [x] 3.13 `IncludeBookmarkedFalse_DeletesNonBookmarked_NullsLastVisitedOnBookmarked` **Spec R3 MODIFIED** (Decision 5) — non-bookmarked rows deleted; bookmarked rows kept with `last_visited_at` nulled and `favorited_at` intact.
- [x] 3.14 `IncludeBookmarkedTrue_DeletesAllRowsForUser` **Spec R3** — every row for the user deleted, including bookmarked.
- [x] 3.15 `Unauthenticated_ReturnsUnauthorized`.

### 3E. removeVisit

- [x] 3.16 `NonBookmarkedRow_DeletedOutright` **Spec R3 MODIFIED** (Decision 5).
- [x] 3.17 `BookmarkedRow_NullsLastVisited_PreservesRowAndFavoritedAt` **Spec R3 MODIFIED** (Decision 5) — row + `favorited_at` survive; `last_visited_at` nulled.
- [x] 3.18 `NoMatchingRow_ReturnsSuccessNoHistoryRow` — returns `{ success: true, message: 'No history row' }`.
- [x] 3.19 `Unauthenticated_ReturnsUnauthorized`.

### 3F. Visit-recording upsert + dedupe race (Decision 4)

- [x] 3.20 `FirstUpsert_CreatesRowVisitCountOne` — `insert … onConflictDoUpdate(target: [user_id, list_id])` first run → row with `visit_count = 1`.
- [x] 3.21 `RepeatUpsert_IncrementsVisitCount_AdvancesLastVisited_PreservesFavoritedAt` **Spec R1** — second run on existing row increments `visit_count`, advances `last_visited_at`, leaves `favorited_at` untouched.
- [x] 3.22 `ConcurrentUpserts_ConvergeToOneRow_NoUniqueViolation` **Spec R1 MODIFIED clarification** (Decision 4) — `Promise.allSettled([upsertA, upsertB])` for the same `(user_id, list_id)`: both fulfilled, exactly one row, `visit_count` consistent, NO `23505` surfaced. (Records the PGlite single-connection fidelity caveat — Decision 4 / Risks.)

## 4. Write `app/(main)/lists/ui/components/__tests__/BookmarkButton.test.tsx` (jsdom)

### 4A. Setup — mocked actions, toast, router

- [x] 4.1 `vi.mock('@/app/actions/lists', () => ({ bookmarkList: vi.fn(), unbookmarkList: vi.fn() }))` (Decision 7); `vi.mock('react-hot-toast')`; `vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))`.

### 4B. InitialState + ToggleOptimism

- [x] 4.2 `InitialBookmarkedTrue_RendersPressedBookmarkedLabelFilledIcon` — `aria-pressed="true"`, label `Bookmarked`, `FaBookmark`.
- [x] 4.3 `InitialBookmarkedFalse_RendersUnpressedBookmarkLabelOutlineIcon` — `aria-pressed="false"`, label `Bookmark`, `FaRegBookmark`.
- [x] 4.4 `ClickWhenUnbookmarked_OptimisticallyFlipsToBookmarked_CallsBookmarkList` — state flips before the action resolves; `bookmarkList(listId)` invoked.
- [x] 4.5 `ClickWhenBookmarked_OptimisticallyFlipsToUnbookmarked_CallsUnbookmarkList`.

### 4C. Success + Failure paths

- [x] 4.6 `ActionSuccess_PersistsStateAndCallsRouterRefresh` — on `{ success: true }`, state holds and `router.refresh()` fires.
- [x] 4.7 `ActionFailure_RollsBackOptimisticState_CallsToastError` — on `{ success: false, message }`, the pressed state reverts and `toast.error(message)` fires.
- [x] 4.8 `ClickWhilePending_IsNoOp` — second click during the in-flight transition does not invoke the action again (the `isPending` guard).

## 5. Write `app/(main)/lists/history/__tests__/HistoryActions.test.tsx` (jsdom)

### 5A. Setup — mocked actions, toast, router

- [x] 5.1 `vi.mock('@/app/actions/lists', () => ({ removeVisit: vi.fn(), clearVisitHistory: vi.fn() }))`; toast + router mocked.

### 5B. RemoveVisitButton

- [x] 5.2 `Default_RendersEnabledRemoveButtonWithAriaLabel` **Spec R3 MODIFIED** (Decision 5) — the × renders with `aria-label="Remove from history"` and is NOT disabled (no bookmark-conditional disable).
- [x] 5.3 `Click_CallsRemoveVisitWithListId`.
- [x] 5.4 `RemoveSuccess_CallsRouterRefresh`.
- [x] 5.5 `RemoveFailure_CallsToastError`.
- [x] 5.6 `ClickWhilePending_IsNoOp`.

### 5C. ClearHistoryButton

- [x] 5.7 `Default_ModalClosed_NoDialogRendered`.
- [x] 5.8 `ClickClear_OpensConfirmDialog` — `role="dialog"` appears with the two clear options + cancel.
- [x] 5.9 `ClearNonBookmarked_CallsClearVisitHistoryIncludeBookmarkedFalse` **Spec R3**.
- [x] 5.10 `ClearAll_CallsClearVisitHistoryIncludeBookmarkedTrue` **Spec R3**.
- [x] 5.11 `Cancel_ClosesDialogWithoutCallingAction`.
- [x] 5.12 `ClearSuccess_ClosesModalCallsToastSuccessAndRouterRefresh`.
- [x] 5.13 `ClearFailure_CallsToastError`.

## 6. Write `app/(main)/lists/history/__tests__/HistoryCard.test.tsx` (jsdom)

### 6A. Setup — mocked ListCard

- [x] 6.1 `vi.mock('@/app/ui/components/ListCard', () => ({ default: (props) => <div data-testid="list-card" data-bookmarked={String(props.bookmarked)} data-show-owner={String(props.showOwner)} /> }))` (Decision 7 — out-of-carve-out boundary).

### 6B. DomShape + PropContract

- [x] 6.2 `FavoritedRow_PassesBookmarkedTrueToListCard` — `row.favorited_at` set → `<ListCard bookmarked>` receives `true`.
- [x] 6.3 `NonFavoritedRow_PassesBookmarkedFalseToListCard` — `row.favorited_at` null → `false`.
- [x] 6.4 `Always_PassesShowOwnerToListCard`.
- [x] 6.5 `Always_RendersRemoveVisitButtonWithRowListId` **Spec R3 MODIFIED** (Decision 5) — a `RemoveVisitButton` for `row.list_id` renders for every row regardless of bookmark state.

## 7. Audits

### 7.1 Assertion-substance audit (on the new tests)

- [x] 7.1 Walk each of the five files. Every assertion SHALL name observable output (persisted DB state after the action, exact return-value shape, `updateTag` call argument, rendered DOM attribute / label / icon, mocked-action call argument, mocked-router/toast call). No tautologies, no DOM snapshots, no execute-for-coverage. Specifically verify: the dedupe-race test asserts row COUNT and `visit_count` VALUE (not just "no throw"); `bookmarkList` viewability-gate test asserts BOTH the error shape AND the absence of a row AND the absence of an `updateTag` call; `BookmarkButton` failure test asserts the rolled-back `aria-pressed` value, not just that `toast.error` fired.

### 7.2 Duplication audit (across the five files + source)

- [x] 7.2 Identify shared patterns: (a) the PGlite seed fixture (users + lists + `list_visits` rows) used by both node tests — if the two files build the same graph, extract to `test/helpers/` or `test/fixtures/` per testing-foundation's "two or more test files would set up the same DB state → MUST extract" rule (this is the likely extraction; record the disposition); (b) the toast/router mock used by both widget tests — inline OK (≤3 lines each); (c) the `vi.mock('@/db')` + `bootPglite()` wiring — if both node files duplicate non-trivially, extract a `withTestDb()` helper to `test/helpers/`. Record each disposition (inline vs. extracted).
- [x] 7.3 Source duplication: note the near-identical `last_visited_at`-nulling logic shared by `removeVisit` (bookmarked branch) and `clearVisitHistory` (bookmarked branch). Disposition: observe-only (both are inside `app/actions/lists.ts`, single file; extraction is a reasonable in-carve-out refactor but not required for testability — record as a non-blocking note, NOT a deferred sub-proposal, since coverage is already met).

### 7.3 Complexity audit (on the carve-out source)

- [x] 7.4 Run `npm run lint`; confirm zero `sonarjs/cognitive-complexity` warnings/errors on `BookmarkButton.tsx`, `HistoryActions.tsx`, `HistoryCard.tsx` (the three files promoted to `error`). Record measured complexity if surfaced (expected ≤ ~6 each). Note: `lib/dal.ts` and `app/actions/lists.ts` are NOT promoted by this carve-out (Decision 2).

### 7.4 Testability audit (on the carve-out source)

- [x] 7.5 Coverage report: record per-function metrics from `coverage/coverage-summary.json` for the three visit-history DAL reads, the four mutations + `authedUserId`, and the three widgets — confirming each visit-history function meets the universal `COVERAGE_FLOOR` even though `lib/dal.ts` / `app/actions/lists.ts` are not file-gated (Decision 2).
- [x] 7.6 `/* v8 ignore */` annotations: list each with rationale. Expected candidates: the `catch`/`console.error` error branches in the DAL reads and actions (reachable by forcing a DB error, or annotated with rationale if the error path is not meaningfully assertable). Prefer (a) write the test (e.g. force a not-null violation) over (c) annotate; record the chosen disposition per branch.
- [x] 7.7 Record the `ListHeroSection.tsx` visit-recording extraction observation (Decision 1): the `after()` upsert could be extracted into a `recordVisit(viewerId, listId)` helper for gating-predicate attribution. Disposition: **non-blocking observation** (NOT a new sub-proposal) — the upsert contract is fully covered at the DB layer here; the gating-predicate branch coverage belongs to ListHeroSection's owning capability sub-proposal.
- [x] 7.8 Record the PGlite single-connection concurrency fidelity limit (Decision 4) for the dedupe-race test: the `ON CONFLICT` codepath is exercised deterministically, not under true wall-clock parallelism. Disposition: accept-with-rationale (the asserted invariant is the composite-PK guarantee, interleaving-independent).

### 7.5 Invariant-elevation audit

- [x] 7.9 Confirm every new/modified `visit-history` SHALL is asserted by at least one `<State>_<Behavior>` `it()`:
  - R1 MODIFIED (composite-PK dedupe + absorb) → §3.20 / §3.21 / §3.22.
  - R3 MODIFIED (remove available for every row; bookmarked → null `last_visited_at`) → §3.13 / §3.16 / §3.17 / §5.2 / §6.5.
  - ADDED (`last_visited_at IS NULL` exclusion) → §2.7 / §2.12 / §2.13.
  - R5 existing (`bookmarkList` viewability gate) → §3.6.
- [x] 7.10 Confirm no test asserts an invariant lacking a SHALL. Record non-elevated invariants with one-line rationale (e.g. "`BookmarkButton` optimistic rollback — UI ergonomics, derivable from the widget's purpose; not elevated"; "toast messages — copy, not a contract; not elevated").

## 8. Config changes

- [x] 8.1 Add three per-file threshold entries in `vitest.config.ts` `thresholds` referencing `COVERAGE_FLOOR`, under a comment `// test-visit-history (sub-proposal 4.14) — locked at universal COVERAGE_FLOOR.`:
  - `app/(main)/lists/ui/components/BookmarkButton.tsx`
  - `app/(main)/lists/history/HistoryActions.tsx`
  - `app/(main)/lists/history/HistoryCard.tsx`
- [x] 8.2 Confirm `lib/dal.ts` and `app/actions/lists.ts` are NOT added to `thresholds` (Decision 2).
- [x] 8.3 Extend the per-file `sonarjs/cognitive-complexity = error` array in `eslint.config.mjs` to include the three widget files (same comment header). Do NOT add `lib/dal.ts` / `app/actions/lists.ts`.
- [x] 8.4 If the duplication audit (§7.2) extracts a PGlite seed fixture / `withTestDb` helper, confirm it lives under `test/fixtures/` or `test/helpers/` and is covered by the existing `test/**` coverage exclude.

## 9. Apply spec deltas

- [x] 9.1 Apply the two MODIFIED requirements (R1 composite-PK clarification, R3 remove-for-every-row) and the one ADDED requirement (`last_visited_at IS NULL` exclusion) from `specs/visit-history/spec.md` into the active `openspec/specs/visit-history/spec.md`. Validate via `openspec validate visit-history --strict`. No other requirement (R2, R4, R5) is modified.
- [x] 9.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-visit-history/specs/testing-foundation/spec.md` stays archive-only (Tier 2 per D13) — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`.

## 10. Parent governance

- [x] 10.1 Add the multi-capability-shared-file enumeration checkbox to `openspec/changes/test-coverage/tasks.md` (Decision 2) — a new item under §7 governance close-out (or a new top-level checkbox): shared files (`lib/dal.ts`, `app/actions/lists.ts`, and any other file spanning capabilities) SHALL be enumerated in `vitest.config.ts` per-file `thresholds` at the universal `COVERAGE_FLOOR` once every function is covered, OR the per-file rule SHALL gain a per-function mechanism for them; "first surfaced by `test-visit-history` (4.14)".
- [x] 10.2 Leave the §4.14 checkbox unchecked — it flips on archive of this sub-proposal (not at apply).

## 11. Pre-merge

- [x] 11.1 `npm run lint` passes with zero errors; this carve-out introduces zero new warnings (pre-existing carry-forward warnings from prior carve-outs acceptable).
- [x] 11.2 `npx tsc --noEmit` exits 0.
- [x] 11.3 `npm run build` completes successfully.
- [x] 11.4 `npm run test:coverage` passes; the three widget files at universal `COVERAGE_FLOOR` (98/98/95/100) or above; the visit-history DAL/action functions verified at the floor per-function from `coverage-summary.json` (§7.5).
- [x] 11.5 `npm run test:e2e` — record outcome. If no e2e specs exist on this branch, "No tests found" is vacuously acceptable (e2e lands with 6.x).

## 12. Audit disposition record

- [x] 12.1 Record final dispositions for all four audits + invariant-elevation: assertion-substance (all assertions name observable output); duplication (PGlite seed fixture extraction decision; source `last_visited_at`-null logic observed, not deferred); complexity (three widgets at `error`, ≤ ceiling); testability (per-function coverage recorded; error-branch `/* v8 ignore */` or test dispositions; `ListHeroSection` extraction observed-only; PGlite concurrency fidelity accepted); invariant-elevation (R1/R3 MODIFIED + ADDED + R5 mapped to tests; non-elevations recorded). Note the Decision 4 "partial unique index" → composite-PK correction landed in the spec R1 clarification.

### Findings (as-built)

**Files landed** (5 tests + 1 helper): `lib/__tests__/visitHistory.dal.test.ts` (15 it), `app/actions/__tests__/visitHistory.actions.test.ts` (28 it), `app/(main)/lists/ui/components/__tests__/BookmarkButton.test.tsx` (7 it), `app/(main)/lists/history/__tests__/HistoryActions.test.tsx` (13 it), `app/(main)/lists/history/__tests__/HistoryCard.test.tsx` (4 it); shared seed helper `test/helpers/seedVisitGraph.ts` (`seedList`, `seedVisit`).

**7.1 Assertion-substance — PASS.** Every assertion names observable output: persisted `list_visits` state read back via `db.select()`, exact return-value shape (`toMatchObject({ success, error })`), `updateTag.mock.calls` argument, rendered `aria-pressed`/`aria-disabled`/label/icon-testid, mocked-action call args, mocked router/toast calls. Dedupe-race asserts row COUNT (1) AND `visit_count` VALUE (2). `bookmarkList` gate test asserts error shape AND no row AND no `updateTag`. `BookmarkButton` failure test asserts rolled-back `aria-pressed='false'`.

**7.2 Duplication — (a) EXTRACTED** `seedList`/`seedVisit` to `test/helpers/seedVisitGraph.ts` (both node files build the same users+lists+`list_visits` graph → testing-foundation's "2+ files set up same DB state → MUST extract"); `seedUsers` reused from `seedFollowGraph`. **(b) INLINE** toast/router mocks in the two widget files (~3 lines each). **(c) INLINE** the `vi.hoisted` holder + `get db()` getter + `bootPglite()` `beforeEach` wiring — duplicated across the 2 node files but kept inline: it is the established idiom already copied verbatim in `follows.test.ts` and `dal.following.test.ts`, and a `withTestDb()` helper would obscure the per-test `auth()`/seed config. Disposition: do not extract until a 4th+ consumer justifies it (note for 4.9/4.13).

**7.3 Source duplication — observe-only.** `removeVisit` (bookmarked branch) and `clearVisitHistory` (bookmarked branch) both `set({ last_visited_at: null })`. Same file (`app/actions/lists.ts`); not extracted — coverage met, extraction is optional cleanup, not a testability blocker.

**7.4 Complexity — PASS.** `npm run lint` reports zero `sonarjs/cognitive-complexity` on the three widgets (promoted to `error`). `lib/dal.ts` / `app/actions/lists.ts` left at global `warn` (Decision 2); the pre-existing `lists.ts` complexity warning is carry-forward, not promoted.

**7.5 Testability / per-function coverage — PASS** (from `coverage-final.json`, visit-history functions only, scoped run):

| function | file | functions | statements | branches |
|---|---|---|---|---|
| getBookmarkedListsByUser | lib/dal.ts | 100% | 6/6 | n/a (no branch nodes) |
| getBookmarkStatus | lib/dal.ts | 100% | 7/7 | n/a |
| getVisitHistoryByUser | lib/dal.ts | 100% | 6/6 | n/a |
| authedUserId | app/actions/lists.ts | 100% | 5/5 | 4/4 |
| bookmarkList | app/actions/lists.ts | 100% | 13/13 | 7/7 |
| unbookmarkList | app/actions/lists.ts | 100% | 9/9 | 2/2 |
| clearVisitHistory | app/actions/lists.ts | 100% | 12/12 | 4/4 |
| removeVisit | app/actions/lists.ts | 100% | 14/14 | 6/6 |

The three enumerated widget files are at `100/100/100/100` (≥ `COVERAGE_FLOOR`). `lib/dal.ts` / `app/actions/lists.ts` file-level totals stay low (other capabilities' un-run functions) — correctly NOT gated (Decision 2; deferred to parent §7.10).

**7.6 `/* v8 ignore */` / error branches — NONE added; all covered by tests** (preferred disposition (a)). The DAL reads' `catch`/`console.error`/`throw` branches are covered by `ReadErrorPaths` (spy `db.query.list_visits.findMany`/`findFirst` → `mockRejectedValueOnce`). The four actions' `catch` branches are covered by `*Throws_ReturnsFailed-NoUpdateTag` (spy `db.insert`/`update`/`delete` throw, mirroring `follows.test.ts`). `authedUserId`'s "session valid but no user row" branch is covered by `AuthedEmailNoUserRow_ReturnsUnauthorized`. **One source testability finding:** `BookmarkButton` originally selected the action via a conditional `await` (`next ? await bookmarkList(...) : await unbookmarkList(...)`) immediately before `if (!result.success)`, which made v8's branch model mis-attribute the if's implicit-else (success arm reported 0 despite the success statements executing and being asserted). Refactored to `const action = next ? bookmarkList : unbookmarkList; const result = await action(listId);` — behavior-preserving, slightly cleaner, and v8 then counts the branch (file → 100% branches). The identically-structured `if` in `HistoryActions.RemoveVisitButton` was unaffected. This is the only production-source change in the carve-out.

**7.7 `ListHeroSection.tsx` extraction — observed-only** (Decision 1). The `after()` upsert contract is fully covered at the DB layer via the in-test `recordVisit()` mirror; extracting a `recordVisit(viewerId, listId)` helper would only improve gating-predicate file attribution, owned by ListHeroSection's sub-proposal. Not a new sub-proposal.

**7.8 PGlite concurrency fidelity — accept-with-rationale** (Decision 4). `ConcurrentUpserts_ConvergeToOneRow-NoUniqueViolation` exercises the `ON CONFLICT DO UPDATE` codepath deterministically (single in-process connection serializes the two upserts: insert → conflict-absorb), not under wall-clock parallelism. The asserted invariant (exactly one row, `visit_count = 2`, no `23505`) is the composite-PK guarantee, interleaving-independent.

**7.9 Invariant-elevation mapping — confirmed.** R1 MODIFIED (composite-PK + absorb) → `recordVisitUpsert` `FirstUpsert…` / `RepeatUpsert…` / `ConcurrentUpserts…`. R3 MODIFIED (remove for every row; bookmarked → null `last_visited_at`) → `clearVisitHistory.IncludeBookmarkedFalse…`, `removeVisit.NonBookmarkedRow…`/`BookmarkedRow…`, `HistoryActions.Default_RendersEnabledRemoveButtonWithAriaLabel`, `HistoryCard.Always_RendersRemoveVisitButtonWithRowListId`. ADDED (`last_visited_at IS NULL` exclusion) → dal `NullLastVisitedButFavorited_StillReturned` / `MultipleVisits_OrdersByLastVisitedAtDesc` / `NullLastVisitedButFavorited_Excluded`. R5 (viewability gate) → `NonOwnerPrivateList_ReturnsListNotViewable-NoRowInserted`.

**7.10 Non-elevated invariants (asserted but no SHALL) — rationale:** `BookmarkButton` optimistic flip + rollback and the `isPending`/`aria-disabled` no-op guard — UI ergonomics derivable from the widget's purpose, not a capability contract; not elevated. Toast message strings (`'Bookmarked'`, `'History cleared'`, `result.message`) — copy, not contract; not elevated. `router.refresh()` on success — Next data-revalidation mechanics, not a visit-history invariant; not elevated. `ClearHistoryButton` confirm-dialog open/close flow — widget interaction, not a spec'd contract; not elevated.

**11.4 / environment note.** `npm run test:coverage` (full dual-project run) flakes on this machine with `bootPglite()` `hookTimeout` (10s) failures — an environmental artifact of many agents/processes contending for CPU during the v8-instrumented run, NOT a code or test defect: the same timeouts reproduce on the pristine baseline (this change stashed), and the **node project alone passes 280/280** including all 31 new node tests. The carve-out's coverage targets were verified via scoped `--coverage` runs (widgets `100/100/100/100`; visit-history functions per-function table above). Decision 9's per-`it` boot stands; the boot-cost-at-scale optimization remains deferred (Decision 9 / Risks).

**11.5 e2e — vacuously acceptable.** `e2e/` contains no spec files (0 `*.spec.ts`); `npm run test:e2e` cannot discover tests and only fails at Playwright's `webServer` boot (no local `DATABASE_URL`). E2E lands with 6.x per the parent roadmap. Gates passed: lint (0 errors), `tsc --noEmit` (0), `next build` (exit 0).

**Rebase reconciliation (onto `dev` @ fadd1cc).** Between proposal and apply, `test-list-item-management` (4.9) and `test-server-endpoint-authorization` (4.13) merged to `dev` and enumerated `app/actions/lists.ts` (plus `items.ts` / `user.ts`) whole-file in both `vitest.config.ts` `thresholds` and the `eslint.config.mjs` complexity-error array. This partially supersedes Decision 2: `app/actions/lists.ts` is no longer deferred — this carve-out's four mutations are covered under 4.9's existing whole-file gate (which now passes because 4.9's + this change's tests jointly cover the file). Only `lib/dal.ts` remains deferred (its three visit-history reads covered to the floor per-function, §7.5). The config additions here are therefore the three widget files only; the parent §7.10 note was updated to record the `lists.ts` resolution. Rebase conflicts (both config files, same-region list insertions) resolved by keeping dev's 4.7/4.8/4.9/4.12/4.13 entries and appending the three widget entries; lint/`tsc`/the five test files re-verified green post-rebase.
