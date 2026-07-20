# items-browser-chrome delta

## MODIFIED Requirements

### Requirement: ItemsBrowser SHALL apply active filters, then sort, then paginate, in that order

`ItemsBrowser` SHALL derive the visible item set by applying the active filters, then sorting the filtered result by the active sort key, then slicing to the requested page window — in that fixed order. Filtering, sorting, and store-option collection SHALL read the item's single DAL-provided `store` (per `item-store-links`); dormant legacy rows are absent from the fetched shape and SHALL NOT contribute filter options or matches. The filters SHALL compose conjunctively (an item is included only if it passes every active filter):

- **Search** (`q`): an item passes when the lowercased concatenation of its `name` and `description` contains the lowercased, trimmed query as a substring. An empty query applies no search filter.
- **Store** (`store`, repeatable): when one or more stores are selected, an item passes when its store's name is in the selected set (OR across the selected names, AND with the other filter types).
- **Purchases** (`purchases`): `only` includes only items with `hasPurchases`; `none` includes only items without `hasPurchases`; any other value applies no purchases filter.
- **Price range** (`price_min` / `price_max`): when either bound is a finite number, an item passes when its `displayPrice` — derived from its complete store, non-finite when the store is absent or incomplete — is finite AND within the inclusive `[min, max]` range (an absent bound is treated as `-Infinity` / `+Infinity`). Items whose `displayPrice` is non-finite SHALL be excluded whenever a price filter is active.

After filtering, the result SHALL be sorted by the active sort key via `compareItems`, except that the `list_order` key SHALL preserve the input order (no sort). The sorted result SHALL then be sliced to `[(page-1) * pageSize, page * pageSize)` to produce the visible page.

#### Scenario: Search matches name and description case-insensitively

- **WHEN** the query is `gift` and the item set contains one item whose name includes "Gift" and one whose description includes "gift" and one matching neither
- **THEN** both matching items are included and the non-matching item is excluded, regardless of letter case

#### Scenario: Store filter is OR-within, AND-across

- **WHEN** stores `Amazon` and `Etsy` are selected and a purchases filter `only` is also active
- **THEN** an item is visible only if its store is named `Amazon` or `Etsy` AND it `hasPurchases`

#### Scenario: Dormant legacy rows do not filter

- **WHEN** a legacy item's dormant second row is named `Etsy` while its DAL-selected store is `Amazon`, and the store filter selects only `Etsy`
- **THEN** the item is excluded and `Etsy` from that item SHALL NOT appear among the store filter's options

#### Scenario: Price filter excludes non-finite prices

- **WHEN** a `price_min`/`price_max` range is active and an item's store is absent or incomplete (so its `displayPrice` is non-finite)
- **THEN** that item is excluded from the result even though it has no comparable price

#### Scenario: Pipeline order is filter then sort then paginate

- **WHEN** filters reduce 100 items to 30, the sort key is `price_asc`, the page size is 24, and the requested page is 2
- **THEN** the 30 filtered items are sorted ascending by price and the visible page is the slice `[24, 48)` of that sorted result (6 items)

#### Scenario: list_order preserves input order

- **WHEN** the active sort key is `list_order`
- **THEN** the filtered items render in their input order with no reordering applied
