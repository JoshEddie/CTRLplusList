## ADDED Requirements

### Requirement: Visit-history capability carve-out SHALL be tested at the universal COVERAGE_FLOOR against the real test database

The `visit-history` capability carve-out SHALL be covered by five colocated test files. Two run under the **node** project against the PGlite test database (`bootPglite()` from `test/helpers/db.ts`, with `next/cache` mocked via `mockNextCache()` and `@/db` mocked to the PGlite instance): `lib/__tests__/visitHistory.dal.test.ts` (the three reads `getBookmarkedListsByUser`, `getBookmarkStatus`, `getVisitHistoryByUser`) and `app/actions/__tests__/visitHistory.actions.test.ts` (the four mutations `bookmarkList`, `unbookmarkList`, `clearVisitHistory`, `removeVisit`, the `authedUserId` helper, and the visit-recording upsert + dedupe race). Three run under the **jsdom** project: `app/(main)/lists/ui/components/__tests__/BookmarkButton.test.tsx`, `app/(main)/lists/history/__tests__/HistoryActions.test.tsx`, and `app/(main)/lists/history/__tests__/HistoryCard.test.tsx`.

The DAL reads and server actions SHALL be exercised as the REAL production functions (imported and invoked, NOT re-implemented in the test), so coverage attributes to `lib/dal.ts` and `app/actions/lists.ts`. Internal modules SHALL NOT be mocked; only the NextAuth boundary (`@/lib/auth`'s `auth()`), the `next/cache` module, and — for the client-component widget tests — the server-action RPC boundary (`@/app/actions/lists`) SHALL be mocked.

The three single-purpose widget files (`BookmarkButton.tsx`, `HistoryActions.tsx`, `HistoryCard.tsx`) SHALL be enumerated in `vitest.config.ts` per-file `thresholds` at the universal `COVERAGE_FLOOR` (`lines:98 / statements:98 / branches:95 / functions:100`) and SHALL have `sonarjs/cognitive-complexity` promoted to `error` via `eslint.config.mjs`. The multi-capability shared files `lib/dal.ts` and `app/actions/lists.ts` SHALL NOT be enumerated in `thresholds` by this carve-out (their per-file gate cannot pass until every function in each file is covered by its owning sub-proposal); their enumeration is deferred per the governance checkbox added to `test-coverage/tasks.md`. The visit-history functions within those files SHALL nonetheless meet the universal floor, verified per-function from `coverage/coverage-summary.json` line ranges and recorded in this sub-proposal's `tasks.md`.

#### Scenario: Each enumerated widget file meets the universal floor

- **WHEN** `npm test -- --coverage` runs against `main` after this change archives
- **THEN** the per-file coverage report shows each of `BookmarkButton.tsx`, `HistoryActions.tsx`, and `HistoryCard.tsx` at `lines ≥ 98%, statements ≥ 98%, branches ≥ 95%, functions = 100%`
- **AND** all three per-file threshold entries in `vitest.config.ts` reference the shared `COVERAGE_FLOOR` constant (no per-file numeric variation)

#### Scenario: DAL and actions are tested against the real test database, not mocked

- **WHEN** a visit-history DAL read or server-action mutation is exercised
- **THEN** the test runs the real production function against PGlite (`bootPglite()`)
- **AND** the function is NOT re-implemented in the test and NOT stubbed
- **AND** only the NextAuth boundary, `next/cache`, and (for widgets) the server-action RPC boundary are mocked

#### Scenario: Multi-capability shared files are not gated until whole-covered

- **WHEN** this carve-out validates coverage at archive time
- **THEN** `lib/dal.ts` and `app/actions/lists.ts` do NOT appear in `vitest.config.ts` `thresholds`
- **AND** a governance checkbox in `test-coverage/tasks.md` records that these files are enumerated at the universal floor once every function in each is covered, OR the per-file rule is amended with a per-function mechanism for them

#### Scenario: Elevated invariants are regression-locked

- **WHEN** a future change makes `getVisitHistoryByUser` stop filtering `last_visited_at IS NOT NULL`, or makes `getBookmarkedListsByUser` stop filtering `favorited_at IS NOT NULL`
- **THEN** the corresponding test in `visitHistory.dal.test.ts` fails with an assertion naming the regression (a removed-but-bookmarked row reappearing in history, or an unbookmarked row appearing in bookmarks)
- **AND** the `test` pre-merge gate fails
- **AND WHEN** a future change makes the visit-recording upsert reject conflicts instead of absorbing them, or makes `removeVisit` delete a bookmarked row instead of nulling its `last_visited_at`
- **THEN** the corresponding test in `visitHistory.actions.test.ts` fails with an assertion naming the specific contract break (a `23505` surfacing on the visit path, or a lost bookmark)
- **AND** the `test` pre-merge gate fails
