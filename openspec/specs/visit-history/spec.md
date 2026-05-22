# visit-history Specification

## Purpose

TBD - created by archiving change add-following-and-history. Update Purpose after archive.

## Requirements

### Requirement: Authenticated visits to non-owned non-private lists SHALL be recorded

When an authenticated user renders `/lists/[id]` for a list they do NOT own AND whose visibility is NOT `'private'`, the system SHALL upsert a row into `list_visits` keyed by `(user_id, list_id)`. The upsert SHALL set `last_visited_at = NOW()` and increment `visit_count` (or initialize to 1 on insert). `favorited_at` SHALL be preserved across visits. Recording SHALL be performed server-side on page render; no client beacon is required.

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

### Requirement: Bookmarking SHALL be an explicit toggle that survives in history

A user SHALL be able to bookmark any list whose page they can render (i.e. accessible to them). Bookmarking sets `list_visits.favorited_at = NOW()` (upserting the row if necessary). Unbookmarking sets `list_visits.favorited_at = NULL` and SHALL NOT delete the visit row. Bookmarked lists SHALL continue to appear in visit history alongside non-bookmarked visits.

#### Scenario: Bookmark from list page

- **WHEN** an authenticated viewer clicks the Bookmark button on a list page
- **THEN** the corresponding `list_visits` row exists with `favorited_at` set to the current time

#### Scenario: Bookmark before any visit

- **WHEN** a viewer somehow invokes `bookmarkList` without an existing `list_visits` row (e.g. via a direct action call)
- **THEN** the upsert creates a row with `favorited_at = NOW()` and `last_visited_at = NOW()`

#### Scenario: Unbookmark preserves visit history

- **WHEN** a viewer unbookmarks a list they have previously visited
- **THEN** the `list_visits` row's `favorited_at` is set to NULL, and `last_visited_at` and `visit_count` remain unchanged

#### Scenario: Bookmarked list appears in both Bookmarks and history

- **WHEN** a user has bookmarked a list they have visited
- **THEN** the list appears in `/lists/bookmarks` ordered by `favorited_at DESC` AND appears in `/lists/history` ordered by `last_visited_at DESC` with a visible bookmark indicator

### Requirement: Visit history page SHALL support per-row remove and bulk clear

The `/lists/history` page SHALL render visit rows in `last_visited_at DESC` order with a per-row remove (×) affordance and a bulk-clear action. Remove SHALL be disabled for bookmarked rows. Bulk-clear SHALL offer two options: clear non-bookmarked rows (default), or clear all rows including bookmarked.

#### Scenario: Per-row remove

- **WHEN** a user clicks × on a non-bookmarked history row
- **THEN** the `list_visits` row is deleted

#### Scenario: Per-row remove disabled for bookmarked

- **WHEN** a row has `favorited_at IS NOT NULL`
- **THEN** the × affordance is disabled and a tooltip explains that bookmarked rows must be unbookmarked first

#### Scenario: Clear non-bookmarked

- **WHEN** a user clicks "Clear history" and selects the default option
- **THEN** all `list_visits` rows for the user with `favorited_at IS NULL` are deleted; bookmarked rows remain

#### Scenario: Clear all

- **WHEN** a user clicks "Clear history" and selects "Clear all"
- **THEN** all `list_visits` rows for the user are deleted, including bookmarked ones

### Requirement: Migration SHALL promote saved lists to bookmarks and leave the source table dormant

The migration introducing `list_visits` SHALL insert one `list_visits` row per `saved_lists` row with `favorited_at = NOW()`, `last_visited_at = NOW()`, and `visit_count = 0`. The `saved_lists` table SHALL remain in the database after the data copy; this change SHALL NOT drop it. App code SHALL stop reading and writing `saved_lists` after this change. A subsequent change (`archive-saved-lists`) is responsible for dropping the dormant table.

#### Scenario: Saved list becomes a bookmark

- **WHEN** the migration runs against a `saved_lists` row `(user_id=U, list_id=L)`
- **THEN** a `list_visits` row exists for `(U, L)` with `favorited_at` and `last_visited_at` set to the migration time, `visit_count = 0`

#### Scenario: Source row preserved

- **WHEN** the migration completes
- **THEN** the original `saved_lists` row `(U, L)` still exists, untouched

#### Scenario: Row count parity

- **WHEN** the migration completes
- **THEN** `count(list_visits WHERE favorited_at IS NOT NULL) = count(saved_lists)`

#### Scenario: App stops referencing saved_lists

- **WHEN** an app-code grep is run after this change is implemented
- **THEN** no application code (under `app/` or `lib/`) reads from or writes to `saved_lists`; the only reference remaining is the Drizzle table definition in `db/schema.ts`

#### Scenario: New bookmarks do not propagate to saved_lists

- **WHEN** a user bookmarks a list after this change is deployed
- **THEN** a `list_visits` row is upserted with `favorited_at` set, and `saved_lists` is NOT modified
