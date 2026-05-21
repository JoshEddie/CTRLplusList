## ADDED Requirements

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
