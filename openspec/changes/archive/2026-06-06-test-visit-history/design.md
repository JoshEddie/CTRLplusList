## Context

Sub-proposal 4.14 of the `test-coverage` initiative — the FIRST capability-flow carve-out to test backing **DAL reads** and **server-action mutations** against a real database. All prior carve-outs (the six primitive families, `test-pure-libs`, `test-app-frame`) were pure-logic or jsdom component/hook tests. `test-foundation` (archived) chose **PGlite** as the DB-under-test (in-memory Postgres, migrations replayed from `drizzle/` via `bootPglite()` in `test/helpers/db.ts`) and split vitest into two projects: `.test.tsx` → jsdom, `.test.ts` → node. The `test-foundation-spike` PoC validated the approach against visit-history-adjacent surfaces (`dal-cache.test.ts` proved DAL-query correctness against PGlite with the cache layer mocked elsewhere; `race.test.ts` proved the `purchases` partial-unique-index race and captured the key fidelity finding that PGlite surfaces SQLSTATE on `err.cause.code`, not `err.code`).

The `visit-history` capability owns three DAL reads (`getBookmarkedListsByUser`, `getBookmarkStatus`, `getVisitHistoryByUser` in `lib/dal.ts`), four server-action mutations (`bookmarkList`, `unbookmarkList`, `clearVisitHistory`, `removeVisit` in `app/actions/lists.ts`, plus the private `authedUserId` helper), the visit-recording upsert (inlined in `app/(main)/lists/[id]/ListHeroSection.tsx` via Next's `after()`), and a set of interactive widgets (`BookmarkButton.tsx`, `HistoryActions.tsx`, `HistoryCard.tsx`). The `list_visits` table (`db/schema.ts`) is keyed by a **composite primary key `(user_id, list_id)`** with columns `last_visited_at` (nullable), `visit_count` (default 1), `favorited_at` (nullable).

Carve-out (the visit-history capability's testable surface):

| File | Functions / behavior | Tested how |
|---|---|---|
| `lib/dal.ts` (3 of 20 fns) | `getBookmarkedListsByUser` (`favorited_at IS NOT NULL`, `favorited_at DESC`, joins owner name, uncached), `getBookmarkStatus` (`'use cache'` + `cacheTag('list_visits')`; bool), `getVisitHistoryByUser` (`last_visited_at IS NOT NULL`, `last_visited_at DESC`, limit/offset, uncached) | node + PGlite; `@/db` mocked to the PGlite instance; `next/cache` mocked |
| `app/actions/lists.ts` (4 of 10 fns + helper) | `bookmarkList` (viewability gate + upsert `favorited_at`), `unbookmarkList` (null `favorited_at`), `clearVisitHistory` (delete vs. null-`last_visited_at`), `removeVisit` (delete non-bookmarked / null-`last_visited_at` bookmarked), `authedUserId` (auth → user id) | node + PGlite; `@/lib/auth` mocked at the NextAuth boundary; `@/db` + `next/cache` mocked |
| visit-recording upsert | `insert(list_visits).onConflictDoUpdate(target: [user_id, list_id])` — count init / increment / dedupe-under-concurrency | node + PGlite; the upsert exercised directly (the `ListHeroSection.tsx` FILE is out of carve-out) |
| `app/(main)/lists/ui/components/BookmarkButton.tsx` | `'use client'`. Optimistic toggle: `useState(bookmarked)` + `useTransition`; calls `bookmarkList`/`unbookmarkList`; rolls back + toasts on failure; `router.refresh()` on success; `aria-pressed` + label + icon reflect state | jsdom + RTL + userEvent; actions + `react-hot-toast` + `useRouter` mocked |
| `app/(main)/lists/history/HistoryActions.tsx` | `'use client'`. `RemoveVisitButton` (always-enabled × → `removeVisit`) + `ClearHistoryButton` (confirm `role="dialog"` → `clearVisitHistory({ includeBookmarked })`) | jsdom + RTL + userEvent; actions + toast + router mocked |
| `app/(main)/lists/history/HistoryCard.tsx` | Pure. Renders `<ListCard bookmarked={!!row.favorited_at} showOwner>` + `<RemoveVisitButton listId={row.list_id} />` | jsdom + RTL; `ListCard` mocked (out of carve-out) |

Coverage floor: universal `COVERAGE_FLOOR` (98 / 98 / 95 / 100) per `test-housekeeping`. **Enumerated by-name in `vitest.config.ts` for the three widget files only** — the two shared multi-capability files are deferred (Decision 2).

Bound by: `testing-foundation` (active accumulator + archived deltas), `visit-history` (active — six SHALLs), `list-collections` (active — owns the bookmarks/history page chrome), `button-system` (active — the widgets render through `<Button>`), `list-visibility` (active — `bookmarkList`'s viewability gate is an authorization invariant the `visit-history` spec already locks).

## Goals / Non-Goals

**Goals:**

- Land five colocated test files: two node-project DAL/action integration tests against PGlite, three jsdom widget tests.
- Exercise every observable branch of the three visit-history DAL reads, the four mutations + `authedUserId`, the visit-recording upsert + dedupe race, and the three widgets — to the universal `COVERAGE_FLOOR` for the in-carve-out functions.
- Establish the DB-under-test + auth-boundary-mock + `next/cache`-mock pattern as the template for all future DAL/action carve-outs (4.2, 4.9, 4.11, 4.13).
- Promote `sonarjs/cognitive-complexity` to `error` for the three widget files.
- MODIFY the `visit-history` spec's two stale R3 "remove disabled for bookmarked" scenarios; ADD the history-view `last_visited_at IS NULL` exclusion SHALL; ADD an R1 clarification naming the composite-PK dedupe backstop.
- Complete the four-audit + invariant-elevation obligations, recording dispositions in `tasks.md` — including the multi-capability-shared-file coverage-enforcement gap (deferred as a new governance checkbox) and the parent's "partial unique index" mislabel correction.

**Non-Goals:**

- No coverage-floor enumeration for `lib/dal.ts` / `app/actions/lists.ts` (Decision 2 — multi-capability shared files; deferred).
- No coverage of `ListHeroSection.tsx` as a file (Decision 1 — owned by the list-detail/hero capability; only the visit-recording upsert contract inside it is exercised, at the DB layer).
- No coverage of the bookmarks/history page chrome — `BookmarksPage.tsx`, `BookmarksList.tsx`, `HistoryPage.tsx`, `HistoryList.tsx`, the `page.tsx` shells, `ListCard.tsx` (Decision 1 — owned by `list-collections`, 4.6).
- No re-verification of R4 (the `saved_lists` → `list_visits` migration) — a one-time historical migration outcome verified at archive of `add-following-and-history` (Decision 8).
- No real-runtime cache-invalidation assertion — `next/cache` is mocked; tests assert the `updateTag('list_visits')` CALL shape. End-to-end tag invalidation is e2e's job (6.x), per the spike's recommendation (b).
- No real Google OAuth — `@/lib/auth`'s `auth()` is mocked at the NextAuth boundary per testing-foundation's allowance.
- No DOM-snapshot tests; no tautologies; no execute-for-coverage.
- No new `seed-dev-users.ts` edit — the node tests seed PGlite inline (or via a local helper); the e2e seed-as-fixture is untouched.

## Decisions

### Decision 1: Carve-out boundary — visit-history owns the data layer + its specific interactive widgets; the page chrome and the visit-recording host file are deferred to their owning capabilities.

The `visit-history` capability's testable surface overlaps two other capabilities at the file level:

1. **The `/lists/bookmarks` and `/lists/history` page chrome** — `test-app-frame` (4.1) already drew the boundary that these two routes belong to `list-collections` (its `AppNav` peer-route-exclusion decision named them "the bookmark / visit-history peer collections, which belong to the `list-collections` capability"). The parent §4.6 `test-list-collections` names `ListCard.tsx`, `ListCardRow.tsx`, `MoreCard.tsx`, `ListCollectionsNav.tsx` as its page-UI. The page shells (`BookmarksPage`, `BookmarksList`, `HistoryPage`, `HistoryList`, the `page.tsx` files) are collection-grid rendering — `list-collections` territory.

2. **The visit-recording host file** — `ListHeroSection.tsx` is owned by the list-detail / list-hero capability. It does far more than record a visit (`guardListViewable`, `ListPrivate`, `ListDetails`, preview/spoiler search-param handling). The visit-recording `after()` block is the only visit-history behavior in it.

**Boundary drawn:** this carve-out owns (a) the three visit-history **DAL reads**, (b) the four visit-history **mutations** + `authedUserId`, (c) the **visit-recording upsert CONTRACT** (tested at the DB layer, not via the host file), and (d) the visit-history-SPECIFIC **interactive widgets** that §4.6's file list does NOT name: `BookmarkButton.tsx`, `HistoryActions.tsx`, `HistoryCard.tsx`. These three widgets are the DOM surface of spec R2 (bookmark toggle) and R3 (per-row remove + bulk clear) — they belong to `visit-history`, not `list-collections`.

The render-time **gating predicate** for visit recording (authed AND non-owner AND `visibility !== OWNER` → record) lives in `ListHeroSection.tsx` and its file coverage is deferred to that file's owning sub-proposal. What this carve-out locks is the spec R1 contract (who gets a visit recorded) and the **upsert mechanism** (count init/increment, dedupe). The mechanism is fully testable at the DB layer without touching the host file.

**Alternatives considered:**

- *Pull `HistoryPage` / `BookmarksPage` / `HistoryList` / `BookmarksList` into this carve-out.* Rejected — collides with `list-collections` (4.6), which owns the collection-grid rendering and `ListCard`. Two sub-proposals enumerating the same files in `vitest.config.ts` thresholds is a conflict. The page shells render `ListCard` grids; that is collection-view behavior.
- *Pull `ListHeroSection.tsx` into this carve-out to cover the gating predicate.* Rejected — the file is overwhelmingly list-detail/hero behavior; claiming it would force this carve-out to test `guardListViewable`, `ListPrivate`, spoiler/preview params, and `ListDetails` composition — none of which is visit-history. The spec R1 recording contract is exercised at the DB layer; the gating branch coverage attributes to the host file's owner.
- *Extract the visit-recording `after()` block into a `recordVisit(viewerId, listId)` DAL/action helper so it becomes a single-purpose testable unit.* Rejected as a cross-file refactor exceeding carve-out authority (per testing-foundation's refactor-scope rule — moving code between files is deferred, not done in a test sub-proposal). It is, however, a reasonable future refactor and is recorded as a **non-blocking testability-audit note** in `tasks.md` (disposition: deferred observation, not a new sub-proposal, because the upsert contract is already fully covered at the DB layer — extraction would only improve gating-predicate attribution, which the host file's owner handles).

### Decision 2: Do NOT enumerate `lib/dal.ts` / `app/actions/lists.ts` in `vitest.config.ts` per-file thresholds; defer multi-capability-shared-file enforcement to a new governance checkbox.

The universal `COVERAGE_FLOOR` is enforced **per file** (`vitest.config.ts` `thresholds` with `perFile: true`, keyed by exact file path). `lib/dal.ts` has 20 exported functions (only 3 are visit-history's); `app/actions/lists.ts` has 10 (only 4 are visit-history's). The remaining functions belong to other capabilities (`getListsByUser` → home/lists; `getFollowingByUser` → following; `createList`/`setListItems`/`updatePriority` → list-item-management; etc.) and are tested by THEIR sub-proposals.

If this carve-out added `lib/dal.ts` to the `thresholds` map, vitest would require the WHOLE FILE to hit 98/98/95/100 — impossible until every function's owning sub-proposal has landed. The original `testing-foundation` design anticipated this with a **per-function** floor for these two file classes ("`lib/dal.ts` (per exported function) 80%", "Server actions per exported function 80%"), but `test-housekeeping` (0.1) replaced the tiered table with a single **per-file** universal floor referenced from `COVERAGE_FLOOR`. That replacement is correct for single-purpose files (every prior carve-out) but **does not compose for multi-capability shared files** — vitest has no per-function threshold mechanism. This carve-out is the first to hit the gap.

**Disposition (per the audit-deferral rule):**

1. **Test the visit-history functions to the floor now.** The node tests import and run the real production functions (Decision 3) against PGlite, achieving ≥ the universal floor on the in-carve-out functions. The per-function metrics are read from `coverage/coverage-summary.json` and recorded in `tasks.md` §audits (the coverage report attributes line/branch hits to specific line ranges, so the visit-history functions' coverage is verifiable even without a file-level gate).
2. **Do NOT add `lib/dal.ts` / `app/actions/lists.ts` to `thresholds`.** A file-level gate that cannot pass is worse than no gate — it would block this sub-proposal's pre-merge on functions it does not own.
3. **ADD a new governance checkbox to `test-coverage/tasks.md`** under §7 (governance close-out) or as a new top-level item: *"Multi-capability shared files (`lib/dal.ts`, `app/actions/lists.ts`, and any other file spanning capabilities) SHALL be enumerated in `vitest.config.ts` per-file `thresholds` at the universal `COVERAGE_FLOOR` once every function in each file is covered by its owning sub-proposal — OR the testing-foundation per-file rule SHALL be amended with a per-function mechanism for these files. First surfaced by `test-visit-history` (4.14)."* This is the canonical record of the discovered governance gap, per testing-foundation's "new sub-proposals / governance items discovered mid-flight are added as checkboxes" rule.
4. **Do NOT promote `sonarjs/cognitive-complexity` to `error` for `lib/dal.ts` / `app/actions/lists.ts`.** Same logic — the promotion is owned by the sub-proposal that completes the file. The three single-purpose widget files ARE promoted here.

**Alternatives considered:**

- *Lower the floor for `lib/dal.ts` / `app/actions/lists.ts`.* Rejected — testing-foundation's no-backdoor rule forbids lowering the floor as a disposition ("a file that cannot meet the floor MUST close the gap via tests OR `/* v8 ignore */` — lowering the floor is not acceptable"). The right answer is to enumerate when whole-covered, not to lower.
- *Add the files to `thresholds` and `/* v8 ignore */` every non-visit-history function.* Rejected — those functions are NOT slop; they are real code awaiting their own sub-proposals' tests. Ignoring them would suppress the coverage signal those sub-proposals need and would have to be un-ignored later. Pollutes the source with ignores that don't belong to this carve-out.
- *Refactor the visit-history functions out of `dal.ts` / `lists.ts` into `lib/dal/visitHistory.ts` / `app/actions/visitHistory.ts` so they become single-purpose enumerable files.* Rejected — a cross-file refactor touching every importer, exceeding carve-out authority (testing-foundation refactor-scope rule). Deferrable as a future structural change, but not required: the deferred-enumeration disposition is sufficient and lower-risk.

### Decision 3: DAL/action tests run the REAL production functions against PGlite by mocking `@/db` to the PGlite instance and `next/cache` to no-ops.

testing-foundation is explicit: "Internal modules — DAL functions, server actions, `lib/`, hooks — SHALL NOT be mocked when their dependencies are local; integration tests SHALL exercise them against the real test database." So the test must import and invoke the actual `getVisitHistoryByUser` / `bookmarkList` / etc. — NOT re-implement the query (the spike's `dal-cache.test.ts` re-implemented "equivalent" queries as a spike shortcut; that does NOT attribute coverage to `lib/dal.ts` and is not acceptable for a real carve-out).

The production functions import `db` from `@/db` (which constructs a `drizzle-orm/neon-http` client from `DATABASE_URL` at module load — unusable in tests). The test swaps it:

```ts
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';

mockNextCache(); // hoisted vi.mock of next/cache → cacheTag/updateTag/etc. are vi.fn()

const { db: pglite } = await bootPglite();
vi.mock('@/db', () => ({ db: pglite })); // see hoisting note below
```

**Hoisting caveat:** `vi.mock` is hoisted above imports, so the PGlite instance cannot be referenced directly in the factory. The pattern is `vi.mock('@/db', () => ({ get db() { return globalThis.__testDb; } }))` with `globalThis.__testDb` assigned in `beforeEach` after `bootPglite()` — OR `vi.hoisted()` to construct the boot before the mock factory runs. Decision 9 picks the per-test-vs-per-file boot granularity; the helper wiring is recorded in `tasks.md` §setup. The `'use cache'` directive on `getBookmarkStatus` is a Next compiler construct that degrades to a plain async function under raw vitest (spike finding) — so `getBookmarkStatus` runs as an ordinary query; `cacheTag` is a mocked no-op. This is exactly the spike's recommendation (b).

**`@/lib/auth` mock** (actions only): the four mutations call `authedUserId()` → `auth()`. Mock `@/lib/auth` to a `vi.fn()` resolving the caller's session (`{ user: { email } }`) or `null` (unauthenticated). This IS the NextAuth network boundary testing-foundation permits mocking — not an internal-module mock.

**Alternatives considered:**

- *Run against a real Neon branch (the production driver) instead of PGlite.* Rejected — `test-foundation-spike` compared the options and chose PGlite (speed, no network, no CI credentials, deterministic). Neon-branch fidelity is reserved for e2e. The one fidelity gap (SQLSTATE on `.cause.code`) is documented and irrelevant here (the visit upsert ABSORBS conflicts — Decision 4 — so no SQLSTATE is asserted).
- *Re-implement the queries in the test (spike shortcut).* Rejected — zero coverage attribution to `lib/dal.ts`; tests the query the test author wrote, not the production query. Fails the carve-out's purpose.
- *Dependency-inject `db` as a function parameter into every DAL fn.* Rejected — cross-file API change to 20+ call sites, exceeds carve-out authority. The `vi.mock('@/db')` boundary swap achieves identical coverage with no source change.

### Decision 4: The visit dedupe backstop is the composite PRIMARY KEY `(user_id, list_id)` + `onConflictDoUpdate` ABSORB — NOT a partial unique index, and NOT a 23505 rejection. Correct the parent's mislabel in an R1 clarification.

The parent `test-coverage/tasks.md` §4.14 and issue #52 both say "visit dedupe race (partial unique index backstop)". **This is a mislabel.** Reading `db/schema.ts`: `list_visits` is keyed by `primaryKey({ columns: [table.user_id, table.list_id] })` — a composite PRIMARY KEY, not a partial unique index. The distinction is real and load-bearing:

- A **partial** unique index (`WHERE user_id IS NOT NULL`, as on `purchases`) exists to dedupe a SUBSET of rows while excluding NULL-keyed rows (guest claims). `list_visits` has NO nullable key column — both `user_id` and `list_id` are `NOT NULL` — so a FULL composite primary key is the correct, stronger backstop. There is no subset to exclude.
- The dedupe **outcome differs from `purchases`.** `purchases` inserts a new row per claim and relies on the partial unique index to REJECT a duplicate with SQLSTATE 23505 (the app catches it). `list_visits` uses `onConflictDoUpdate(target: [user_id, list_id])`, which **ABSORBS** the conflict — a second concurrent upsert to the same `(user_id, list_id)` does NOT raise 23505; it executes the `DO UPDATE` branch (advancing `last_visited_at`, incrementing `visit_count`). So the race-test assertion is "both `Promise.allSettled` results fulfill, exactly one row exists, `visit_count` is consistent" — NOT "one rejects with 23505" (which is the `purchases` pattern from the spike's `race.test.ts`).

This warrants a spec clarification because a future contributor reading "partial unique index backstop" in the parent might (a) try to add a partial index that already-correctly-isn't there, or (b) expect a 23505-rejection race semantics that the upsert does not have. The R1 clarification names the composite PK + the absorb semantics so the contract is unambiguous.

**Concurrency fidelity caveat:** PGlite is single-connection in-process. `Promise.allSettled([upsertA, upsertB])` does not produce true wall-clock parallelism the way two Neon HTTP round-trips would, but it DOES exercise the `ON CONFLICT` codepath deterministically (the second statement sees the first's committed row and takes the DO UPDATE branch). This is the same fidelity the spike accepted for `race.test.ts`. The test asserts the DB-level invariant (single row, consistent count) that the composite PK guarantees regardless of interleaving — which is the actual contract. Recorded as a known fidelity limitation in `tasks.md` Risks.

**Alternatives considered:**

- *Assert a 23505 rejection like `purchases`.* Rejected — wrong for an `onConflictDoUpdate` upsert; it never rejects on conflict. Asserting 23505 would fail (correctly) and mislead.
- *Leave the parent's "partial unique index" wording uncorrected and just test the PK.* Rejected — the mislabel would persist as a normative-looking claim and re-confuse the next reader. The invariant-elevation audit's job is exactly to reconcile source and spec when they diverge; the clarification is the disposition.
- *Add a partial unique index to `list_visits` to "match" the parent text.* Rejected — a schema change (out of carve-out authority) that would be redundant with the existing composite PK and could conflict with it. The source is correct; the parent text is wrong.

### Decision 5: MODIFY the two R3 "remove disabled for bookmarked" scenarios — the source evolved to "remove from history while preserving the bookmark", with an always-enabled × affordance.

The active R3 (`Visit history page SHALL support per-row remove and bulk clear`) states "Remove SHALL be disabled for bookmarked rows" with two scenarios:

> **Scenario: Per-row remove disabled for bookmarked** — WHEN a row has `favorited_at IS NOT NULL` THEN the × affordance is disabled and a tooltip explains that bookmarked rows must be unbookmarked first

The source at HEAD does NOT match. `HistoryActions.RemoveVisitButton` renders an **always-enabled** × (`aria-label="Remove from history"`, `title="Remove from history"`, no bookmark-conditional disable), and `HistoryCard` renders it for **every** row regardless of `favorited_at`. `removeVisit(list_id)` handles a bookmarked row by setting `last_visited_at = null` (the row + bookmark survive; the row leaves the history view because `getVisitHistoryByUser` filters `last_visited_at IS NOT NULL`) and deletes a non-bookmarked row outright. `clearVisitHistory({ includeBookmarked: false })` does the same: deletes non-bookmarked rows, nulls `last_visited_at` on bookmarked rows.

This is a strictly-better UX than the spec's stale "disabled + tooltip": a user can clear a bookmarked list from their visit history WITHOUT losing the bookmark. The spec drifted behind the source; the source is the design intent (same source-follows-spec direction `test-app-frame` established for the R2 mobile-nav drift).

**MODIFIED scenarios** (full text in `specs/visit-history/spec.md`):

- "Per-row remove" → covers both non-bookmarked (row deleted) and bookmarked (row's `last_visited_at` nulled, bookmark preserved) outcomes.
- "Per-row remove disabled for bookmarked" → **REPLACED** by "Per-row remove of a bookmarked row preserves the bookmark": the × is enabled for all rows; removing a bookmarked row clears it from history but the bookmark remains in `/lists/bookmarks`.

The R3 prose body's "Remove SHALL be disabled for bookmarked rows" sentence is rewritten to "Remove SHALL be available for every row; removing a bookmarked row clears it from the history view while preserving the bookmark (by nulling `last_visited_at`, not deleting the row)."

**Alternatives considered:**

- *Change the source to disable × on bookmarked rows (source-follows-spec).* Rejected — that REMOVES a working, better UX feature to satisfy a stale spec. Mobile/desktop both ship the always-enabled × today; users rely on "remove from history without un-bookmarking". The spec is the artifact updated.
- *Leave the spec and assert the stale "disabled" behavior in the test.* Rejected — the test would fail against the real source (the × is enabled), and asserting a behavior the source doesn't have is impossible. The MODIFICATION is the only coherent path.

### Decision 6: ADD a SHALL locking the history-view `last_visited_at IS NULL` exclusion that connects the mutations to the read.

`getVisitHistoryByUser` filters `isNotNull(list_visits.last_visited_at)`. This is the **mechanism** by which `removeVisit` (bookmarked path) and `clearVisitHistory({ includeBookmarked: false })` (bookmarked rows) drop a list from the history view without deleting the row: they null `last_visited_at`, and the read excludes null-`last_visited_at` rows. Symmetrically, `getBookmarkedListsByUser` filters `isNotNull(favorited_at)`, so a row with nulled `last_visited_at` but set `favorited_at` still appears in `/lists/bookmarks`.

No current SHALL states this exclusion. It is non-obvious (a reader of `getVisitHistoryByUser`'s name would not infer the null-filter), survives reimplementation (any rewrite of the history read MUST preserve the exclusion or removed-but-bookmarked rows reappear in history — a visible regression), and protects a real failure mode (the Decision-5 "remove preserves bookmark" UX silently breaks if the read stops filtering). Elevated.

**ADDED Requirement** (full text in the spec delta): *"The visit-history read SHALL exclude rows whose `last_visited_at IS NULL`"* with scenarios covering (a) a bookmarked-and-removed row absent from history but present in bookmarks, and (b) `getVisitHistoryByUser` ordering by `last_visited_at DESC`.

**Alternatives considered:**

- *Fold the exclusion into the existing R3 prose instead of a new Requirement.* Rejected — R3 is about the history PAGE's remove/clear affordances; the read-side exclusion is a DAL contract consumed by the page but distinct from the UI affordance. A separate SHALL keeps the read contract independently assertable by the node DAL test.
- *Don't elevate (treat as obvious).* Rejected — it fails none of the three elevation criteria; it is precisely the non-obvious, reimplementation-surviving, regression-protecting kind the rule targets.

### Decision 7: Widget tests mock the SERVER ACTIONS (`@/app/actions/lists`) — the action is the network-equivalent boundary for a client component, and the actions are covered separately by the node test.

`BookmarkButton` and `HistoryActions` are `'use client'` components that invoke server actions inside `startTransition`. Testing-foundation says internal modules SHALL NOT be mocked "when their dependencies are local" and DAL/actions SHALL run against the real DB "from an ACTION test". For a CLIENT-COMPONENT test, the server action is the RPC boundary — invoking the real action from jsdom would require a running Next server + real DB, which is the action test's (node project) job, not the widget's. Mocking `@/app/actions/lists` here is the client-side analogue of mocking the network boundary: the widget test asserts the **optimistic-UI contract** (state flip, rollback on failure, toast, `router.refresh()`, pending-guard), and the action's DB behavior is asserted in `app/actions/__tests__/visitHistory.actions.test.ts`. The two layers compose without double-testing.

**Alternatives considered:**

- *Render the widget AND run the real action against PGlite in one jsdom test.* Rejected — server actions are not invocable as plain functions from a jsdom client-component render without the Next action runtime; and it would conflate the optimistic-UI contract with the DB contract. Two focused tests beat one entangled one.
- *Don't mock the actions; stub `fetch`.* Rejected — server actions are not `fetch` calls in the test environment; there is no network boundary to stub at the jsdom layer. The module mock IS the boundary.

### Decision 8: R4 (the `saved_lists` → `list_visits` migration) is NOT re-exercised.

R4's scenarios (one `list_visits` row per `saved_lists` row, source preserved, row-count parity, app stops referencing `saved_lists`) describe a one-time data migration performed and verified at archive of `add-following-and-history`. The migration SQL lives in `drizzle/`; PGlite replays it during `bootPglite()`, but the migration's DATA-COPY assertions are historical outcomes, not an ongoing capability contract this carve-out tests. The "app stops referencing `saved_lists`" scenario is a grep-assertion better suited to a lint rule or code review than a unit test, and `archive-saved-lists` (the follow-up) owns the table's eventual drop.

**Alternative considered:** *Add a migration-replay test asserting row-count parity.* Rejected — PGlite boots from an empty DB and replays schema migrations, not the data-copy step (which ran against production `saved_lists` data that doesn't exist in a fresh PGlite). The data-copy is not reproducible in-test and is historical. Out of scope.

### Decision 9: PGlite is booted per-test-file via a shared `beforeEach` (fresh DB per `it`), not once globally.

`bootPglite()` constructs a fresh in-memory Postgres and replays all migrations (~tens of ms). Each `it` that mutates `list_visits` needs isolation from siblings. Booting per-`it` in `beforeEach` gives clean isolation at a modest cost; the alternative (boot once per file + truncate between tests) is faster but adds truncation bookkeeping and risks cross-test leakage of sequence/identity state. This carve-out's tests are not numerous enough for the per-`it` boot cost to matter; correctness-by-isolation wins. The decision sets the baseline for future DAL/action carve-outs (4.2/4.9/4.13) — if boot cost becomes a CI bottleneck there, a per-file-boot-plus-truncate helper can be added to `test/helpers/db.ts` as a shared optimization (a future change, not this one).

**Alternatives considered:**

- *Boot once per file, truncate `list_visits` (and parents) between tests.* Rejected for now — premature optimization; the truncation order (FK cascade) is error-prone and the test count here is small. Revisit if CI time regresses.
- *Share one PGlite across the whole node project.* Rejected — cross-file test pollution; the two node test files would race on shared rows. Vitest `forks` pool isolates files into separate processes anyway, so a global boot is per-process, but per-`it` isolation within a file is still needed.

## Risks / Trade-offs

- **Multi-capability-shared-file coverage gap is a real governance discovery, not a one-off.** Every future DAL/action carve-out (4.2, 4.9, 4.11, 4.13) hits the same wall — `lib/dal.ts` and `app/actions/lists.ts` accumulate covered functions across many sub-proposals but can't be gated until whole. → Mitigation: Decision 2 adds the canonical governance checkbox; the per-function coverage is recorded from `coverage-summary.json` line ranges in each sub-proposal's `tasks.md` so the signal isn't lost; the file-level gate lands at close-out (or via a per-function amendment).
- **PGlite concurrency is not true parallelism.** The dedupe-race test exercises the `ON CONFLICT` codepath deterministically but not under wall-clock-concurrent connections. → Mitigation: Decision 4 — the asserted invariant (single row, consistent `visit_count`) is the composite-PK guarantee that holds regardless of interleaving; the test is correct for the contract even if it doesn't reproduce a true Neon-HTTP race. Documented as a known fidelity limit.
- **`vi.mock('@/db')` hoisting + per-`beforeEach` PGlite boot is fiddly.** The mock factory is hoisted above the boot; the PGlite instance must be reachable via a hoisted ref or getter. → Mitigation: Decision 3 names the `vi.hoisted()` / getter pattern; `tasks.md` §setup records the exact wiring; the spike's `db.test.ts` proves `bootPglite()` works under the node project.
- **The spec MODIFICATION is only the second ever (after `test-app-frame`'s R2).** A reviewer reading only the spec delta must understand the source-follows-spec direction. → Mitigation: Decision 5 + the proposal's "What Changes" explicitly state the rejected source-follows-spec alternative and the rationale (the always-enabled × is a shipped, better UX).
- **The parent's "partial unique index" wording is wrong and the correction lands in the spec, not the parent tasks.md.** A reader of `test-coverage/tasks.md` §4.14 still sees the mislabel. → Mitigation: Decision 4 corrects it in the `visit-history` spec R1 clarification (the authoritative contract); the parent `tasks.md` line is descriptive shorthand, not normative, and the §4.14 checkbox text can be left as-is (its archive flips the box regardless). The `tasks.md` audit record notes the correction.
- **`getBookmarkStatus`'s `'use cache'` directive is inert under vitest.** The function runs as a plain async query; the cache + tag behavior is NOT exercised by the unit test. → Accepted (spike finding): real-runtime caching is e2e territory; the unit test asserts query correctness + that mutations call `updateTag('list_visits')`. The cache-invalidation end-to-end path is 6.x.
- **Widget tests mocking the actions could drift from the real action signatures.** If `bookmarkList`'s return shape changes, the widget mock could lull. → Mitigation: the actions' real return shapes are asserted in the node action test (same carve-out, same PR); TypeScript binds the widget's mocked action to the real signature (`vi.mocked(bookmarkList)` is typed), so a signature change breaks `tsc`.
- **`HistoryCard` mocks `ListCard` (out of carve-out).** The test asserts the props passed to `ListCard` (`bookmarked`, `showOwner`), not `ListCard`'s rendering. → Accepted — `ListCard`'s rendering is `list-collections`' (4.6) job; asserting the prop contract at the boundary is the correct seam.
