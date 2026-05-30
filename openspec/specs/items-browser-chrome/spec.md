# items-browser-chrome Specification

## Purpose

TBD - created by archiving change compact-items-mobile-chrome. Update Purpose after archive.

## Requirements

### Requirement: Items browser chrome scope

The `items-browser-chrome` capability SHALL govern the layout, positioning, and viewport-adaptive behavior of the chrome surrounding the items grid within `ItemsBrowser` — specifically the `.items-toolbar` row, the view-mode rendering of `.item-grid` / `.item-list`, and the `.items-pagination` control. It SHALL apply to every page that mounts `ItemsBrowser`, which today is `.container--items-library` (the `/items` library) and `.container--list-details` (the list-details page items section).

This capability SHALL NOT govern the content of individual item cards (owned elsewhere — card content, store-links chip row, claim affordances), the filters bottom-sheet UX, the active-filter chip row, or any primitive's internal behavior (`SearchField`, `PopoverTrigger`, `SegmentedControl` keep their own specs as authoritative).

#### Scenario: Capability applies on items library page

- **WHEN** a user navigates to `/items` and the page mounts `ItemsBrowser`
- **THEN** the layout rules in this capability apply to the `.items-toolbar`, `.item-grid` / `.item-list`, and `.items-pagination` regions of that page

#### Scenario: Capability applies on list-details page

- **WHEN** a user navigates to `/lists/[id]` and the page mounts `ItemsBrowser`
- **THEN** the same layout rules apply to the toolbar, grid/list, and pagination regions of that page

### Requirement: Mobile view mode is single-column list

At viewport widths ≤599px, the items region SHALL render as the single-column list layout regardless of the `?view=` URL query parameter's value. The view-mode CSS override SHALL be achieved via media query without changing the URL parameter or any component state. At viewport widths ≥600px the `?view=` parameter SHALL continue to switch between grid and list layouts as it does today.

#### Scenario: Mobile renders list layout regardless of URL parameter

- **WHEN** the viewport is ≤599px and the URL contains `?view=grid` (or omits the parameter, defaulting to grid)
- **THEN** items render in single-column list layout, with each item occupying the full row width

#### Scenario: Desktop behavior unchanged

- **WHEN** the viewport is ≥600px
- **THEN** the items region renders grid layout by default, list layout when `?view=list` is set, and the user's view preference is reflected in the URL exactly as before this capability existed

#### Scenario: Resize preserves URL parameter

- **WHEN** a user has `?view=grid` set on desktop and resizes the window down to ≤599px, then back up to ≥600px
- **THEN** the URL parameter remains `?view=grid` throughout, and the items region returns to grid layout on the resize-up

### Requirement: Mobile view toggle hidden

At viewport widths ≤599px, the grid/list view-toggle cell within `.items-toolbar` SHALL be hidden from view. The `SegmentedControl` primitive instance SHALL still be mounted in the DOM (since the URL parameter is still active at ≥600px), but SHALL NOT be visible or focusable at mobile widths. Call sites that already disable the toggle via `showGridToggle={false}` SHALL continue to function unchanged (the toggle is hidden by both the prop and the media query simultaneously without conflict).

#### Scenario: View toggle not visible on mobile

- **WHEN** the viewport is ≤599px and `ItemsToolbar` renders with `showGridToggle={true}` (the default)
- **THEN** the user does not see the grid/list view-toggle control in the toolbar

#### Scenario: View toggle visible on desktop

- **WHEN** the viewport is ≥600px and `ItemsToolbar` renders with `showGridToggle={true}`
- **THEN** the grid/list view-toggle renders in the toolbar as a `SegmentedControl tone="light"` per the segmented-control-system spec

#### Scenario: Choose-items picker behavior preserved

- **WHEN** `ItemsToolbar` is rendered with `showGridToggle={false}` (the choose-items picker call site)
- **THEN** the view-toggle cell is absent at every viewport, as it is today

### Requirement: Mobile toolbar collapses to one row with compact filters icon

At viewport widths ≤599px, the `.items-toolbar-row` SHALL render a single grid row with two cells laid out as `1fr auto` — search field on the left (taking remaining width), filters trigger on the right (auto-sized to its content) — replacing the prior two-row mobile layout. The active-filter chip row beneath the toolbar SHALL continue to render as a wrapping flex row when chips are present, unchanged.

The filters trigger's visible "Filters" text label SHALL be hidden visually at this breakpoint via `display: none` on the `.popover-trigger-label` span, leaving the MdTune icon (with chevron and optional count badge) as the sole visible affordance. The `PopoverTrigger` call site SHALL continue to pass `label="Filters"` per the popover-trigger-system spec — only the rendered appearance is compacted. The button's accessible name SHALL be supplied by its existing `aria-label="Open filters"`, which takes precedence over the hidden visible label.

#### Scenario: Mobile toolbar shows single row with search and compact filters

- **WHEN** the viewport is ≤599px and the items toolbar is rendered
- **THEN** the toolbar row displays exactly two cells side-by-side: a wide search field (left) and a narrow filters icon-button (right), with no view-toggle cell; the filters button shows the MdTune icon and chevron but no visible "Filters" text

#### Scenario: Filters trigger accessible name is preserved

- **WHEN** a screen reader focuses the mobile filters trigger
- **THEN** the announced accessible name is "Open filters" (sourced from the button's `aria-label`), regardless of whether the visible "Filters" text is hidden

#### Scenario: Filters trigger remains visible while user is searching

- **WHEN** the viewport is ≤599px, the user has tapped the search field and is typing a query
- **THEN** the filters trigger remains visible and tappable — the user can apply a filter to narrow search results without dismissing the keyboard

#### Scenario: Active filter chips still render

- **WHEN** the viewport is ≤599px and the user has applied one or more non-default filters
- **THEN** the chips render in a wrapping row beneath the toolbar row, the same as on desktop

### Requirement: Pagination floats over content at all viewports

The `.items-pagination` control SHALL be positioned absolutely at the bottom of its items-browser container at all viewport widths, overlapping the bottom of the scrollable items grid rather than sitting in flow below it. The pagination control's background SHALL be rendered at 90% alpha so the items beneath it are faintly visible. The `.item-grid-container` SHALL have bottom padding sufficient to scroll the last item row clear of the floating pagination at all viewport widths. The overlay SHALL be anchored to `.container--items-library` and `.container--list-details` (not `.items-browser`) so it spans the container's full width — bypassing any inner horizontal padding on intermediate wrappers — and sits flush against the container's actual bottom edge.

#### Scenario: Pagination floats over last items at all viewports

- **WHEN** the items list is long enough to require scrolling to the bottom, at any viewport width
- **THEN** the pagination control is visible at the bottom of the items-browser with items faintly visible through its 90%-alpha background, and the last item row in the list scrolls fully into view above the pagination (not permanently obscured by it)

#### Scenario: Pagination spans container full width

- **WHEN** the pagination overlay renders
- **THEN** its left edge aligns with the container's left padding-box edge and its right edge aligns with the container's right padding-box edge — regardless of any horizontal margin or padding on intermediate wrapper elements

#### Scenario: Pagination affordances remain reachable

- **WHEN** the pagination is rendered as a floating overlay
- **THEN** all pagination buttons (page numbers, prev/next arrows) and the page-size select are clickable/tappable with their existing hit targets and aria-labels per the button-system spec

### Requirement: ItemsBrowser SHALL apply active filters, then sort, then paginate, in that order

`ItemsBrowser` SHALL derive the visible item set by applying the active filters, then sorting the filtered result by the active sort key, then slicing to the requested page window — in that fixed order. The filters SHALL compose conjunctively (an item is included only if it passes every active filter):

- **Search** (`q`): an item passes when the lowercased concatenation of its `name` and `description` contains the lowercased, trimmed query as a substring. An empty query applies no search filter.
- **Store** (`store`, repeatable): when one or more stores are selected, an item passes when ANY of its stores' names is in the selected set (OR within the store filter, AND with the other filter types).
- **Purchases** (`purchases`): `only` includes only items with `hasPurchases`; `none` includes only items without `hasPurchases`; any other value applies no purchases filter.
- **Price range** (`price_min` / `price_max`): when either bound is a finite number, an item passes when its `displayPrice` is finite AND within the inclusive `[min, max]` range (an absent bound is treated as `-Infinity` / `+Infinity`). Items whose `displayPrice` is non-finite SHALL be excluded whenever a price filter is active.

After filtering, the result SHALL be sorted by the active sort key via `compareItems`, except that the `list_order` key SHALL preserve the input order (no sort). The sorted result SHALL then be sliced to `[(page-1) * pageSize, page * pageSize)` to produce the visible page.

#### Scenario: Search matches name and description case-insensitively

- **WHEN** the query is `gift` and the item set contains one item whose name includes "Gift" and one whose description includes "gift" and one matching neither
- **THEN** both matching items are included and the non-matching item is excluded, regardless of letter case

#### Scenario: Store filter is OR-within, AND-across

- **WHEN** stores `Amazon` and `Etsy` are selected and a purchases filter `only` is also active
- **THEN** an item is visible only if it has at least one store named `Amazon` or `Etsy` AND it `hasPurchases`

#### Scenario: Price filter excludes non-finite prices

- **WHEN** a `price_min`/`price_max` range is active and an item has no store with both a name and a link (so its `displayPrice` is non-finite)
- **THEN** that item is excluded from the result even though it has no comparable price

#### Scenario: Pipeline order is filter then sort then paginate

- **WHEN** filters reduce 100 items to 30, the sort key is `price_asc`, the page size is 24, and the requested page is 2
- **THEN** the 30 filtered items are sorted ascending by price and the visible page is the slice `[24, 48)` of that sorted result (6 items)

#### Scenario: list_order preserves input order

- **WHEN** the active sort key is `list_order`
- **THEN** the filtered items render in their input order with no reordering applied

### Requirement: Out-of-range page requests SHALL clamp; an empty filtered result SHALL render a clear-filters affordance

`ItemsBrowser` SHALL compute `totalPages` as `max(1, ceil(filteredCount / pageSize))` and SHALL clamp the requested page into `[1, totalPages]`. A `page` search param that is non-numeric, `≤ 0`, or greater than `totalPages` SHALL resolve to a valid in-range page rather than rendering an empty page.

When the filtered result is empty, `ItemsBrowser` SHALL render the filtered-empty state (`.items-empty-filtered`) containing the message "No items match your filters." and a Clear-filters control. Activating the control SHALL remove `q`, `store`, `purchases`, `price_min`, `price_max`, and `page` from the URL.

#### Scenario: Over-range page clamps to the last page

- **WHEN** the filtered result has 3 pages and the URL contains `?page=999`
- **THEN** the visible page is page 3 (the last page), not an empty page

#### Scenario: Non-positive or non-numeric page resolves to page 1

- **WHEN** the URL contains `?page=0`, `?page=-2`, or `?page=abc`
- **THEN** the visible page is page 1

#### Scenario: Empty filtered result shows clear-filters affordance

- **WHEN** the active filters exclude every item
- **THEN** the `.items-empty-filtered` state renders with the text "No items match your filters." and a Clear-filters control
- **AND WHEN** the user activates the control
- **THEN** the navigation removes `q`, `store`, `purchases`, `price_min`, `price_max`, and `page` from the URL

### Requirement: View, sort, and filter state SHALL be URL-derived; default values SHALL omit their parameter and filter changes SHALL reset the page

The items browser SHALL treat the URL search params as the single source of truth for view mode, sort key, and all filters, and SHALL write state changes via `router.replace` (not `push`) so filter churn does not accumulate browser history. The view mode SHALL be `list` only when `?view=list` is present and `grid` otherwise. The sort key SHALL default to `list_order` for `mode='list'` and `created_desc` otherwise; an absent or unrecognized `sort` value SHALL resolve to that default.

Selecting a value equal to the default SHALL remove the corresponding param rather than serialize it: choosing grid view SHALL remove `view`, choosing the default sort SHALL remove `sort`, choosing `purchases='hide'` SHALL remove `purchases`, and choosing `show='all'` SHALL remove `show`. Any change to a filter, the sort, the search query, or the page size SHALL remove the `page` param so the user lands on the first page of the new result set. The search query SHALL commit on a trailing debounce after the user stops typing, not on every keystroke.

#### Scenario: Grid view and default sort omit their params

- **WHEN** the user switches from list view to grid view, or selects the mode's default sort
- **THEN** the navigation removes the `view` (respectively `sort`) param rather than writing `view=grid` / `sort=<default>`

#### Scenario: Filter change resets the page

- **WHEN** the user is on `?page=4` and changes any filter, the sort, the search query, or the page size
- **THEN** the navigation removes the `page` param

#### Scenario: State writes use replace, not push

- **WHEN** the user changes a filter
- **THEN** the navigation is performed via `router.replace`, so the prior filter state is not pushed onto the browser history stack

#### Scenario: Invalid sort resolves to the mode default

- **WHEN** the URL contains `?sort=not_a_real_key` on an items-mode browser
- **THEN** the active sort is `created_desc` (the items-mode default)

#### Scenario: Search commits debounced

- **WHEN** the user types a multi-character query in a single burst
- **THEN** the query commits to the URL once after the user stops typing, not once per keystroke

### Requirement: Page size SHALL persist in the `items_page_size` cookie and SHALL normalize invalid values to the default

The items browser SHALL persist the selected page size to a cookie named `items_page_size` with `path=/`, `max-age=31536000` (one year), and `SameSite=Lax`. The valid page sizes SHALL be exactly `12`, `24`, `48`, and `96`; any other value — absent, non-numeric, or off-list — SHALL normalize to the default page size of `24`. The server-side entry that seeds the browser's initial page size SHALL read the same `items_page_size` cookie and apply the same normalization.

#### Scenario: Changing page size writes the cookie and resets the page

- **WHEN** the user selects a page size of 48
- **THEN** the `items_page_size` cookie is written with value `48`, `path=/`, `max-age=31536000`, `SameSite=Lax`, and the navigation removes the `page` param

#### Scenario: Off-list page size normalizes to the default

- **WHEN** a page size of `30` (not in `{12,24,48,96}`) is supplied via prop or cookie
- **THEN** the effective page size is `24`

#### Scenario: Server reader uses the same cookie name and normalization

- **WHEN** the server renders the items library with an `items_page_size` cookie of `96`
- **THEN** the browser's initial page size is `96`; with an absent or invalid cookie the initial page size is `24`

### Requirement: Pagination SHALL render a windowed page range with disabled bounds

The pagination control SHALL render its page buttons via a windowing rule: when `totalPages ≤ 7` it SHALL render a button for every page `1..totalPages` with no gaps; when `totalPages > 7` it SHALL render the first page, an ellipsis gap when the window start is greater than `2`, the window `page-1 … page+1` (clamped within `[2, totalPages-1]`), a trailing ellipsis gap when the window end is less than `totalPages-1`, and the last page. The current page button SHALL be marked `aria-current="page"` and styled as the primary variant while other page buttons are the ghost variant. The Previous control SHALL be disabled on page 1 and the Next control SHALL be disabled on the last page. Navigating to page 1 SHALL remove the `page` param; navigating to any other page SHALL set it.

#### Scenario: Seven or fewer pages render without gaps

- **WHEN** `totalPages` is 5
- **THEN** the control renders page buttons `1 2 3 4 5` with no ellipsis gap

#### Scenario: More than seven pages render a windowed range with gaps

- **WHEN** `totalPages` is 20 and the current page is 10
- **THEN** the control renders `1`, an ellipsis gap, `9 10 11`, an ellipsis gap, and `20`

#### Scenario: Bounds are disabled at the edges

- **WHEN** the current page is 1
- **THEN** the Previous control is disabled
- **AND WHEN** the current page is the last page
- **THEN** the Next control is disabled

#### Scenario: Navigating to page 1 removes the param

- **WHEN** the user navigates from page 2 to page 1
- **THEN** the navigation removes the `page` param; navigating to any page greater than 1 sets `page` to that number

#### Scenario: Current page is marked aria-current

- **WHEN** the control renders with the current page in range
- **THEN** the current page's button carries `aria-current="page"` and the primary variant, and the other page buttons carry the ghost variant
