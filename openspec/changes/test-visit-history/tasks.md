## 1. Confirm foundation surfaces are usable

- [ ] 1.1 Confirm the node project resolves `@/` and runs `.test.ts` files (`test/helpers/db.test.ts` + `next-cache.test.ts` already pass under it).
- [ ] 1.2 Confirm `bootPglite()` (`test/helpers/db.ts`) boots an in-memory Postgres and replays all `drizzle/` migrations including the `list_visits` table (composite PK `(user_id, list_id)`).
- [ ] 1.3 Confirm `mockNextCache()` (`test/helpers/next-cache.ts`) stubs `cacheTag` / `updateTag` / `revalidateTag` to `vi.fn()`.
- [ ] 1.4 Confirm `@testing-library/react`, `@testing-library/user-event`, `react-hot-toast`, and `vitest` are present (installed by prior carve-outs).
- [ ] 1.5 Spec re-grep against `openspec/specs/visit-history/spec.md` at HEAD: confirm the six existing requirements; locate the R3 prose "Remove SHALL be disabled for bookmarked rows" and the two scenarios this change MODIFIES; confirm R1's "upsert … keyed by `(user_id, list_id)`" so the composite-PK clarification slots in without contradiction; confirm no existing SHALL contradicts the new `last_visited_at IS NULL` exclusion requirement.
- [ ] 1.6 Read `db/schema.ts` `list_visits` and confirm the dedupe backstop is `primaryKey({ columns: [user_id, list_id] })` (composite PK), NOT a partial unique index — record this as the Decision 4 finding.
- [ ] 1.7 Confirm `vitest.config.ts` `coverage.exclude` contains `**/__tests__/**` and `**/*.test.*`; confirm `lib/dal.ts` and `app/actions/lists.ts` are NOT currently in `thresholds` (they will remain absent per Decision 2).
- [ ] 1.8 Determine the `vi.mock('@/db')` + per-`beforeEach` `bootPglite()` wiring (hoisted getter or `vi.hoisted()` per Decision 3/9); record the exact pattern here once proven.

## 2. Write `lib/__tests__/visitHistory.dal.test.ts` (node, PGlite)

### 2A. Setup — PGlite + mocked db + mocked next/cache

- [ ] 2.1 `mockNextCache()` at file top; `vi.mock('@/db', …)` resolving to the per-test PGlite instance (Decision 3 wiring).
- [ ] 2.2 `beforeEach`: `bootPglite()`; seed a deterministic fixture (two users, lists owned by each, `list_visits` rows covering bookmarked / visited / both / neither, with controlled `favorited_at` and `last_visited_at` timestamps for ordering assertions).
- [ ] 2.3 Import the REAL `getBookmarkedListsByUser`, `getBookmarkStatus`, `getVisitHistoryByUser` from `@/lib/dal` (NOT re-implemented).

### 2B. getBookmarkedListsByUser

- [ ] 2.4 `FavoritedRowsOnly_ReturnsBookmarkedListsForUser` — returns only `favorited_at IS NOT NULL` rows for the requesting user; excludes another user's bookmarks.
- [ ] 2.5 `MultipleBookmarks_OrdersByFavoritedAtDesc` — most-recently-bookmarked first.
- [ ] 2.6 `Result_IncludesJoinedOwnerName` — each returned row carries the joined list owner `name`.
- [ ] 2.7 `NullLastVisitedButFavorited_StillReturned` **Spec ADDED SHALL** (Decision 6) — a row with `last_visited_at IS NULL` and `favorited_at` set is returned (bookmarks read is independent of `last_visited_at`).

### 2C. getBookmarkStatus

- [ ] 2.8 `FavoritedRowExists_ReturnsTrue` — `(listId, userId)` with `favorited_at IS NOT NULL` → `true`.
- [ ] 2.9 `RowWithNullFavoritedAt_ReturnsFalse` — visited-but-not-bookmarked → `false`.
- [ ] 2.10 `NoRow_ReturnsFalse` — no `list_visits` row → `false`.

### 2D. getVisitHistoryByUser

- [ ] 2.11 `LastVisitedRowsOnly_ReturnsVisitedListsForUser` — returns only `last_visited_at IS NOT NULL` rows for the user; excludes another user's visits.
- [ ] 2.12 `MultipleVisits_OrdersByLastVisitedAtDesc` **Spec ADDED SHALL** (Decision 6) — most-recently-visited first.
- [ ] 2.13 `NullLastVisitedButFavorited_Excluded` **Spec ADDED SHALL** (Decision 6) — a removed-but-bookmarked row (`last_visited_at IS NULL`, `favorited_at` set) is NOT returned.
- [ ] 2.14 `LimitAndOffset_PaginatesResult` — `limit`/`offset` honored against the `last_visited_at DESC` order.
- [ ] 2.15 `Result_IncludesJoinedOwnerName` — joined owner `name` present.

## 3. Write `app/actions/__tests__/visitHistory.actions.test.ts` (node, PGlite)

### 3A. Setup — PGlite + mocked db + mocked auth + mocked next/cache

- [ ] 3.1 `mockNextCache()`; `vi.mock('@/db', …)` → PGlite; `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))`.
- [ ] 3.2 `beforeEach`: `bootPglite()`; seed users + lists (one `VISIBILITY.OWNER`/private, one `LINK`, one `FOLLOWERS`, one `public`) so the viewability matrix is reachable; configure `auth()` per test.
- [ ] 3.3 Import the REAL `bookmarkList`, `unbookmarkList`, `clearVisitHistory`, `removeVisit` from `@/app/actions/lists`.

### 3B. bookmarkList — happy path + viewability gate + auth

- [ ] 3.4 `AuthedNonOwnerPublicList_UpsertsFavoritedAt_ReturnsSuccess` — inserts/updates the row with `favorited_at` set; returns `{ success: true }`.
- [ ] 3.5 `Success_CallsUpdateTagListVisits` — asserts the mocked `updateTag` was called with `'list_visits'`.
- [ ] 3.6 `NonOwnerPrivateList_ReturnsListNotViewable_NoRowInserted` **Spec R5 (existing SHALL)** — non-owner + `VISIBILITY.OWNER` list → `{ success: false, error: 'List not viewable' }`; no `list_visits` row; `updateTag` NOT called.
- [ ] 3.7 `OwnerPrivateList_UpsertsFavoritedAt_ReturnsSuccess` — owner bookmarking own private list succeeds.
- [ ] 3.8 `AuthedAnyUserLinkOrFollowersList_ReturnsSuccess` — `LINK` and `FOLLOWERS` lists are bookmarkable by any authed caller.
- [ ] 3.9 `Unauthenticated_ReturnsUnauthorized` — `auth()` → null → `{ success: false, error: 'Unauthorized' }`; no row.
- [ ] 3.10 `BookmarkBeforeAnyVisit_CreatesRowWithFavoritedAt` **Spec R2** — upsert creates the row when none exists.

### 3C. unbookmarkList

- [ ] 3.11 `Bookmarked_NullsFavoritedAt_PreservesVisitFields` **Spec R2** — `favorited_at` → null; `last_visited_at` and `visit_count` unchanged; row not deleted.
- [ ] 3.12 `Unauthenticated_ReturnsUnauthorized`.

### 3D. clearVisitHistory

- [ ] 3.13 `IncludeBookmarkedFalse_DeletesNonBookmarked_NullsLastVisitedOnBookmarked` **Spec R3 MODIFIED** (Decision 5) — non-bookmarked rows deleted; bookmarked rows kept with `last_visited_at` nulled and `favorited_at` intact.
- [ ] 3.14 `IncludeBookmarkedTrue_DeletesAllRowsForUser` **Spec R3** — every row for the user deleted, including bookmarked.
- [ ] 3.15 `Unauthenticated_ReturnsUnauthorized`.

### 3E. removeVisit

- [ ] 3.16 `NonBookmarkedRow_DeletedOutright` **Spec R3 MODIFIED** (Decision 5).
- [ ] 3.17 `BookmarkedRow_NullsLastVisited_PreservesRowAndFavoritedAt` **Spec R3 MODIFIED** (Decision 5) — row + `favorited_at` survive; `last_visited_at` nulled.
- [ ] 3.18 `NoMatchingRow_ReturnsSuccessNoHistoryRow` — returns `{ success: true, message: 'No history row' }`.
- [ ] 3.19 `Unauthenticated_ReturnsUnauthorized`.

### 3F. Visit-recording upsert + dedupe race (Decision 4)

- [ ] 3.20 `FirstUpsert_CreatesRowVisitCountOne` — `insert … onConflictDoUpdate(target: [user_id, list_id])` first run → row with `visit_count = 1`.
- [ ] 3.21 `RepeatUpsert_IncrementsVisitCount_AdvancesLastVisited_PreservesFavoritedAt` **Spec R1** — second run on existing row increments `visit_count`, advances `last_visited_at`, leaves `favorited_at` untouched.
- [ ] 3.22 `ConcurrentUpserts_ConvergeToOneRow_NoUniqueViolation` **Spec R1 MODIFIED clarification** (Decision 4) — `Promise.allSettled([upsertA, upsertB])` for the same `(user_id, list_id)`: both fulfilled, exactly one row, `visit_count` consistent, NO `23505` surfaced. (Records the PGlite single-connection fidelity caveat — Decision 4 / Risks.)

## 4. Write `app/(main)/lists/ui/components/__tests__/BookmarkButton.test.tsx` (jsdom)

### 4A. Setup — mocked actions, toast, router

- [ ] 4.1 `vi.mock('@/app/actions/lists', () => ({ bookmarkList: vi.fn(), unbookmarkList: vi.fn() }))` (Decision 7); `vi.mock('react-hot-toast')`; `vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))`.

### 4B. InitialState + ToggleOptimism

- [ ] 4.2 `InitialBookmarkedTrue_RendersPressedBookmarkedLabelFilledIcon` — `aria-pressed="true"`, label `Bookmarked`, `FaBookmark`.
- [ ] 4.3 `InitialBookmarkedFalse_RendersUnpressedBookmarkLabelOutlineIcon` — `aria-pressed="false"`, label `Bookmark`, `FaRegBookmark`.
- [ ] 4.4 `ClickWhenUnbookmarked_OptimisticallyFlipsToBookmarked_CallsBookmarkList` — state flips before the action resolves; `bookmarkList(listId)` invoked.
- [ ] 4.5 `ClickWhenBookmarked_OptimisticallyFlipsToUnbookmarked_CallsUnbookmarkList`.

### 4C. Success + Failure paths

- [ ] 4.6 `ActionSuccess_PersistsStateAndCallsRouterRefresh` — on `{ success: true }`, state holds and `router.refresh()` fires.
- [ ] 4.7 `ActionFailure_RollsBackOptimisticState_CallsToastError` — on `{ success: false, message }`, the pressed state reverts and `toast.error(message)` fires.
- [ ] 4.8 `ClickWhilePending_IsNoOp` — second click during the in-flight transition does not invoke the action again (the `isPending` guard).

## 5. Write `app/(main)/lists/history/__tests__/HistoryActions.test.tsx` (jsdom)

### 5A. Setup — mocked actions, toast, router

- [ ] 5.1 `vi.mock('@/app/actions/lists', () => ({ removeVisit: vi.fn(), clearVisitHistory: vi.fn() }))`; toast + router mocked.

### 5B. RemoveVisitButton

- [ ] 5.2 `Default_RendersEnabledRemoveButtonWithAriaLabel` **Spec R3 MODIFIED** (Decision 5) — the × renders with `aria-label="Remove from history"` and is NOT disabled (no bookmark-conditional disable).
- [ ] 5.3 `Click_CallsRemoveVisitWithListId`.
- [ ] 5.4 `RemoveSuccess_CallsRouterRefresh`.
- [ ] 5.5 `RemoveFailure_CallsToastError`.
- [ ] 5.6 `ClickWhilePending_IsNoOp`.

### 5C. ClearHistoryButton

- [ ] 5.7 `Default_ModalClosed_NoDialogRendered`.
- [ ] 5.8 `ClickClear_OpensConfirmDialog` — `role="dialog"` appears with the two clear options + cancel.
- [ ] 5.9 `ClearNonBookmarked_CallsClearVisitHistoryIncludeBookmarkedFalse` **Spec R3**.
- [ ] 5.10 `ClearAll_CallsClearVisitHistoryIncludeBookmarkedTrue` **Spec R3**.
- [ ] 5.11 `Cancel_ClosesDialogWithoutCallingAction`.
- [ ] 5.12 `ClearSuccess_ClosesModalCallsToastSuccessAndRouterRefresh`.
- [ ] 5.13 `ClearFailure_CallsToastError`.

## 6. Write `app/(main)/lists/history/__tests__/HistoryCard.test.tsx` (jsdom)

### 6A. Setup — mocked ListCard

- [ ] 6.1 `vi.mock('@/app/ui/components/ListCard', () => ({ default: (props) => <div data-testid="list-card" data-bookmarked={String(props.bookmarked)} data-show-owner={String(props.showOwner)} /> }))` (Decision 7 — out-of-carve-out boundary).

### 6B. DomShape + PropContract

- [ ] 6.2 `FavoritedRow_PassesBookmarkedTrueToListCard` — `row.favorited_at` set → `<ListCard bookmarked>` receives `true`.
- [ ] 6.3 `NonFavoritedRow_PassesBookmarkedFalseToListCard` — `row.favorited_at` null → `false`.
- [ ] 6.4 `Always_PassesShowOwnerToListCard`.
- [ ] 6.5 `Always_RendersRemoveVisitButtonWithRowListId` **Spec R3 MODIFIED** (Decision 5) — a `RemoveVisitButton` for `row.list_id` renders for every row regardless of bookmark state.

## 7. Audits

### 7.1 Assertion-substance audit (on the new tests)

- [ ] 7.1 Walk each of the five files. Every assertion SHALL name observable output (persisted DB state after the action, exact return-value shape, `updateTag` call argument, rendered DOM attribute / label / icon, mocked-action call argument, mocked-router/toast call). No tautologies, no DOM snapshots, no execute-for-coverage. Specifically verify: the dedupe-race test asserts row COUNT and `visit_count` VALUE (not just "no throw"); `bookmarkList` viewability-gate test asserts BOTH the error shape AND the absence of a row AND the absence of an `updateTag` call; `BookmarkButton` failure test asserts the rolled-back `aria-pressed` value, not just that `toast.error` fired.

### 7.2 Duplication audit (across the five files + source)

- [ ] 7.2 Identify shared patterns: (a) the PGlite seed fixture (users + lists + `list_visits` rows) used by both node tests — if the two files build the same graph, extract to `test/helpers/` or `test/fixtures/` per testing-foundation's "two or more test files would set up the same DB state → MUST extract" rule (this is the likely extraction; record the disposition); (b) the toast/router mock used by both widget tests — inline OK (≤3 lines each); (c) the `vi.mock('@/db')` + `bootPglite()` wiring — if both node files duplicate non-trivially, extract a `withTestDb()` helper to `test/helpers/`. Record each disposition (inline vs. extracted).
- [ ] 7.3 Source duplication: note the near-identical `last_visited_at`-nulling logic shared by `removeVisit` (bookmarked branch) and `clearVisitHistory` (bookmarked branch). Disposition: observe-only (both are inside `app/actions/lists.ts`, single file; extraction is a reasonable in-carve-out refactor but not required for testability — record as a non-blocking note, NOT a deferred sub-proposal, since coverage is already met).

### 7.3 Complexity audit (on the carve-out source)

- [ ] 7.4 Run `npm run lint`; confirm zero `sonarjs/cognitive-complexity` warnings/errors on `BookmarkButton.tsx`, `HistoryActions.tsx`, `HistoryCard.tsx` (the three files promoted to `error`). Record measured complexity if surfaced (expected ≤ ~6 each). Note: `lib/dal.ts` and `app/actions/lists.ts` are NOT promoted by this carve-out (Decision 2).

### 7.4 Testability audit (on the carve-out source)

- [ ] 7.5 Coverage report: record per-function metrics from `coverage/coverage-summary.json` for the three visit-history DAL reads, the four mutations + `authedUserId`, and the three widgets — confirming each visit-history function meets the universal `COVERAGE_FLOOR` even though `lib/dal.ts` / `app/actions/lists.ts` are not file-gated (Decision 2).
- [ ] 7.6 `/* v8 ignore */` annotations: list each with rationale. Expected candidates: the `catch`/`console.error` error branches in the DAL reads and actions (reachable by forcing a DB error, or annotated with rationale if the error path is not meaningfully assertable). Prefer (a) write the test (e.g. force a not-null violation) over (c) annotate; record the chosen disposition per branch.
- [ ] 7.7 Record the `ListHeroSection.tsx` visit-recording extraction observation (Decision 1): the `after()` upsert could be extracted into a `recordVisit(viewerId, listId)` helper for gating-predicate attribution. Disposition: **non-blocking observation** (NOT a new sub-proposal) — the upsert contract is fully covered at the DB layer here; the gating-predicate branch coverage belongs to ListHeroSection's owning capability sub-proposal.
- [ ] 7.8 Record the PGlite single-connection concurrency fidelity limit (Decision 4) for the dedupe-race test: the `ON CONFLICT` codepath is exercised deterministically, not under true wall-clock parallelism. Disposition: accept-with-rationale (the asserted invariant is the composite-PK guarantee, interleaving-independent).

### 7.5 Invariant-elevation audit

- [ ] 7.9 Confirm every new/modified `visit-history` SHALL is asserted by at least one `<State>_<Behavior>` `it()`:
  - R1 MODIFIED (composite-PK dedupe + absorb) → §3.20 / §3.21 / §3.22.
  - R3 MODIFIED (remove available for every row; bookmarked → null `last_visited_at`) → §3.13 / §3.16 / §3.17 / §5.2 / §6.5.
  - ADDED (`last_visited_at IS NULL` exclusion) → §2.7 / §2.12 / §2.13.
  - R5 existing (`bookmarkList` viewability gate) → §3.6.
- [ ] 7.10 Confirm no test asserts an invariant lacking a SHALL. Record non-elevated invariants with one-line rationale (e.g. "`BookmarkButton` optimistic rollback — UI ergonomics, derivable from the widget's purpose; not elevated"; "toast messages — copy, not a contract; not elevated").

## 8. Config changes

- [ ] 8.1 Add three per-file threshold entries in `vitest.config.ts` `thresholds` referencing `COVERAGE_FLOOR`, under a comment `// test-visit-history (sub-proposal 4.14) — locked at universal COVERAGE_FLOOR.`:
  - `app/(main)/lists/ui/components/BookmarkButton.tsx`
  - `app/(main)/lists/history/HistoryActions.tsx`
  - `app/(main)/lists/history/HistoryCard.tsx`
- [ ] 8.2 Confirm `lib/dal.ts` and `app/actions/lists.ts` are NOT added to `thresholds` (Decision 2).
- [ ] 8.3 Extend the per-file `sonarjs/cognitive-complexity = error` array in `eslint.config.mjs` to include the three widget files (same comment header). Do NOT add `lib/dal.ts` / `app/actions/lists.ts`.
- [ ] 8.4 If the duplication audit (§7.2) extracts a PGlite seed fixture / `withTestDb` helper, confirm it lives under `test/fixtures/` or `test/helpers/` and is covered by the existing `test/**` coverage exclude.

## 9. Apply spec deltas

- [ ] 9.1 Apply the two MODIFIED requirements (R1 composite-PK clarification, R3 remove-for-every-row) and the one ADDED requirement (`last_visited_at IS NULL` exclusion) from `specs/visit-history/spec.md` into the active `openspec/specs/visit-history/spec.md`. Validate via `openspec validate visit-history --strict`. No other requirement (R2, R4, R5) is modified.
- [ ] 9.2 Confirm the carve-out bookkeeping spec at `openspec/changes/test-visit-history/specs/testing-foundation/spec.md` stays archive-only (Tier 2 per D13) — did NOT roll into the parent `test-coverage` accumulator and did NOT modify the active `openspec/specs/testing-foundation/spec.md`.

## 10. Parent governance

- [ ] 10.1 Add the multi-capability-shared-file enumeration checkbox to `openspec/changes/test-coverage/tasks.md` (Decision 2) — a new item under §7 governance close-out (or a new top-level checkbox): shared files (`lib/dal.ts`, `app/actions/lists.ts`, and any other file spanning capabilities) SHALL be enumerated in `vitest.config.ts` per-file `thresholds` at the universal `COVERAGE_FLOOR` once every function is covered, OR the per-file rule SHALL gain a per-function mechanism for them; "first surfaced by `test-visit-history` (4.14)".
- [ ] 10.2 Leave the §4.14 checkbox unchecked — it flips on archive of this sub-proposal (not at apply).

## 11. Pre-merge

- [ ] 11.1 `npm run lint` passes with zero errors; this carve-out introduces zero new warnings (pre-existing carry-forward warnings from prior carve-outs acceptable).
- [ ] 11.2 `npx tsc --noEmit` exits 0.
- [ ] 11.3 `npm run build` completes successfully.
- [ ] 11.4 `npm run test:coverage` passes; the three widget files at universal `COVERAGE_FLOOR` (98/98/95/100) or above; the visit-history DAL/action functions verified at the floor per-function from `coverage-summary.json` (§7.5).
- [ ] 11.5 `npm run test:e2e` — record outcome. If no e2e specs exist on this branch, "No tests found" is vacuously acceptable (e2e lands with 6.x).

## 12. Audit disposition record

- [ ] 12.1 Record final dispositions for all four audits + invariant-elevation: assertion-substance (all assertions name observable output); duplication (PGlite seed fixture extraction decision; source `last_visited_at`-null logic observed, not deferred); complexity (three widgets at `error`, ≤ ceiling); testability (per-function coverage recorded; error-branch `/* v8 ignore */` or test dispositions; `ListHeroSection` extraction observed-only; PGlite concurrency fidelity accepted); invariant-elevation (R1/R3 MODIFIED + ADDED + R5 mapped to tests; non-elevations recorded). Note the Decision 4 "partial unique index" → composite-PK correction landed in the spec R1 clarification.
