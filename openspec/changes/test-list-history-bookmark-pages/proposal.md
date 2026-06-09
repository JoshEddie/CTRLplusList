## Why

Sub-proposal **9.5** of the `test-coverage` initiative ([issue #115](https://github.com/JoshEddie/CTRLplusList/issues/115)) — the final coverage-gap follow-up discovered at the §7.1 close-out audit (`openspec/changes/test-coverage/tasks.md` §9.5).

Three list-activity **full-result page shells** were left at **0% unit coverage** by the §0–§6 carve-outs. 4.14 (`test-visit-history`) covered the visit-history **cards** and the `lib/dal.ts` reads, but not the **page shells** that compose them: the Bookmarks page, the Visit-history page, and the Purchased page. The three clusters are:

- **Bookmarks** (`app/(main)/lists/bookmarks/`, 3 files): the `/lists/bookmarks` page rendering the viewer's bookmarked lists (`favorited_at DESC`) as a `ListCard` grid with an empty state.
- **Visit history** (`app/(main)/lists/history/`, 3 shell files): the `/lists/history` page rendering the viewer's visit rows (`last_visited_at DESC`) with a conditional bulk-clear affordance and an empty state. (`HistoryActions.tsx` and `HistoryCard.tsx` are **already** floored + enumerated by 4.14 — this carve-out is the `page.tsx` / `HistoryPage.tsx` / `HistoryList.tsx` shells only.)
- **Purchased** (`app/(main)/purchased/`, 2 files): the `/purchased` page rendering the viewer's purchased items through the `Items` browser, plus its `loading.tsx`.

Every file below is absent from `vitest.config.ts` `thresholds` (verified against the live map — only `history/HistoryActions.tsx` and `history/HistoryCard.tsx` from that directory are enumerated, both from 4.14) and has no colocated test.

A spec-grep (every active `spec.md` grepped for these file paths, the route strings `/lists/bookmarks` `/lists/history` `/purchased`, and the behaviors they render) found that **the `visit-history` capability already specs the bookmark/history page behaviors in scope** — this carve-out adds no new requirement; it **LOCKS** the existing `visit-history` SHALLs at the component level. The relevant `visit-history` requirements:

- *"Bookmarking SHALL be an explicit toggle that survives in history"* — its scenario *"Bookmarked list appears in both Bookmarks and history"* pins that the list appears in `/lists/bookmarks` ordered by `favorited_at DESC`. LOCKED by the `BookmarksPage` read-wiring test + the `BookmarksList` grid/empty-branch tests.
- *"Visit history page SHALL support per-row remove and bulk clear"* — the `/lists/history` page renders rows in `last_visited_at DESC` order with a bulk-clear action. LOCKED by the `HistoryPage` read-wiring test (`getVisitHistoryByUser(viewer.id, { limit: 100 })` + the conditional `ClearHistoryButton`, rendered only when `rows.length > 0`) + the `HistoryList` grid/empty-branch tests.
- *"The visit-history read SHALL exclude rows whose last_visited_at is NULL"* — names `getVisitHistoryByUser` / `getBookmarkedListsByUser`. The **reads** are owned + whole-covered by 9.1 (`test-dal-remainder`); the shells call them and are **module-mocked** at `@/lib/dal` here, asserting *which read each shell calls and how it renders the result*, not the query.

Inherited constraints (binding SHALLs cited as-is — none re-owned here):

- **`testing-foundation`** (active accumulator at `openspec/changes/test-coverage/specs/testing-foundation/spec.md`, plus every prior sub-proposal's archived deltas) — governs verbatim: the vitest 4.x runner with the jsdom/node two-project split (`.test.tsx` → jsdom, `.test.ts` → node), four-gate pre-merge, `__tests__/` colocation, the universal per-file `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) referenced from the single `vitest.config.ts` constant, the no-backdoor disposition rule (`/* v8 ignore */` with a named rationale, never lower the floor), the assertion-substance bar, the `<State>_<Behavior>` `it()` shape and three-role `describe()` convention, the four-audit + invariant-elevation obligations, and the `sonarjs/cognitive-complexity` warn-globally / error-per-carve-out policy. The load-bearing mocking allowances apply: **NextAuth is the network boundary** (`@/lib/auth`'s `auth()` is mocked, never the modules it wraps) and **`next/navigation`'s `redirect()` is mocked to throw a sentinel** for RSC guards (the established `REDIRECT:${url}` precedent, already in the in-directory `items/__tests__/page.test.tsx`).
- **`visit-history`** (active) — owns the bookmark/history page behaviors (enumerated above). This carve-out **LOCKS** those requirements at the component level; **no `visit-history` requirement is modified**.
- **`list-collections`** (active) — owns the `ListCollectionsNav` sub-nav active-tab on `/lists/bookmarks` and `/lists/history`, and the `ListCard` bookmark-indicator / owner-byline behavior. `ListCollectionsNav` is **rendered through** (or mocked-to-isolate) and `ListCard` is **mocked at the boundary** (the in-directory `HistoryCard.test.tsx` `@/app/ui/components/ListCard` mock precedent); neither is re-owned.
- **`lib/dal.ts` reads, already whole-covered + enumerated by 9.1** (`test-dal-remainder`): `getBookmarkedListsByUser`, `getVisitHistoryByUser`, `getItemsByPurchased`, `getUserIdByEmail`. **Module-mocked** at the `@/lib/dal` boundary here.
- **`Items` browser + its leaves, owned + floored by 4.5 / 4.9 / 4.18** (items carve-outs) — the Purchased page renders the viewer's purchased items **through** the floored `Items` component; it is **mocked to isolate** the purchased shell's auth-guard + read-wiring + composition, never re-owned. `getItemsByPurchased`'s purchase-attribution sanitizer is a `list-item-management` SHALL (owned by 4.9) — asserted there, module-mocked here.
- **Primitive/chrome families rendered *through*, not re-owned** — `Header` (4.1), `LoadingIndicator` (3.7), `ListCollectionsNav` / `ListCard` (4.6), and the floored `HistoryCard` / `ClearHistoryButton` (4.14). All already tested and floored; the in-carve-out shells render through the real ones or mock the floored sibling to isolate, asserting no primitive SHALL directly.

Cache-tag note: none of these 8 files own a server-side read or mutation tag — they are page shells composing reads owned and floored elsewhere (9.1 / 4.5). This change adds **no** server-side read; the `'use cache'`/`cacheTag` reads it calls (`getBookmarkedListsByUser` → `list_visits`, `getVisitHistoryByUser` → `list_visits`, `getItemsByPurchased` → items/purchases) are owned by 9.1 / their capabilities and module-mocked here.

## What Changes

- **NEW** colocated `.test.tsx` files under `__tests__/` directories mirroring the source layout, one per source file (all client/JSX or JSX-returning async RSC → all run under the **jsdom** project). In-carve-out (none enumerated in `vitest.config.ts`, all 0% today), grouped by surface class:

  - **Async server-component (RSC) shells (3):**
    - `bookmarks/BookmarksPage.tsx` (the `auth()` → `redirect('/')` and `getUserIdByEmail` → `redirect('/')` guards, then `getBookmarkedListsByUser(viewer.id)`, rendering `ListCollectionsNav` + the real `BookmarksList` with the resolved rows).
    - `history/HistoryPage.tsx` (the same two guards, then `getVisitHistoryByUser(viewer.id, { limit: 100 })`, rendering `ListCollectionsNav` whose child is the conditional `ClearHistoryButton` — present iff `rows.length > 0` — + the real `HistoryList`).
    - `purchased/page.tsx` (the same two guards, then `getItemsByPurchased(user.id)`, rendering `Header title="Purchased"` + the mocked `Items` inside `<main className="container container--items-library">`).
  - **Pure layout / trivial shells (3):**
    - `bookmarks/page.tsx` (route shell: `metadata.title === 'Bookmarks'` + `<main className="container container--list-collections">` wrapping `<BookmarksPage />`).
    - `history/page.tsx` (route shell: `metadata.title === 'Visit history'` + the same `<main>` wrapping `<HistoryPage />`).
    - `purchased/loading.tsx` (trivial render: `<LoadingIndicator size="page" />` — asserted via the React-element `type`/`props` pattern, the in-repo `items/__tests__/loading.test.tsx` precedent).
  - **Pure render components (2):**
    - `bookmarks/BookmarksList.tsx` (the `rows.length === 0` → `<p className="bookmarks-empty">` empty-message branch vs the `<ul className="list-card-grid" role="list">` of `<ListCard … showOwner>` branch, keyed `${user_id}-${list_id}`).
    - `history/HistoryList.tsx` (the `rows.length === 0` → `<p className="history-empty">No visits yet.</p>` branch vs the `<ul className="list-card-grid" role="list">` of `<HistoryCard row>` branch).

- **NEW** per-file `thresholds` entries in `vitest.config.ts` for the 8 files, each referencing the shared `COVERAGE_FLOOR` constant (no per-file numeric variation), under a `// test-list-history-bookmark-pages (sub-proposal 9.5) — locked at universal COVERAGE_FLOOR.` comment.

- **NEW** ESLint per-file `sonarjs/cognitive-complexity = error` overrides in `eslint.config.mjs` for the same 8 files, promoting them from the global `warn`, under the matching comment. Any function measuring ≥ 15 at HEAD is disposed in-carve-out by a single-file, behavior-preserving extraction (covered by the new tests, recorded in `tasks.md`) — never by raising the ceiling. (All 8 are small render/guard shells; none is expected to approach 15.)

- **NEW** four-audit + invariant-elevation findings recorded in `tasks.md`:
  - **Dead-code audit:** confirm all 8 files are live (each route `page.tsx` / `loading.tsx` is a Next entry point; the rest are reached from them). No deletion expected — recorded as a confirmed-live finding (contrast 9.3, which deleted a dead old-chrome cluster).
  - **Duplication + complexity + assertion audits** with their dispositions.

- **NO** new requirement elevated. Every product behavior under test is **already** a `visit-history` SHALL (the bookmarks/history page render + ordering + bulk-clear), LOCKED by the new tests. The remaining page-shell auth guards (`if (!session?.user?.email) redirect('/')` / `if (!viewer) redirect('/')`), the empty-state messages, and the Purchased shell's read-wiring/composition have no clean owning capability (`server-endpoint-authorization` owns the *actions/routes*, not these shell render guards; `visit-history` already owns the bookmark/history product behavior) and are adequately constrained by the new unit tests; the non-elevation rationale is recorded per the four-audit obligation (`design.md` Decision 6).

- **NO** re-test of the `lib/dal.ts` reads (owned by 9.1) — module-mocked, asserting the shells' read wiring.
- **NO** re-test of the governed primitives, the floored visit-history cards, or the `Items` browser (`Header`, `LoadingIndicator`, `ListCollectionsNav`, `ListCard`, `HistoryCard`, `ClearHistoryButton`, `Items`) — rendered through (the chrome) or mocked-to-isolate (the floored siblings); none re-owned.
- **NO** source refactor anticipated beyond any audit-driven, behavior-preserving extraction (only if a function exceeds the complexity ceiling of 15 at HEAD).

## Capabilities

### New Capabilities

None. Every behavior under test belongs to an existing capability (`visit-history` for the bookmark/history pages; the Purchased shell composes `list-item-management`-governed reads through the `items` browser); this carve-out LOCKS the already-specced requirements and adds no new requirement.

### Modified Capabilities

- `testing-foundation`: Tier-2 carve-out bookkeeping (archive-only per parent design D13) — records the 8 page-shell files floored + enumerated. No change to the active `testing-foundation` spec at apply-time (archive-time rollup per §7.11); no change to the parent `test-coverage` accumulator. No other capability's requirements change: the `visit-history` SHALLs are LOCKED as-is (asserted by the new tests, not modified).

## Impact

- **New files:** 8 `.test.tsx` files — 3 under `app/(main)/lists/bookmarks/__tests__/` (`page`, `BookmarksPage`, `BookmarksList`), 3 under `app/(main)/lists/history/__tests__/` (`page`, `HistoryPage`, `HistoryList` — joining the existing `HistoryActions.test.tsx` / `HistoryCard.test.tsx` from 4.14), and 2 under `app/(main)/purchased/__tests__/` (`page`, `loading`). Shared Arrange (an `auth()`-mock / session+viewer factory and the `redirect()` sentinel) is hoisted into each file's `beforeEach`; a colocated `__tests__/test-helpers.tsx` is extracted only on 3+ reuse (the established threshold).
- **Deleted files:** none — all 8 source files are live (the dead-code audit confirms; contrast 9.3).
- **Modified config:** `vitest.config.ts` gains 8 per-file `thresholds` entries (all → `COVERAGE_FLOOR`); `eslint.config.mjs` gains the same 8 paths in the `sonarjs/cognitive-complexity = error` array.
- **Modified source:** none expected beyond any conditional audit-driven, behavior-preserving extraction if a function exceeds the ceiling of 15 at HEAD (not anticipated).
- **Modified specs:** the Tier-2 `testing-foundation` record lives only in this change's `specs/` delta and its archive directory. No active capability spec changes at apply-time.
- **Parent governance:** `test-coverage/tasks.md` §9.5 checkbox flips on archive. This is the **last** open §9 follow-up — on its archive, §7.1's §9 dependency clears, **unblocking** the governing change's remaining close-out steps (§7.2 global complexity promotion, §7.3 final coverage baseline, §7.5 active-spec rebuild, §8 pre-merge gates).
- **CI:** the four-gate workflow runs unchanged; the `test` job nets **+8 jsdom files**. The async-RSC shells mock `auth()`, `@/lib/dal`, and the sentinel `redirect()`; the pure-render files mock `@/app/ui/components/ListCard` / `./HistoryCard`; the Purchased shell mocks `../items/ui/components/Items`.
- **Dependencies:** none added (the jsdom harness, `@testing-library/react`, and `@testing-library/user-event` are already present).
- **Risk:** low. All 8 files are small render/guard shells with direct in-directory precedents — the async-RSC `items/__tests__/page.test.tsx` pattern (auth + dal mocks, `REDIRECT:/` sentinel), the `items/__tests__/loading.test.tsx` element-shape pattern, and the `HistoryCard.test.tsx` `ListCard`-mock pattern. No deletion blast radius; no new harness mechanic.
