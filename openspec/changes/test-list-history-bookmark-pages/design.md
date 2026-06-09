## Context

This is sub-proposal 9.5 of `test-coverage` — a unit-coverage carve-out for three list-activity **full-result page-shell** clusters left at 0% by the §0–§6 carve-outs: the Bookmarks page (`app/(main)/lists/bookmarks/`, 3 files), the Visit-history page shells (`app/(main)/lists/history/`, 3 shell files), and the Purchased page (`app/(main)/purchased/`, 2 files). 4.14 covered the visit-history **cards** (`HistoryCard`, `HistoryActions`) and the `lib/dal.ts` reads; 9.1 whole-covered the reads; neither covered the route shells that compose them. The proposal enumerates the 8 files, the surface classes, and the inherited constraints; this document settles the boundary, the per-surface test mechanics, and the (non-)elevation decisions.

Like 9.4, this carve-out has **no dead-code cascade and no deletions** — every file is a live Next route shell or a component it renders. The single largest finding is that **the `visit-history` capability already specs every product behavior in scope** (the bookmark/history page render + ordering + bulk-clear), so the elevation question resolves to a clean **LOCK existing, elevate nothing** (Decision 6). There is **no drift finding** (contrast 9.4's stale `/u/[id]` route-path) — the route strings in scope (`/lists/bookmarks`, `/lists/history`, `/purchased`) match the live routes and every spec mention.

The carve-out's 8 files divide into three surface classes, each with an established **in-directory or sibling** repo precedent:

1. **Async server-component (RSC) shells (3):** `BookmarksPage`, `HistoryPage`, `purchased/page.tsx`. Precedent: `items/__tests__/page.test.tsx` (the same `app/(main)` tree) — mock `auth()` + `@/lib/dal`, sentinel `redirect()`, await the component, assert the rendered output or the thrown sentinel.
2. **Pure layout / trivial shells (3):** `bookmarks/page.tsx`, `history/page.tsx`, `purchased/loading.tsx`. Precedent: `items/__tests__/page.test.tsx` (mock the child page, assert the `<main>` wrapper + composition + `metadata`) and `items/__tests__/loading.test.tsx` (assert the returned React element's `type`/`props`).
3. **Pure render components (2):** `BookmarksList`, `HistoryList`. Precedent: `history/__tests__/HistoryCard.test.tsx` (same directory — plain `render` + assert the count-branch structure, mocking the floored `ListCard` / `HistoryCard` child).

## Goals / Non-Goals

**Goals:**

- Bring every enumerated file to the universal `COVERAGE_FLOOR`, enumerate it in `vitest.config.ts`, and promote it to `sonarjs/cognitive-complexity = error`.
- LOCK the already-specced `visit-history` page behaviors at the component level: the Bookmarks page renders `getBookmarkedListsByUser` rows as a `ListCard` grid with the empty state; the History page renders `getVisitHistoryByUser(viewer.id, { limit: 100 })` rows with the conditional bulk-clear affordance and the empty state. Render the in-carve-out children (`BookmarksList`, `HistoryList`) through the **real** components, and mock the floored siblings (`ListCard`, `HistoryCard`, `ClearHistoryButton`, `Items`) only to isolate parent branch logic.
- Keep the unit tier non-redundant with any e2e: unit owns the **branch logic** (the section auth-guards, the empty-vs-populated grid branches, the conditional `ClearHistoryButton`, the Purchased read-wiring).
- Discharge the four audits (dead-code, duplication, complexity, assertion) and the invariant-elevation obligation, recording each disposition — including the **no-elevation** decision and the **confirmed-live** dead-code result.

**Non-Goals:**

- Re-testing the `lib/dal.ts` reads (owned by 9.1), the visit-history cards (`HistoryCard` / `HistoryActions`, owned by 4.14), the `Items` browser (owned by 4.5 / 4.9 / 4.18), or the chrome/primitives (`Header` / `LoadingIndicator` / `ListCollectionsNav` / `ListCard`).
- Modifying any `visit-history` requirement or any source behavior.
- Adding e2e coverage — this carve-out is unit-level only (the bookmark/history/purchased flows are not in the 6.1/6.2 e2e scope; the unit tier is the coverage owner for these shells).

## Decisions

### Decision 1 — Final carve-out boundary

**In (test + floor + complexity-error) — 8 live files:**

| File | Surface class |
| --- | --- |
| `app/(main)/lists/bookmarks/page.tsx` | pure layout shell (route → `<main>` + `BookmarksPage`) |
| `app/(main)/lists/bookmarks/BookmarksPage.tsx` | async RSC (auth-guards + `getBookmarkedListsByUser`) |
| `app/(main)/lists/bookmarks/BookmarksList.tsx` | pure render (empty vs `ListCard` grid) |
| `app/(main)/lists/history/page.tsx` | pure layout shell (route → `<main>` + `HistoryPage`) |
| `app/(main)/lists/history/HistoryPage.tsx` | async RSC (auth-guards + `getVisitHistoryByUser` + conditional `ClearHistoryButton`) |
| `app/(main)/lists/history/HistoryList.tsx` | pure render (empty vs `HistoryCard` grid) |
| `app/(main)/purchased/page.tsx` | async RSC (auth-guards + `getItemsByPurchased` + `Header` + `Items`) |
| `app/(main)/purchased/loading.tsx` | trivial render (`LoadingIndicator size="page"`) |

**Out (rendered through or mocked-to-isolate; already floored, not re-owned):**

- `lib/dal.ts` reads — `getBookmarkedListsByUser`, `getVisitHistoryByUser`, `getItemsByPurchased`, `getUserIdByEmail` (9.1) → module-mocked at the `@/lib/dal` boundary.
- `HistoryCard` (4.14), `ClearHistoryButton` from `./HistoryActions` (4.14) → mocked to isolate the `HistoryList` / `HistoryPage` shells (the in-directory `HistoryCard.test.tsx` `./HistoryActions` mock precedent).
- `ListCard` (4.6) → mocked to a marker in `BookmarksList` (the in-directory `HistoryCard.test.tsx` `@/app/ui/components/ListCard` mock precedent); the test asserts the forwarded `showOwner` + one card per row.
- `Items` (4.5) → mocked to a marker in `purchased/page.tsx`; the test asserts the forwarded `items`.
- `Header` (4.1), `LoadingIndicator` (3.7), `ListCollectionsNav` (4.6) → rendered through the real components (floored elsewhere) where cheap, or mocked to a marker where they would pull in a router/context surface (`ListCollectionsNav` reads `usePathname`).

**Note on the issue's named set.** The issue names `app/(main)/lists/bookmarks/*`, `app/(main)/lists/history/*` **(List/Page shells)**, and `app/(main)/purchased/*`. The history parenthetical excludes `HistoryActions.tsx` / `HistoryCard.tsx` (already floored + enumerated by 4.14, verified in `vitest.config.ts`); the boundary above enumerates the concrete 8 files the globs resolve to **minus** those two, plus `purchased/loading.tsx` so the `purchased` directory is not left partially floored. No other file in the three directories is excluded.

### Decision 2 — No deletions; the dead-code audit confirms all 8 files live

Contrast 9.3, whose audit found a dead old-chrome cluster to delete. Here every file is reachable: `bookmarks/page.tsx`, `history/page.tsx`, `purchased/page.tsx`, and `purchased/loading.tsx` are Next App-Router entry points; `BookmarksPage` / `HistoryPage` are imported by their route `page.tsx`; `BookmarksList` / `HistoryList` are imported by those async pages. The dead-code audit (§5.1 in `tasks.md`) records this **confirmed-live** result with the importer chain, so a reviewer sees the audit was run, not skipped. No `vitest.config.ts` / `eslint.config.mjs` entries are removed.

### Decision 3 — Mocking strategy per surface class

- **Async RSC shells** — `vi.mock('@/lib/auth')` (`auth()` → a session or `null`); `vi.mock('@/lib/dal')` stubbing the read(s) each shell calls; `vi.mock('next/navigation')` with `redirect()` throwing the established `REDIRECT:${url}` sentinel (`vi.hoisted`, the exact `items/__tests__/page.test.tsx` idiom) so each guard branch is assertable. Await the component (`await BookmarksPage()`, `await HistoryPage()`, `await Purchased()`) and assert the rendered output or the thrown sentinel.
  - `BookmarksPage` renders through the **real** `BookmarksList` (cheap, in-carve-out — LOCKS the grid/empty structure) and mocks `ListCollectionsNav` (which reads `usePathname`) to a marker.
  - `HistoryPage` renders through the **real** `HistoryList` and mocks `ListCollectionsNav` + `ClearHistoryButton` (the floored 4.14 sibling) to markers; the test asserts the `ClearHistoryButton` marker is present when `rows.length > 0` and **absent** when `rows.length === 0`.
  - `purchased/page.tsx` mocks `Header` (cheap, but rendered through is also fine — Decision 3 renders the real `Header` and mocks only `Items`) and mocks `../items/ui/components/Items` to a marker asserting the forwarded `items`.
- **Pure layout / trivial shells** — the two route `page.tsx` files mock their async child (`./BookmarksPage` / `./HistoryPage`) and assert it is rendered inside `<main className="container container--list-collections">`, plus the exported `metadata.title` (`'Bookmarks'` / `'Visit history'`). `purchased/loading.tsx` follows the `items/__tests__/loading.test.tsx` element-shape precedent: call `PurchasedLoading()` and assert `tree.type === LoadingIndicator` and `tree.props.size === 'page'` (no `render` needed; this avoids mounting the real indicator for a one-line shell).
- **Pure render components** — plain `render` + assert structure/branch: `BookmarksList` with `rows.length === 0` (the `<p className="bookmarks-empty">` message branch) and `rows.length > 0` (the `<ul className="list-card-grid" role="list">` with one `<li>` per row, each wrapping the mocked `ListCard` with `showOwner`); `HistoryList` with `rows.length === 0` (the `<p className="history-empty">No visits yet.</p>` branch) and `rows.length > 0` (the `<ul>` with one mocked `HistoryCard` per row). `ListCard` / `HistoryCard` are mocked to markers (the in-directory `HistoryCard.test.tsx` precedent) so these tests assert the list-shell's branch + forwarding, not the floored child.

**Internal modules are never mocked** beyond the `auth()` / `@/lib/dal` / `next/navigation` / floored-sibling (`ListCard` / `HistoryCard` / `ClearHistoryButton` / `Items` / `ListCollectionsNav`) boundaries `testing-foundation` permits.

### Decision 4 — `HistoryPage`'s conditional bulk-clear is the substance core

`HistoryPage` carries the carve-out's most load-bearing branch beyond the shared auth-guards: the `ClearHistoryButton` is rendered as a `ListCollectionsNav` child **only when `rows.length > 0`** (`{rows.length > 0 && <ClearHistoryButton />}`). This is the component-level expression of the `visit-history` *"Visit history page SHALL support per-row remove and bulk clear"* SHALL — the bulk-clear affordance exists on the history page, and is suppressed when there is nothing to clear.

**Decision:** the `HistoryPage` test asserts three legs — (a) `auth()` → `null` throws the `REDIRECT:/` sentinel; (b) a session whose `getUserIdByEmail` → `null` throws the `REDIRECT:/` sentinel; (c) a resolved viewer + a stubbed `getVisitHistoryByUser` renders the real `HistoryList` with one row per visit, asserts `getVisitHistoryByUser` was called with `(viewer.id, { limit: 100 })`, and asserts the `ClearHistoryButton` marker is **present** for a non-empty read and **absent** for an empty read (`rows.length === 0`). This LOCKS the bulk-clear-presence behavior at the unit level (the `ClearHistoryButton` itself — the actual clear action — is floored by 4.14, mocked to a marker here).

### Decision 5 — Section auth-guards: assert both redirect legs at each async shell

`BookmarksPage` / `HistoryPage` / `purchased/page.tsx` each run two guards before their read: `if (!session?.user?.email) redirect('/')` and `if (!viewer) redirect('/')` (a signed-in email with no resolvable user row). Each is a small render-guard with no clean owning capability.

**Decision:** each async-shell test asserts three legs — (a) `auth()` → `null` (or a session with no `user.email`) throws the `REDIRECT:/` sentinel and the `@/lib/dal` read is **not** called; (b) `auth()` → a session but `getUserIdByEmail` → `null` throws the `REDIRECT:/` sentinel; (c) a resolved viewer + a stubbed read renders the populated shell. The guards are unit-covered, **not elevated** (Decision 6) — they are render-time auth guards, not the action/route authorization `server-endpoint-authorization` owns. (The repo precedent `items/__tests__/page.test.tsx` asserts exactly these two legs against the same `redirect('/')` shape.)

### Decision 6 — No new requirement elevated; non-elevation rationale recorded

The four-audit invariant-elevation obligation is discharged with a **no-elevation** decision, justified per behavior:

- **The Bookmarks page render + `favorited_at DESC` ordering** — **already** the `visit-history` *"Bookmarking SHALL be an explicit toggle that survives in history"* SHALL (its *"Bookmarked list appears in both Bookmarks and history"* scenario pins `/lists/bookmarks` ordered by `favorited_at DESC`). LOCKED by the `BookmarksPage` read-wiring test (asserting `getBookmarkedListsByUser(viewer.id)` is called and its rows are forwarded) + the `BookmarksList` grid/empty tests; **not** duplicated. (The ordering itself is the read's contract, owned + regression-locked by 9.1; the shell LOCKS that it renders *that* read's rows.)
- **The History page render + bulk-clear** — **already** the `visit-history` *"Visit history page SHALL support per-row remove and bulk clear"* SHALL. LOCKED by the `HistoryPage` test (Decision 4) + the `HistoryList` grid/empty tests.
- **The section auth-guards, the empty-state messages, and the Purchased shell's read-wiring/composition** — small UI guards / shells with **no clean owning capability** (`server-endpoint-authorization` owns the *actions/routes*; `visit-history` owns the *bookmark/history product behavior*, already LOCKED; the Purchased page composes `list-item-management`-governed reads through the floored `Items` browser, with no `/purchased`-page-shell requirement anywhere). Per the three-part elevation test they fail part (c) — a mis-branch is a minor UX wrong-surface, not a data-integrity or privacy invariant — and none has a natural spec home. **Decision: do not manufacture a SHALL.** All are fully constrained by the new unit tests; the non-elevation is recorded in `tasks.md`.

There is no genuine privacy invariant in this carve-out (contrast 9.4's block cover-story); the spoiler/attribution invariant on `getItemsByPurchased` is a `list-item-management` SHALL owned and asserted by 4.9, module-mocked here.

### Decision 7 — No spec-drift finding

Contrast 9.4 (the stale `/u/[id]` route-path). Here a spec-grep of every active `spec.md` for `/lists/bookmarks`, `/lists/history`, and `/purchased` found every mention consistent with the live routes (`list-collections` sub-nav scenarios, `home-digest` "See all" targets, `app-frame` / `loading-indicator-system` route matching). No spec prose contradicts the source under test. **No drift finding is recorded** — the absence is itself noted in `tasks.md` so a reviewer sees the route-string audit was run.

### Decision 8 — One test file per source file, colocated under `__tests__/`

Per `testing-foundation` colocation + the `__tests__/` convention: `app/(main)/lists/bookmarks/__tests__/{page,BookmarksPage,BookmarksList}.test.tsx`, `app/(main)/lists/history/__tests__/{page,HistoryPage,HistoryList}.test.tsx` (joining the existing `HistoryActions.test.tsx` / `HistoryCard.test.tsx` from 4.14 in the same dir), and `app/(main)/purchased/__tests__/{page,loading}.test.tsx`. The three `page.test.tsx` basenames live in distinct `__tests__/` directories — no collision (vitest keys on the full path). Shared Arrange splits by what is actually shared: the session/viewer/`redirect()`-sentinel Arrange stays inline in each shell's `beforeEach` (at most one async shell per directory), while the `makeRow` row-fixture — a typed, multi-field factory that drifts silently — is extracted to a colocated `__tests__/test-helpers.tsx` per directory under CLAUDE.md's duplication judgment (weight · drift · count, not a raw copy count). The history directory shares it across three files (`HistoryCard` from 4.14, `HistoryList`, `HistoryPage`); the bookmarks directory across two (`BookmarksList`, `BookmarksPage`) — non-trivial and drift-prone, so extracted even at two. The two factories stay separate (different `*RowData` concepts, not merged into one helper).

## Risks / Trade-offs

- **`ListCollectionsNav` reads `usePathname`** (it renders the active sub-nav tab) → Mitigated by mocking it to a marker in the `BookmarksPage` / `HistoryPage` shell tests; its active-tab behavior is owned + floored by 4.6 (`list-collections`), not re-owned here.
- **`purchased/page.tsx` combines the route entry and the async logic in one file** (unlike bookmarks/history, which split `page.tsx` from `XxxPage.tsx`) → No mitigation needed; the single async-RSC test covers both the guards and the composition, exactly as `items/__tests__/page.test.tsx` does for the analogous `items/page.tsx`.
- **Three `page.test.tsx` basenames could collide** → Mitigated by colocated `__tests__/` dirs (distinct paths); vitest keys on the full path.
- **Over-elevation (manufacturing a homeless SHALL)** → Avoided by Decision 6's no-elevation call; every behavior is either already a `visit-history` SHALL (LOCKED) or a small guard/shell with no spec home (unit-covered). The rationale is recorded so a reviewer sees the elevation question was answered, not skipped.
- **Asserting the conditional `ClearHistoryButton` via a mocked marker** rather than the real button → Acceptable and correct: the real `ClearHistoryButton` (its menu + clear action) is floored by 4.14; this carve-out owns only the *presence-vs-absence* branch in `HistoryPage`, which a marker assertion pins precisely without re-testing the floored child.
