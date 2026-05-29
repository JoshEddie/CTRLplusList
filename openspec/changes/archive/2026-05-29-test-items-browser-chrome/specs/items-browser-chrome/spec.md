## ADDED Requirements

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
