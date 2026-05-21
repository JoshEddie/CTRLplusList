## ADDED Requirements

### Requirement: Lists SHALL have a three-state visibility model

Every list SHALL have a `visibility` value of exactly one of `'private'`, `'unlisted'`, or `'public'`, persisted in `lists.visibility`. A `private` list is visible only to its owner. An `unlisted` list is visible to anyone with the URL but does NOT appear in any feed. A `public` list is visible to anyone with the URL AND appears in the feeds of users who follow the owner.

#### Scenario: Private list inaccessible to non-owners

- **WHEN** a non-owner (authenticated or not) navigates to `/lists/[id]` for a list with `visibility = 'private'`
- **THEN** the system renders the private-list interstitial (existing behavior) and does NOT expose the list's contents

#### Scenario: Unlisted list accessible by URL only

- **WHEN** a non-owner navigates to `/lists/[id]` for a list with `visibility = 'unlisted'`
- **THEN** the list renders normally for the viewer, and the list does NOT appear in any follower feed regardless of follow relationships

#### Scenario: Public list accessible by URL and in follower feeds

- **WHEN** a list has `visibility = 'public'` and the owner has at least one follower
- **THEN** the list is URL-accessible to anyone AND the list is included in each follower's Following feed sources

### Requirement: `shared_at` SHALL only update on the `private → non-private` transition

`lists.shared_at` is a nullable timestamp representing when the list first entered circulation. It SHALL be set to `NOW()` only when `visibility` transitions from `'private'` to `'unlisted'` or `'public'`. It SHALL NOT update on transitions between `'unlisted'` and `'public'`. It SHALL be set to `NULL` on any transition back to `'private'`.

#### Scenario: First share sets shared_at

- **WHEN** an owner changes a list from `'private'` to `'unlisted'` (or `'public'`)
- **THEN** `lists.shared_at` is set to the current time

#### Scenario: Toggling between unlisted and public does not reset shared_at

- **WHEN** an owner changes a list from `'unlisted'` to `'public'` (or vice versa)
- **THEN** `lists.shared_at` retains its prior value

#### Scenario: Returning to private clears shared_at

- **WHEN** an owner changes a list from `'unlisted'` or `'public'` back to `'private'`
- **THEN** `lists.shared_at` is set to NULL

#### Scenario: Re-sharing after private gets a fresh shared_at

- **WHEN** an owner cycles `'public' → 'private' → 'public'`
- **THEN** the second `'public'` state has a fresh `shared_at` equal to the current time, not the original value

### Requirement: List owners SHALL set visibility via a two-state toggle plus a feed checkbox

The list edit / sharing UI SHALL present a two-option segmented toggle labeled **Private** and **Shared**, plus — when **Shared** is active — a checkbox labeled **"Show in followers' feed"**. The UI SHALL map to the underlying `visibility` enum as follows: Private → `'private'`; Shared with checkbox off → `'unlisted'`; Shared with checkbox on → `'public'`. The action `setListVisibility(id, visibility)` is invoked on every change. Only the list owner SHALL be authorized to change visibility.

#### Scenario: Owner sees Private/Shared toggle

- **WHEN** an authenticated owner views the sharing UI for their list
- **THEN** a two-option segmented toggle renders with Private and Shared, indicating the current state (Shared is active iff `visibility !== 'private'`)

#### Scenario: Feed checkbox visible only when Shared

- **WHEN** the toggle is set to Private
- **THEN** the "Show in followers' feed" checkbox is NOT rendered

#### Scenario: Feed checkbox state reflects visibility

- **WHEN** the toggle is set to Shared
- **THEN** the "Show in followers' feed" checkbox is rendered and is checked iff `visibility === 'public'`

#### Scenario: Private → Shared defaults to link-only

- **WHEN** the owner switches the toggle from Private to Shared
- **THEN** `setListVisibility(id, 'unlisted')` is invoked (the feed checkbox is rendered, unchecked)

#### Scenario: Checking the feed box promotes unlisted to public

- **WHEN** the list is currently `'unlisted'` and the owner checks "Show in followers' feed"
- **THEN** `setListVisibility(id, 'public')` is invoked

#### Scenario: Unchecking the feed box demotes public to unlisted

- **WHEN** the list is currently `'public'` and the owner unchecks "Show in followers' feed"
- **THEN** `setListVisibility(id, 'unlisted')` is invoked

#### Scenario: Shared → Private clears the feed bit

- **WHEN** the owner switches the toggle from Shared (in any sub-state) to Private
- **THEN** `setListVisibility(id, 'private')` is invoked, and on a subsequent Private → Shared transition the feed checkbox SHALL render unchecked

#### Scenario: Non-owner submission is rejected

- **WHEN** a `setListVisibility` request is made by a non-owner
- **THEN** the action returns an unauthorized response and `lists.visibility` is unchanged

### Requirement: Migration SHALL preserve existing share state without retroactive broadcast

The migration adding `lists.visibility` SHALL map `shared = false` to `'private'` and `shared = true` to `'unlisted'`. It SHALL NOT promote any existing list to `'public'` automatically. `shared_at` SHALL backfill to `created_at` for migrated `'unlisted'` lists and remain NULL for migrated `'private'` lists. The `lists.shared` column SHALL NOT be modified or dropped by this migration; it remains in place during the soak and is dropped by a follow-up change.

#### Scenario: Existing shared list becomes unlisted

- **WHEN** the migration runs against a list with `shared = true, created_at = T`
- **THEN** the row's new state is `visibility = 'unlisted', shared_at = T, shared = true` (the `shared` value is unchanged)

#### Scenario: Existing private list stays private

- **WHEN** the migration runs against a list with `shared = false`
- **THEN** the row's new state is `visibility = 'private', shared_at = NULL, shared = false` (the `shared` value is unchanged)

#### Scenario: `lists.shared` column is preserved

- **WHEN** the migration completes
- **THEN** the `lists.shared` column still exists and every row's `shared` value matches its pre-migration value

### Requirement: `setListVisibility` SHALL dual-write to the legacy `shared` column

For the duration of the soak, `setListVisibility` SHALL update both `visibility` and `lists.shared` in the same statement. The `shared` write is derived: `shared = (visibility != 'private')`. This ensures that any list whose visibility is changed via dev's code path is visible to main's reads with consistent semantics. Dev code SHALL NOT read from `lists.shared`; the dual-write exists solely for main's compatibility.

#### Scenario: Public via dev sets shared to true

- **WHEN** dev's `setListVisibility(id, 'public')` runs against a list previously `private`
- **THEN** the row's new state has `visibility = 'public'` AND `shared = true`

#### Scenario: Unlisted via dev sets shared to true

- **WHEN** dev's `setListVisibility(id, 'unlisted')` runs against a list previously `private`
- **THEN** the row's new state has `visibility = 'unlisted'` AND `shared = true`

#### Scenario: Private via dev sets shared to false

- **WHEN** dev's `setListVisibility(id, 'private')` runs against a list previously `public` or `unlisted`
- **THEN** the row's new state has `visibility = 'private'` AND `shared = false`

#### Scenario: Dev does not read `lists.shared`

- **WHEN** an automated grep is run across `app/` and `lib/` for `lists.shared`
- **THEN** the only matches are inside `setListVisibility`'s UPDATE statement; no reads exist elsewhere in dev code
