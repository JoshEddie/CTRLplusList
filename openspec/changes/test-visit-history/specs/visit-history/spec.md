## MODIFIED Requirements

### Requirement: Authenticated visits to non-owned non-private lists SHALL be recorded

When an authenticated user renders `/lists/[id]` for a list they do NOT own AND whose visibility is NOT `'private'`, the system SHALL upsert a row into `list_visits` keyed by `(user_id, list_id)`. The upsert SHALL set `last_visited_at = NOW()` and increment `visit_count` (or initialize to 1 on insert). `favorited_at` SHALL be preserved across visits. Recording SHALL be performed server-side on page render; no client beacon is required.

The dedupe backstop for `(user_id, list_id)` SHALL be the table's composite **primary key** `(user_id, list_id)` — NOT a partial unique index. (A partial unique index is unnecessary because neither key column is nullable; there is no NULL-keyed subset to exclude, unlike `purchases`.) The upsert SHALL use `ON CONFLICT (user_id, list_id) DO UPDATE` so that a conflict is **absorbed** (the update branch advances `last_visited_at` and increments `visit_count`) rather than rejected. Concurrent visit upserts for the same `(user_id, list_id)` SHALL therefore both succeed and SHALL converge to exactly one row; no `23505` unique-violation SHALL surface to application code on the visit-recording path.

#### Scenario: First visit creates a row

- **WHEN** an authenticated viewer (not the owner) loads a list they have not visited before
- **THEN** a new `list_visits` row exists with `last_visited_at = now`, `visit_count = 1`, `favorited_at = NULL`

#### Scenario: Repeat visit updates the existing row

- **WHEN** the same viewer loads the same list again
- **THEN** the existing `list_visits` row's `last_visited_at` is updated to now and `visit_count` is incremented; no new row is created

#### Scenario: Owner viewing own list is not recorded

- **WHEN** the list owner loads their own list
- **THEN** no `list_visits` row is inserted or updated for them

#### Scenario: Unauthenticated visit is not recorded

- **WHEN** an unauthenticated visitor loads any list
- **THEN** no `list_visits` activity occurs

#### Scenario: Private list visit is not recorded

- **WHEN** a viewer renders a list with `visibility = 'private'` (only possible as the owner; non-owners are redirected before render)
- **THEN** no `list_visits` row is inserted or updated

#### Scenario: Concurrent visits converge to one row via the composite-PK upsert

- **WHEN** two visit upserts for the same `(user_id, list_id)` execute against the database without an intervening read
- **THEN** both operations succeed (the second takes the `ON CONFLICT DO UPDATE` branch), exactly one `list_visits` row exists for that `(user_id, list_id)`, and `visit_count` reflects the conflict-absorbing update
- **AND** no `23505` unique-violation error is raised to application code

### Requirement: Visit history page SHALL support per-row remove and bulk clear

The `/lists/history` page SHALL render visit rows in `last_visited_at DESC` order with a per-row remove (×) affordance and a bulk-clear action. Remove SHALL be available for every row — including bookmarked rows. Removing a non-bookmarked row SHALL delete the `list_visits` row outright; removing a bookmarked row SHALL clear it from the history view by nulling `last_visited_at` while preserving the row and its `favorited_at` (so the bookmark survives in `/lists/bookmarks`). Bulk-clear SHALL offer two options: clear non-bookmarked rows (default — deletes `favorited_at IS NULL` rows and nulls `last_visited_at` on bookmarked rows), or clear all rows including bookmarked (deletes every row for the user).

#### Scenario: Per-row remove of a non-bookmarked row deletes it

- **WHEN** a user clicks × on a non-bookmarked history row
- **THEN** the `list_visits` row is deleted

#### Scenario: Per-row remove of a bookmarked row preserves the bookmark

- **WHEN** a user clicks × on a bookmarked history row (`favorited_at IS NOT NULL`)
- **THEN** the × affordance is enabled (NOT disabled)
- **AND** the row's `last_visited_at` is set to NULL so it leaves the history view
- **AND** the row is NOT deleted and its `favorited_at` is unchanged, so the list still appears in `/lists/bookmarks`

#### Scenario: Clear non-bookmarked

- **WHEN** a user clicks "Clear history" and selects the default option
- **THEN** all `list_visits` rows for the user with `favorited_at IS NULL` are deleted
- **AND** every bookmarked row has its `last_visited_at` set to NULL (the row and its `favorited_at` remain, leaving only the history view)

#### Scenario: Clear all

- **WHEN** a user clicks "Clear history" and selects "Clear all"
- **THEN** all `list_visits` rows for the user are deleted, including bookmarked ones

## ADDED Requirements

### Requirement: The visit-history read SHALL exclude rows whose last_visited_at is NULL

`getVisitHistoryByUser` SHALL return only `list_visits` rows for the user where `last_visited_at IS NOT NULL`, ordered by `last_visited_at DESC`, honoring any provided `limit` and `offset`. This exclusion is the mechanism by which a removed-but-bookmarked row (whose `last_visited_at` was nulled by `removeVisit` or `clearVisitHistory`) leaves the history view while remaining in the bookmarks view. Symmetrically, `getBookmarkedListsByUser` SHALL return only rows where `favorited_at IS NOT NULL`, ordered by `favorited_at DESC`, independent of `last_visited_at`. A reimplementation of either read that drops its null-filter would cause removed rows to reappear in history or unbookmarked rows to appear in bookmarks, and SHALL be treated as a regression.

#### Scenario: Removed-but-bookmarked row is absent from history but present in bookmarks

- **WHEN** a row has `favorited_at IS NOT NULL` and `last_visited_at IS NULL`
- **THEN** `getVisitHistoryByUser` does NOT return that row
- **AND** `getBookmarkedListsByUser` DOES return that row

#### Scenario: History read orders by last_visited_at descending

- **WHEN** a user has multiple `list_visits` rows with non-null `last_visited_at`
- **THEN** `getVisitHistoryByUser` returns them ordered most-recently-visited first

#### Scenario: Unbookmarked row is absent from bookmarks but present in history

- **WHEN** a row has `last_visited_at IS NOT NULL` and `favorited_at IS NULL`
- **THEN** `getBookmarkedListsByUser` does NOT return that row
- **AND** `getVisitHistoryByUser` DOES return that row
