## 1. Shared filter/sort helpers

- [x] 1.1 Extract `firstStoreName`, `firstStorePrice`, and `compareItems` from `app/(main)/items/ui/components/ItemsBrowser.tsx` into a new module `app/(main)/items/ui/components/itemFilters.ts` so both `ItemsBrowser` and `ChooseItemsForm` can import them.
- [x] 1.2 Update `ItemsBrowser` to import the helpers from the new module; verify no behavior change on `/items`.

## 2. Extend ItemsToolbar with `choose` mode

- [x] 2.1 Widen the `BrowserMode` type in `ItemsToolbar.tsx` to `'items' | 'list' | 'choose'` and add a matching `SORT_OPTIONS_CHOOSE` constant (same eight keys as `SORT_OPTIONS_ITEMS`: `created_desc`, `created_asc`, `name_asc`, `name_desc`, `store_asc`, `store_desc`, `price_asc`, `price_desc`).
- [x] 2.2 In `ItemsToolbar`, switch the active sort option list on `mode === 'choose'` to use `SORT_OPTIONS_CHOOSE`, and set the default sort to `'created_desc'` for choose mode.
- [x] 2.3 In `ItemsToolbar`, hide the `Purchases` select when `mode === 'choose'`.
- [x] 2.4 In `ItemsToolbar`, add a new `Show` select rendered only when `mode === 'choose'`, with options `all` / `on` / `off` labeled "Show: All", "Show: Only on the list", "Show: Only not on the list"; bind it to a URL param named `show` (default `all` → remove param).

## 3. Rewire ChooseItemsForm to consume the toolbar

- [x] 3.1 Update `app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx` to remove the local `query` state and the bespoke `<input className="choose-items-search" />` element. Keep the `selected: Set<string>` local state unchanged.
- [x] 3.2 In `ChooseItemsForm`, read `q`, `sort`, `show`, `store` (repeatable), `price_min`, `price_max` from `useSearchParams()`. Validate `sort` against the same eight-key list as `SORT_OPTIONS_CHOOSE`, defaulting to `created_desc`. Validate `show` against `'all' | 'on' | 'off'`, defaulting to `'all'`.
- [x] 3.3 In `ChooseItemsForm`, compute `storeOptions` from the union of `items[*].stores[*].name`, sorted A–Z, and a `hasAnyPrice` flag from `items` (mirror the logic in `ItemsBrowser`).
- [x] 3.4 In `ChooseItemsForm`, derive the rendered list inside a `useMemo` by applying, in order: (a) `show` filter keyed on `initialSelectedIds`, (b) `q` text filter on `name + description` (case-insensitive), (c) `store` filter, (d) `price_min`/`price_max` filter, (e) sort via `compareItems` from the shared module. Replace the existing `filtered` memo with this.
- [x] 3.5 Render `<ItemsToolbar mode="choose" storeOptions={storeOptions} showStoreSort={storeOptions.length > 0} showPriceSort={hasAnyPrice} showPriceFilter={hasAnyPrice} />` above the items list, replacing the old `choose-items-toolbar` row that held the search and Create button. Move the "Create new item" link into the toolbar row or keep it as a separate trailing action — match the items page layout.
- [x] 3.6 When the filtered+sorted result is empty AND any toolbar filter is active (q, show != 'all', stores selected, or price set), render a "No items match your filters" empty state with a "Clear filters" button (mirror `ItemsBrowser`). When the result is empty AND no filters are active, fall through to the existing `items.length === 0` empty state ("No items in your library yet").
- [x] 4.1 `app/(main)/lists/[id]/choose-items/page.tsx` — confirm no server-side changes are needed (toolbar state is read client-side from URL params). Leave the existing `getItemsByUser` call and archived-item filtering untouched.

## 4. Page-level wiring

- [x] 4.1 `app/(main)/lists/[id]/choose-items/page.tsx` — confirm no server-side changes are needed (toolbar state is read client-side from URL params). Leave the existing `getItemsByUser` call and archived-item filtering untouched.

## 5. Styles

- [x] 5.1 Audit the existing `choose-items-toolbar` CSS in `app/(main)/items/ui/styles/item.css` (or wherever it lives) and update or remove rules that no longer apply once the bespoke search input is gone.
- [x] 5.2 Ensure the shared `items-toolbar` styles render acceptably on the choose-items page width; tweak only if visibly broken (do not duplicate styles).

## 6. Verification

- [x] 6.1 Open `/lists/[id]/choose-items` for a list with mixed on-list and off-list items. Confirm: toolbar renders, all five controls are present (search, sort, show, stores, price), no Purchases select is shown.
- [x] 6.2 Verify each control writes the expected URL param and the visible list updates: search → `?q=`, sort → `?sort=`, show → `?show=on|off`, stores → `?store=` (repeatable), price → `?price_min=` / `?price_max=`.
- [x] 6.3 With `Show: Only on the list`, confirm only saved-on-list items are visible. With `Show: Only not on the list`, confirm only non-members are visible. Toggling a checkbox SHOULD NOT move the row in or out of view (filter keys on saved state, not pending).
- [x] 6.4 Apply a filter, navigate to another page, hit back — confirm the toolbar state is restored from the URL.
- [x] 6.5 With no URL params, confirm the page renders identically to today (sort by newest, all items shown, search empty).
- [x] 6.6 Confirm `/items` and `/lists/[id]` continue to behave identically (regression check on the shared `ItemsToolbar` and `ItemsBrowser`).
- [x] 6.7 Run `npm run build` (or the project's typecheck/lint pipeline) and confirm no new errors.
