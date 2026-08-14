# list-item-management delta

## MODIFIED Requirements

### Requirement: The choose-items page SHALL render a filter/sort toolbar driven by URL params

The choose-items page SHALL render a toolbar containing: a search input, a sort dropdown, a "Show" dropdown for list-status filtering, a store filter popover, and a price filter popover. All toolbar state SHALL be reflected in URL query parameters (`q`, `sort`, `show`, `store` (repeatable), `price_min`, `price_max`) so that back/forward navigation and direct links preserve the user's view. Store filtering and store-option collection SHALL read each item's single DAL-provided `store` (per `item-store-links`) — dormant legacy rows are absent from the fetched shape and SHALL NOT contribute options or matches. When no toolbar URL params are present, the page SHALL render with default state (no search text, sort by newest, show all items, no store filter, no price filter), matching the page's pre-toolbar behavior.

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
- **THEN** the URL is updated with one repeated `store=<name>` param per selection and the rendered list shows only items whose store's name is in the selected set

#### Scenario: Price filter narrows the rendered list

- **WHEN** the owner sets a minimum and/or maximum price and applies the filter
- **THEN** the URL is updated with `price_min` and/or `price_max` and the rendered list shows only items whose price falls within the range

#### Scenario: Toolbar state survives back/forward navigation

- **WHEN** the owner applies search/sort/show/store/price filters, navigates away, then returns via the browser back button
- **THEN** the toolbar controls and the rendered list reflect the previously applied state read from the URL

#### Scenario: Default state with no URL params

- **WHEN** the owner navigates to `/lists/[id]/choose-items` with no toolbar URL params
- **THEN** the search is empty, sort is Newest, show is All, no stores or prices are filtered, and the rendered list matches the page's pre-toolbar default behavior
