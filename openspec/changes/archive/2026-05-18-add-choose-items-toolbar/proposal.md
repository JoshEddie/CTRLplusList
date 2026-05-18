## Why

The `/lists/[id]/choose-items` page is the primary surface for adding and removing items on a list, but it currently exposes only a single text-search input. Owners with sizeable libraries cannot narrow by store, price, or list status, and the only ordering is the server's default (created descending). This makes the page slow to use precisely as libraries grow — the exact moment the page becomes most necessary.

The `/items` page already solves the same problem with a rich `ItemsToolbar` (search, sort, store filter, price filter). Choose-items should reach feature parity, plus add one capability unique to its context: filter by whether an item is already on the list.

## What Changes

- Add a toolbar to the choose-items page with these controls, all reflected in URL params:
  - **Search** — lift the existing local-state `q` input into a URL param so it survives navigation and matches `ItemsToolbar` behavior.
  - **Sort** — single-axis dropdown with the same eight keys as the items page (Newest/Oldest, Name A–Z/Z–A, Store A–Z/Z–A, Price low/high). Default: Newest.
  - **Show** *(new on this page)* — `All` / `Only on the list` / `Only not on the list`. Default: `All`. URL param: `show`.
  - **Stores** — reuse `StoreFilterPopover` against the user's library store options.
  - **Price** — reuse `PriceFilterPopover` with min/max URL params.
- Extend `ItemsToolbar` with a new `mode: 'choose'` variant so both pages share one implementation. The `choose` mode shows the new `Show` select, hides the `Purchases` select (not applicable here), and uses `created_desc` as the default sort.
- Replace the bespoke `<input className="choose-items-search" />` in `ChooseItemsForm` with the shared toolbar, and re-derive the rendered list from URL params (search/sort/show/stores/price) on top of the already-fetched `items` array and `initialSelectedIds` set. Filtering and sorting are client-side; no DAL changes.

Two-axis (primary + secondary) sort is **out of scope** and will be proposed separately.

## Capabilities

### New Capabilities

(None — this change extends an existing capability.)

### Modified Capabilities

- `list-item-management`: Adds a new requirement that the choose-items page renders a filter/sort toolbar (search, sort, show, stores, price) and that all toolbar state is reflected in URL params; updates the existing "page SHALL show the owner's library" requirement to acknowledge that the rendered subset and ordering are now derived from URL params.

## Impact

- **Code**
  - `app/(main)/items/ui/components/ItemsToolbar.tsx` — add `'choose'` to `mode` union, add `Show` select for choose mode, hide `Purchases` select in choose mode.
  - `app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx` — remove local `query` state and the bespoke search input; consume URL params and apply client-side filter + sort over the `items` prop.
  - `app/(main)/lists/[id]/choose-items/page.tsx` — pass distinct store options (derived from the user's library) into the form for the new toolbar; no DAL change.
  - CSS — reuse existing toolbar styles from the items page; minor adjustments to the choose-items page container if spacing requires.
- **No DB or DAL changes.**
- **No server actions touched.**
- **No breaking changes** to existing routes, props, or URLs. New URL params (`q`, `sort`, `show`, `store`, `price_min`, `price_max`) are additive; absence preserves today's behavior (all items, created-desc).
