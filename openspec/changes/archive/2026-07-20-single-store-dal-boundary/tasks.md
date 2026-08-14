# Tasks — single-store-dal-boundary

## 1. Selection helper + read shape

- [x] 1.1 Add `primaryStore(rows)` to `lib/storeValidity.ts` (lowest-priced complete per `storeComplete`, else first row, else null), moving the `$`-tolerant price-amount parsing there with it; unit tests for the three branches and the incomplete-only fallback
- [x] 1.2 Flatten read types in `lib/types.ts`: `ItemDisplay.stores` → `store?: ItemStoreTable | null`, `ItemDetails.stores` → `store: ItemStoreTable | null`
- [x] 1.3 Apply `primaryStore` in the read mappers — `getItemsByUser`, `getItemById`, `getItemsByListId` (`lib/data/item.ts`) and the purchase read (`lib/data/purchase.ts`) — so every item read returns the scalar `store` and no `stores` array leaves the DAL

## 2. Write path scalar

- [x] 2.1 `lib/data/item.schema.ts`: replace the `stores` array + refine with a single optional/nullable `store` object carrying the same per-field completeness refine and messages
- [x] 2.2 `lib/data/item.actions.ts`: `validateSingleStore(stores[])` → `validateStore(store)` (same failure messages, same `storeComplete` requirement); wrap `[store]` only at the `updateItemStores` calls; `updateItemStores` and `item.associations.ts` untouched
- [x] 2.3 Update `lib/data/__tests__` (schema + actions) to the scalar payload shape; keep the incomplete-store rejection and legacy-collapse assertions

## 3. Display surfaces

- [x] 3.1 Retire `lowestPricedStore`/`sortedValidStores` from `app/(main)/items/ui/components/utils.ts`; consumers gate on `storeComplete(item.store)` instead
- [x] 3.2 Update `PriceLine`, `Item` (link check), `ItemCard` → `ItemActions`, `PurchaseModalSlot`, `purchasemodal/` (`PurchaseModalHeader`, `ModalStoreRow`, `PurchaseFlowContainer`) to consume the scalar `store` with the complete-gate — rendered outcomes unchanged
- [x] 3.3 Update component tests to the scalar shape, covering the incomplete-scalar case (no price line, no `View item ↗`)

## 4. Filters and sort

- [x] 4.1 `itemFilters.ts`, `SortItems.tsx`, `ItemsBrowser.tsx`: match/sort/collect options from `item.store?.name`; `displayPrice` from the complete-gated store
- [x] 4.2 `app/(main)/lists/[id]/choose-items/utils.ts`: same singular treatment
- [x] 4.3 Tests: dormant-row exclusion (a legacy second store neither matches nor appears as an option), non-finite `displayPrice` exclusion under an active price filter

## 5. Deck goes scalar

- [x] 5.1 `viewModel.ts`: `ItemViewModel.stores: DeckStore[]` → `store: DeckStore`; `setStore(index, field, value)` → `setStore(field, value)`; `seedFromItem` consumes `item.store` directly (empty store when null), deleting the `lowestPricedStore ?? stores[0]` fallback and its comment
- [x] 5.2 Rewrite all `stores[0]` / `setStore(0, …)` sites across the deck subtree (cards, `FocusEditor`, Store editor, Triage, Preview, adapter); adapter emits the scalar `store`
- [x] 5.3 Update deck tests to the scalar view model; verify no `stores[0]` or index-parameter access remains anywhere in `app/`/`lib/` (grep)

## 6. Gates

- [x] 6.1 `npm run lint` · `npx tsc --noEmit` · `npm run build` · `npm run test:coverage` · `npm run test:e2e` all green; `openspec validate --strict` clean
