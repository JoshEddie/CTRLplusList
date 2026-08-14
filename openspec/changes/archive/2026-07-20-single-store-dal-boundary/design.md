# Design — single-store-dal-boundary

## Context

`#234` capped stores input-side; the fetched shape is still `stores: ItemStoreTable[]`. Six UI sites call `lowestPricedStore` independently, and the deck view model carries a divergent `?? stores[0]` fallback plus positional `stores[0]`/`setStore(0, …)` plumbing over an invariantly length-1 array. Reads are `'use cache'` (`lib/data/item.ts`, `lib/data/purchase.ts`), so any selection applied there must be a pure mapping over fetched rows. The association helper `updateItemStores` (array-based positional sync that deletes extras) is pinned by `server-endpoint-authorization` and `data-layer-organization` and stays as-is.

Owner decisions (grilling, 2026-07-18): selection rule = lowest-priced complete store, else first row, else null; an incomplete row is an accurate state (see #256) and travels in the scalar; #257 preserves today's rendered outcomes (display gates on `storeComplete`), #256 owns PRICED/BARE display and validation changes; write path is scalar end-to-end; interim breakage between the two chunks is acceptable (same release).

## Goals / Non-Goals

**Goals:**

- One selection rule, applied once at the data edge; UI never receives a store array.
- Scalar `store` end-to-end on the write path; the array survives only inside `item.actions.ts` at the `updateItemStores` call.
- Retire `lowestPricedStore`/`sortedValidStores` from UI utils and every `stores[0]`/index-parameter access in the deck.
- Rendered outcomes unchanged: an item whose only rows are incomplete still shows no price line, no `View item ↗`, no `Buy & Claim ↗` — while its first row still seeds the edit deck for repair.

**Non-Goals:**

- No schema change; no cleanup of dormant `item_stores` rows.
- No PRICED/BARE display or validation semantics — #256 owns those.
- No change to `updateItemStores` / positional-sync internals or their authorization contract.

## Decisions

### D1 — Selection lives in `lib/storeValidity.ts` as `primaryStore(rows)`

`primaryStore(rows: ItemStoreTable[] | null | undefined): ItemStoreTable | null` — lowest-priced `storeComplete` row, else `rows[0]`, else `null` — joins `storeComplete`/`priceTier` in [lib/storeValidity.ts](lib/storeValidity.ts), the established single home of the store-validity contract (price parsing moves with it). The DAL read mappers (`getItemsByUser`, `getItemById`, `getItemsByListId`, the purchase read) call it when flattening fetched rows. Alternative rejected: defining it inside `lib/data/item.ts` — the purchase read needs it too, and validity-adjacent selection drifting apart from the validity predicate is exactly the failure mode #234 retired.

### D2 — Read types flatten to `store?: ItemStoreTable | null`

`ItemDisplay.stores` → `store`; `ItemDetails.stores: ItemStoreTable[]` → `store: ItemStoreTable | null` in [lib/types.ts](lib/types.ts). No parallel raw-rows field anywhere — the repair fallback is inside the selection rule, so the deck's seed needs nothing extra. Alternative rejected (grilling): complete-or-null (silently discards legacy partial data on edit-save) and a two-field shape (dilutes the single-scalar goal).

### D3 — Display surfaces gate on `storeComplete`, once per surface entry

Because the scalar can carry an incomplete row (repair fallback), the sites that render store-derived UI (`PriceLine`, `Item`'s link check, `ItemCard` → `ItemActions`, `PurchaseModalHeader`, `ModalStoreRow`) treat `storeComplete(item.store) ? item.store : null` as their display store. This reproduces today's `lowestPricedStore` outcomes exactly. The gate is the existing shared predicate — no new per-surface validity logic, and #256 later adjusts these same gates to per-field rendering. Alternative rejected: gating inside the DAL (complete-or-null) — kills the repair seed (D2).

### D4 — Write path: scalar `store` in schema and actions; array only at the sync call

`ItemSchema.stores` (array + refine) becomes a single optional/nullable `store` object with the same per-field completeness refine; `validateSingleStore(stores[])` becomes `validateStore(store)` keeping the identical failure messages and `storeComplete` requirement (a complete store is still required to save — #256 relaxes that, not this change). The action wraps the validated store as `[store]` solely at the `updateItemStores` call so positional sync still deletes legacy extras on first edit-save. The helper, its signature, and `server-endpoint-authorization`'s scenario stay untouched.

### D5 — Filters and sort read the single store

`itemFilters.ts`, `SortItems.tsx` (store-name sort key), `ItemsBrowser.tsx` (store filter + option collection), and `choose-items/utils.ts` match against `item.store?.name` and derive `displayPrice` from the complete-gated store. Consequence accepted by the map: dormant legacy rows no longer contribute filter options or matches — the second store is gone, not dormant in the fetched shape. Store-filter *option lists* now build from each item's single store name.

### D6 — Deck view model goes scalar

`ItemViewModel.stores: DeckStore[]` → `store: DeckStore` (the deck always edits exactly one store; `emptyStore()` when the item has none); `setStore(index, field, value)` → `setStore(field, value)`; `seedFromItem` consumes `item.store` directly — the `lowestPricedStore(...) ?? stores[0]` fallback and its comment retire, since the DAL rule subsumes them. The submit adapter emits the scalar `store` (D4). All `stores[0]` plumbing in cards, editors, triage, and tests rewrites mechanically.

## Risks / Trade-offs

- [Behavior delta in filters: dormant second stores stop matching/offering options] → Accepted map intent; called out in the `items-browser-chrome`/`list-item-management` deltas so it is a specified change, not drift.
- [Scalar carrying an incomplete row could leak into display if a future surface forgets the gate] → Gate is the one shared `storeComplete` predicate; #256 immediately follows and reframes incomplete rows as first-class states, shrinking the window to one release.
- [Wide mechanical churn (deck subtree, tests)] → Type change makes misses compile errors — `tsc --noEmit` is the safety net; no runtime flag or dual shape to maintain.
- [Interim dev breakage vs #256] → Explicitly accepted by owner; both chunks ship in the same release.

## Open Questions

None — all decision points settled in the grilling (recorded in Context).
