## ADDED Requirements

### Requirement: The bookmarks, visit-history, and purchased page shells SHALL be whole-covered at the universal COVERAGE_FLOOR

The three list-activity **full-result page-shell** clusters left at 0% by the §0–§6 carve-outs — the Bookmarks page (`app/(main)/lists/bookmarks/`), the Visit-history page shells (`app/(main)/lists/history/`, excluding the `HistoryCard` / `HistoryActions` leaves already floored by 4.14), and the Purchased page (`app/(main)/purchased/`), whose composed leaves were already floored (the `lib/dal.ts` reads under 9.1, the visit-history cards under 4.14, the `Items` browser under 4.5/4.9/4.18) but whose route shells had no unit tests — SHALL be brought to the universal per-file `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) by colocated `*.test.tsx` files under the **jsdom** vitest project. The covered files are, under `app/(main)/lists/bookmarks/`: `page.tsx`, `BookmarksPage.tsx`, and `BookmarksList.tsx`; under `app/(main)/lists/history/`: `page.tsx`, `HistoryPage.tsx`, and `HistoryList.tsx`; and under `app/(main)/purchased/`: `page.tsx` and `loading.tsx`.

The async server-component shells (`BookmarksPage`, `HistoryPage`, `purchased/page.tsx`) SHALL be tested via the async-RSC pattern: `auth()` mocked, the `lib/dal.ts` reads mocked at the `@/lib/dal` boundary, and `next/navigation`'s `redirect()` mocked to throw the established `REDIRECT:${url}` sentinel so each auth-guard branch is assertable. The in-carve-out children (`BookmarksList`, `HistoryList`) SHALL be rendered through for real; the already-floored siblings (`ListCard` under 4.6, `HistoryCard` / `ClearHistoryButton` under 4.14, `Items` under 4.5, and `ListCollectionsNav` under 4.6, which reads `usePathname`) MAY be mocked to isolate the parent shell's branch logic, asserting the forwarded props or the rendered marker. The pure layout shells (`bookmarks/page.tsx`, `history/page.tsx`) SHALL mock their async child and assert the `<main>` wrapper, the composition, and the exported `metadata.title`; the trivial `purchased/loading.tsx` SHALL be asserted via the returned React element's `type`/`props`. No governed primitive, `lib/dal.ts` read, visit-history card, or `Items` browser SHALL be re-owned or re-tested here, and internal modules SHALL NOT otherwise be mocked beyond those boundaries.

On completion, every covered file SHALL be enumerated in `vitest.config.ts` per-file `thresholds` at the shared `COVERAGE_FLOOR` constant (no per-file numeric variation) and SHALL have `sonarjs/cognitive-complexity` promoted to `error` in `eslint.config.mjs`.

#### Scenario: The bookmarks, history, and purchased page shells meet the universal floor

- **WHEN** `npm run test:coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of the eight covered files at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** each per-file threshold entry in `vitest.config.ts` references the shared `COVERAGE_FLOOR` constant
- **AND** `eslint.config.mjs` sets `sonarjs/cognitive-complexity` to `error` for each covered file

#### Scenario: The async page shells assert both auth-guard legs and the read wiring

- **WHEN** a `BookmarksPage` / `HistoryPage` / `purchased/page.tsx` test runs the resolved component with `auth()` → `null`, and again with a session whose `getUserIdByEmail` → `null`
- **THEN** each leg throws the `redirect('/')` sentinel and the `@/lib/dal` read is not called
- **AND** with a resolved viewer and a stubbed read, the shell calls the expected read (`getBookmarkedListsByUser(viewer.id)` / `getVisitHistoryByUser(viewer.id, { limit: 100 })` / `getItemsByPurchased(user.id)`) and forwards its rows to the rendered child

#### Scenario: The history page conditionally renders the bulk-clear affordance

- **WHEN** `HistoryPage` is rendered with a non-empty `getVisitHistoryByUser` result, and again with an empty result
- **THEN** the `ClearHistoryButton` (mocked to a marker, floored by 4.14) is present in the `ListCollectionsNav` slot for the non-empty case
- **AND** the `ClearHistoryButton` marker is absent for the empty case (`rows.length === 0`)

#### Scenario: The list-render components assert both the empty and populated branches

- **WHEN** a `BookmarksList` / `HistoryList` test renders with an empty `rows` array, and again with a non-empty array
- **THEN** the empty case renders the empty-message paragraph (`bookmarks-empty` / `history-empty`) and no `role="list"` grid
- **AND** the populated case renders the `<ul className="list-card-grid" role="list">` with one item per row, each wrapping the mocked floored child (`ListCard` with `showOwner` / `HistoryCard`)
