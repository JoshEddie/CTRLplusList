## ADDED Requirements

### Requirement: lists.updated_at SHALL advance only on follower-notifiable changes

`lists.updated_at` SHALL advance when, and only when, a mutation changes what a follower would plausibly be notified about — the list's own details or its item membership. Specifically, the timestamp SHALL advance on:

- A list detail edit (`updateList`) that actually changes at least one of `name`, `subtitle`, `occasion`, `date`.
- An item being added to or removed from the list, via any path: the choose-items save (`setListItems`), the item form's list membership update (`updateItemLists`), or item deletion (whose cascade removes the item from its lists).

The timestamp SHALL NOT advance on:

- Reorders (`updatePriority`), including position rebalances.
- Item field edits (`updateItem` — name, description, image, stores, quantity limit).
- Item archive or unarchive (`archiveItem`) — the membership row persists and the flip is reversible.
- Visibility changes (`setListVisibility`) — share recency is owned by `shared_at`.
- Claims and unclaims (purchase rows) — a claim-driven bump would leak claim activity to the list owner through the timestamp.

Bumps SHALL be issued by an internal data-layer helper that updates `updated_at` for an explicit set of list ids; the helper SHALL NOT be exported from a `'use server'` module.

#### Scenario: Detail edit advances the timestamp

- **WHEN** the owner edits a list's name (or subtitle, occasion, or date) to a different value
- **THEN** the list's `updated_at` is set to the time of the edit

#### Scenario: Adding items via choose-items advances the timestamp

- **WHEN** the owner saves a choose-items selection that inserts or deletes at least one `list_items` row
- **THEN** the list's `updated_at` is set to the time of the save

#### Scenario: Item-form membership change advances only the affected lists

- **WHEN** an item edit changes the item's list membership, adding it to list A and removing it from list B while list C's membership is unchanged
- **THEN** `updated_at` advances on lists A and B
- **AND** list C's `updated_at` is unchanged

#### Scenario: Deleting an item advances its lists' timestamps

- **WHEN** an item that is a member of one or more lists is deleted
- **THEN** each of those lists' `updated_at` is set to the time of the deletion

#### Scenario: Reorder does not advance the timestamp

- **WHEN** the owner reorders items on a list via drag (including a move that triggers a full position rebalance)
- **THEN** the list's `updated_at` is unchanged

#### Scenario: Item field edit does not advance the timestamp

- **WHEN** the owner edits an item's name, description, image, stores, or quantity limit without changing its list membership
- **THEN** `updated_at` is unchanged on every list the item is on

#### Scenario: Archive does not advance the timestamp

- **WHEN** the owner archives or unarchives an item that is on a list
- **THEN** the list's `updated_at` is unchanged

#### Scenario: Visibility change does not advance the timestamp

- **WHEN** the owner changes a list's visibility between private, unlisted, and public
- **THEN** the list's `updated_at` is unchanged

#### Scenario: Claiming an item does not advance the timestamp

- **WHEN** a viewer claims or unclaims an item on a list
- **THEN** the list's `updated_at` is unchanged

### Requirement: A no-op detail update SHALL issue no write and SHALL still succeed

`updateList` SHALL compare the validated payload against the stored row (reusing the row already fetched for the ownership check) and, when every supplied field equals its stored value, SHALL issue no `UPDATE` statement at all and return a success response. `date` SHALL be compared by value, not object identity; `subtitle` SHALL be compared after normalization (trimmed-or-null) and an omitted field (`undefined`) SHALL be treated as unchanged.

#### Scenario: Identical payload issues no write

- **WHEN** `updateList` is invoked with a payload whose supplied values all equal the stored row's values
- **THEN** no `UPDATE` is issued, `updated_at` is unchanged, and the action returns `{ success: true }`

#### Scenario: Same-instant date is not dirty

- **WHEN** the payload's `date` is a different `Date` object representing the same instant as the stored value
- **THEN** the field is treated as unchanged

#### Scenario: Partial payload compares only supplied fields

- **WHEN** the payload supplies a changed `name` and omits `subtitle`
- **THEN** the write proceeds for `name` and `updated_at` advances, and the stored `subtitle` is untouched

### Requirement: Every mutation that advances updated_at SHALL revalidate the lists cache tag

Each mutation path that advances a list's `updated_at` SHALL call `updateTag('lists')` so cached list reads (hero footer, list cards, `getListsByUser` ordering) reflect the new timestamp. This includes paths that today revalidate only `items` (`updateItemLists` via the item form, `deleteItem`).

#### Scenario: Item-form membership change refreshes list reads

- **WHEN** an item edit changes list membership and bumps the affected lists' `updated_at`
- **THEN** the `lists` cache tag is revalidated and a subsequent list read returns the new timestamp
