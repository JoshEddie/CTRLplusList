## ADDED Requirements

### Requirement: List owners SHALL access a unified choose-items page from a list

A list owner viewing their own list SHALL see a **Choose items** affordance (button on desktop, kebab menu entry on mobile) that routes to `/lists/[id]/choose-items`. Non-owners SHALL NOT see this affordance, and direct navigation to the route as a non-owner SHALL redirect to `/lists/[id]`.

#### Scenario: Owner sees Choose items affordance

- **WHEN** an authenticated user views a list they own
- **THEN** the list page displays a **Choose items** button in the desktop "Manage" section and a "Choose items" entry in the mobile kebab menu, both linking to `/lists/[id]/choose-items`

#### Scenario: Non-owner cannot access the page

- **WHEN** an authenticated user who does not own the list navigates directly to `/lists/[id]/choose-items`
- **THEN** the system redirects to `/lists/[id]`

#### Scenario: Unauthenticated user cannot access the page

- **WHEN** an unauthenticated visitor navigates directly to `/lists/[id]/choose-items`
- **THEN** the system redirects to `/`

### Requirement: The choose-items page SHALL show the owner's library with current list membership pre-checked

The page SHALL render every active item in the owner's library plus any archived items currently on the list, each as a selectable row. Rows whose item is currently in `list_items` for this list SHALL be pre-checked. Archived items that appear because they are on the list SHALL display an "archived" indicator.

#### Scenario: Items on the list are pre-checked

- **WHEN** the owner opens the choose-items page for a list containing items A and B (both active)
- **THEN** rows for items A and B are rendered checked, and all other active items in the owner's library are rendered unchecked

#### Scenario: Archived item on the list is shown with badge

- **WHEN** the owner opens the choose-items page for a list that contains an archived item C
- **THEN** the row for item C is rendered, checked, with a visible "archived" indicator

#### Scenario: Archived item not on the list is hidden

- **WHEN** the owner has an archived item D that is NOT on any version of this list
- **THEN** item D does NOT appear on the choose-items page

#### Scenario: Empty library

- **WHEN** the owner has no items in their library
- **THEN** the page renders an empty state directing them to create items, and no save action is available

### Requirement: Saving SHALL apply the add+remove diff against list_items in a single action

Submitting the page SHALL invoke a server action that computes the diff between the user's current selection and the list's stored `list_items`, deletes rows for unchecked items, and inserts rows for newly checked items. The action SHALL be authorized to owners only and SHALL invalidate the `items` and `lists` cache tags on success.

#### Scenario: Mixed add and remove

- **WHEN** the owner unchecks two previously-checked items and checks three new items, then clicks **Save changes**
- **THEN** the two unchecked items' rows are deleted from `list_items` for this list, three new `list_items` rows are inserted for the newly checked items, and a success toast reports the counts

#### Scenario: No-op save

- **WHEN** the owner clicks **Save changes** without changing the selection
- **THEN** the Save button is disabled (or the action is a no-op) and `list_items` is unchanged

#### Scenario: Non-owner submission is rejected

- **WHEN** a request to set list items is made by a user who is not the list owner
- **THEN** the action returns an unauthorized response and `list_items` is unchanged

### Requirement: Re-added items SHALL NOT preserve prior position

When an item is removed and later re-added (in the same save or a subsequent save), its `position` SHALL be assigned as if it were a brand-new addition, placing it at the bottom of the list (`MAX(position) + 65536`). Prior position values are not retained.

#### Scenario: Remove then re-add lands at bottom

- **WHEN** the owner removes item X from a list (saving the change), then later adds item X back via choose-items
- **THEN** item X is inserted with `position = MAX(position) + 65536` over remaining rows, placing it last in default ordering

#### Scenario: Same-save remove and re-add

- **WHEN** the owner toggles item Y off and back on within a single page session, then clicks **Save changes**
- **THEN** the diff is empty for item Y and no database write occurs for that item

### Requirement: List creation and empty-list CTAs SHALL route to choose-items

The post-create redirect after creating a new list and the empty-state CTA shown on a list with no items SHALL navigate to `/lists/[id]/choose-items` (not the legacy add-items route). The post-create redirect SHALL include a `new=1` query parameter so the page can render an appropriate "Skip for now" secondary action; on subsequent visits the secondary action SHALL read "Back to list".

#### Scenario: Post-create redirect

- **WHEN** the owner creates a new list via the list form
- **THEN** the form redirects to `/lists/[id]/choose-items?new=1` for the new list, and the page renders "Skip for now" as the secondary action

#### Scenario: Subsequent visit

- **WHEN** the owner opens the choose-items page from the persistent **Choose items** button (no `new=1` query param)
- **THEN** the page renders "Back to list" as the secondary action

#### Scenario: Empty-list CTA

- **WHEN** the owner views their own list that has zero items
- **THEN** the empty-state CTA links to `/lists/[id]/choose-items`
