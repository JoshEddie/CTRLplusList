## ADDED Requirements

### Requirement: The choose-items page SHALL render a filter/sort toolbar driven by URL params

The choose-items page SHALL render a toolbar containing: a search input, a sort dropdown, a "Show" dropdown for list-status filtering, a store filter popover, and a price filter popover. All toolbar state SHALL be reflected in URL query parameters (`q`, `sort`, `show`, `store` (repeatable), `price_min`, `price_max`) so that back/forward navigation and direct links preserve the user's view. When no toolbar URL params are present, the page SHALL render with default state (no search text, sort by newest, show all items, no store filter, no price filter), matching the page's pre-toolbar behavior.

#### Scenario: Toolbar renders on the choose-items page

- **WHEN** the owner navigates to `/lists/[id]/choose-items`
- **THEN** the page renders a toolbar with search, sort, show, stores, and price controls above the items list

#### Scenario: Search filters the rendered list by name

- **WHEN** the owner types text into the toolbar search input
- **THEN** after a short debounce the URL is updated with `?q=<text>` and the rendered list shows only items whose name contains the text (case-insensitive)

#### Scenario: Sort reorders the rendered list

- **WHEN** the owner selects a sort option other than the default
- **THEN** the URL is updated with `?sort=<key>` and the rendered list is re-ordered accordingly; selecting the default sort removes the param from the URL

#### Scenario: Sort options match the items page

- **WHEN** the owner opens the sort dropdown
- **THEN** the options are: Newest, Oldest, Name A–Z, Name Z–A, Store A–Z, Store Z–A, Price low to high, Price high to low

#### Scenario: Show filter narrows by list status — Only on the list

- **WHEN** the owner selects `Show: Only on the list`
- **THEN** the URL is updated with `?show=on` and the rendered list shows only items whose saved state is currently on this list (i.e. members of `initialSelectedIds`)

#### Scenario: Show filter narrows by list status — Only not on the list

- **WHEN** the owner selects `Show: Only not on the list`
- **THEN** the URL is updated with `?show=off` and the rendered list shows only items not currently on this list

#### Scenario: Show filter — All

- **WHEN** the owner selects `Show: All` (the default)
- **THEN** the `show` param is removed from the URL and the rendered list shows all items that the page would otherwise render (active items in the library plus archived items currently on the list)

#### Scenario: Store filter narrows the rendered list

- **WHEN** the owner opens the stores popover and selects one or more stores
- **THEN** the URL is updated with one repeated `store=<name>` param per selection and the rendered list shows only items whose stores include at least one of the selected names

#### Scenario: Price filter narrows the rendered list

- **WHEN** the owner sets a minimum and/or maximum price and applies the filter
- **THEN** the URL is updated with `price_min` and/or `price_max` and the rendered list shows only items whose price falls within the range

#### Scenario: Toolbar state survives back/forward navigation

- **WHEN** the owner applies search/sort/show/store/price filters, navigates away, then returns via the browser back button
- **THEN** the toolbar controls and the rendered list reflect the previously applied state read from the URL

#### Scenario: Default state with no URL params

- **WHEN** the owner navigates to `/lists/[id]/choose-items` with no toolbar URL params
- **THEN** the search is empty, sort is Newest, show is All, no stores or prices are filtered, and the rendered list matches the page's pre-toolbar default behavior

### Requirement: Filter and sort SHALL be derived from URL params client-side and SHALL NOT affect server-side data loading

The choose-items page SHALL continue to load the owner's full library on the server (active items plus archived items currently on the list). The toolbar's filter and sort SHALL be applied client-side over that already-loaded array. Server actions and the underlying DAL functions SHALL NOT be modified by this change.

#### Scenario: Server load is unchanged by toolbar URL params

- **WHEN** the page is requested with any combination of `q`, `sort`, `show`, `store`, `price_min`, or `price_max` URL params
- **THEN** the server-side `getItemsByUser` call uses the same arguments it does today and returns the same set of items; only the client-side rendered subset and order change

#### Scenario: Selection state is preserved across filter changes

- **WHEN** the owner checks items under one filter setting and then changes the `show`, `store`, `price`, sort, or search controls
- **THEN** the in-progress selection (the set of checkboxes that are checked) is preserved unchanged; only which items are visible may change

#### Scenario: Show filter keys off saved membership, not pending selection

- **WHEN** the owner unchecks a currently-saved item under `Show: All`, then switches to `Show: Only on the list`
- **THEN** the just-unchecked item is still rendered (because saved membership has not changed), and its checkbox reflects the pending unchecked state

## MODIFIED Requirements

### Requirement: The choose-items page SHALL show the owner's library with current list membership pre-checked

The page SHALL render every active item in the owner's library plus any archived items currently on the list, each as a selectable row. Rows whose item is currently in `list_items` for this list SHALL be pre-checked. Archived items that appear because they are on the list SHALL display an "archived" indicator. The set of rows the page loads SHALL be unchanged by toolbar URL params; the toolbar's search, sort, and filter controls narrow and reorder the rendered subset client-side.

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
