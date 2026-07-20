# Single store at the DAL boundary

## Why

Issue #257 (MAP #233): #234 capped stores input-side, but the read path still hands the UI `stores: ItemStoreTable[]`, so primary-store selection runs independently at six UI sites via `lowestPricedStore` — with a live drift at the deck's `?? stores[0]` fallback (a legacy item with only incomplete stores shows no `View item ↗` yet seeds a store into the edit deck). The deck carries dozens of `stores[0]` accesses and a dead index parameter on `setStore` over an invariantly length-1 array. The map's settled decision: the second store is gone, not dormant in the fetched shape — selection lives once at the data edge.

Inherited constraints from active specs: `item-store-links` owns the validity predicate (`storeComplete`), primary-store selection ("lowest-priced complete store"), the single-store cap, and the edit-seed repair rule (primary, else first row); `item-actions` defines `View item ↗`/`Buy & Claim ↗` gating on the primary store's link; `items-browser-chrome` and `list-item-management` define store-name filtering over "its stores' names"; `item-decision-deck` defines the view-model seed and the submit adapter; `server-endpoint-authorization` pins `updateItemStores` semantics (helper unchanged — array stays internal); `data-layer-organization` keeps association helpers out of `*.actions.ts` (unchanged).

## What Changes

- **DAL read shape** — **BREAKING (internal type)**: `ItemTable.stores?: ItemStoreTable[]` → `store?: ItemStoreTable | null` across all item-fetching reads (`lib/data/item.ts`, `lib/data/purchase.ts`). Selection is a pure mapper applied to fetched rows at the data edge (safe under `'use cache'`): lowest-priced complete store (per `storeComplete`), else first row (repair path), else null.
- **Write path scalar end-to-end**: the deck submits a single nullable `store` object; the zod schema and `createItem`/`updateItem` accept the scalar. The one-element array appears only inside the action when calling the unchanged `updateItemStores` association helper, so positional sync still collapses legacy extras on first edit-save.
- **UI de-arrayed**: deck view model flattens to scalar `store`; `setStore(field, value)` drops the index; all `stores[0]` accesses retire; UI-side `lowestPricedStore`/`sortedValidStores` retire (selection now upstream). Display surfaces keep today's rendered outcomes by gating on `storeComplete` where the scalar may carry an incomplete row.
- **Filters/sort read the scalar**: store-name filtering and store-name sort (`ItemsBrowser`, choose-items picker, `itemFilters`, `SortItems`) match against the single store's name. Dormant legacy rows drop out of filter options and matching — consistent with the map's "second store is gone".
- **No schema change**; dormant extra `item_stores` rows untouched (cleanup out of scope per the map). #256 (PRICED/BARE states) separately owns display/validation semantics for incomplete rows; interim divergence between the two chunks is accepted (same release).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `item-store-links`: primary-store selection moves from per-surface UI helpers to the single DAL mapper; validity-filtering scenarios reworded from "stores array" to the fetched-rows/mapper frame; create/update contract becomes a scalar `store` input.
- `item-actions`: "primary store" re-defined as the DAL-provided scalar `store` (selection no longer computed in-component); action gating unchanged.
- `item-decision-deck`: view-model seeds a scalar `store` (DAL-selected, repair fallback now upstream); submit adapter emits one store object; `setStore` loses its index.
- `items-browser-chrome`: store filter and price semantics defined over the item's single `store` (name match, `displayPrice`), not "any of its stores".
- `list-item-management`: choose-items store filter matches the item's single store's name.

### Removed Capabilities

None.

## Impact

- `lib/types.ts` (`ItemTable`/`ItemData` store field), `lib/data/item.ts`, `lib/data/purchase.ts` (read mappers), `lib/data/item.schema.ts`, `lib/data/item.actions.ts` (scalar input), `lib/data/item.associations.ts` unchanged.
- `app/(main)/items/ui/components/` — `utils.ts` (retire `lowestPricedStore`/`sortedValidStores`), `PriceLine`, `Item`, `ItemCard`, `PurchaseModalSlot`, `purchasemodal/*`, `itemFilters.ts`, `SortItems.tsx`, `ItemsBrowser.tsx`, the full `itemform/deck/` subtree; `app/(main)/lists/[id]/choose-items/utils.ts`.
- Cache: read tags unchanged (`items` etc.); mapper is pure over fetched rows — no new tags, no new revalidation paths.
- Tests across `lib/data/__tests__` and deck/component tests update to the scalar shape.
