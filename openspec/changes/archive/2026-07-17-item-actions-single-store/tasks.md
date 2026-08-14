# Tasks — item-actions-single-store

## 1. Shared validity predicate

- [x] 1.1 Create the shared store-completeness helper (name + `isValidProductUrl` link + `priceTier` good) in a pure module importable by both client components and `lib/data` (relocating/exporting `priceTier`/`PRICE_PATTERN` as needed without breaking deck imports)
- [x] 1.2 Re-predicate `sortedValidStores` / `lowestPricedStore` on the shared helper; delete `isValidStore` and update its tests to the new predicate (including a case the old `Number()` check accepted, e.g. `1e5`)

## 2. ItemActions component

- [x] 2.1 Build `ItemActions` (state matrix, primary + 2-up layout, `↗` affordance with `aria-hidden` icon and new-tab accessible name, `Fully claimed` `role="status"`, view-only mode, click non-propagation), absorbing `Purchase.tsx`'s branches; delete `Purchase.tsx`
- [x] 2.2 Wire `ItemCard` (grid) and the row surfaces through `ItemActions`; render the simplified price line (`$X.XX · Store`, uniform across claim states); simplify `StoreMetadataLine` accordingly
- [x] 2.3 Delete `StoreLinks.tsx`; update `Item.tsx` and every consumer (items library, sortable, choose-items preview) to the `ItemActions` trailing region; remove the `+N` menu from `ModalStoreRow`
- [x] 2.4 Update CSS (`store-links.css`, `purchase.css`, row/grid templates at ≥600px and <600px) for the new action block; keep kebab and spoiler-pill placement rules; verify 200% zoom / text-spacing survival
- [x] 2.5 Unit tests for the full matrix (all eight states + view-only + no-store), non-propagation, and status semantics

## 3. Deck: flat store fields

- [x] 3.1 Rework `storeTier` (name+link pair, error-only tiers), update `rowTiers`, `summarize`, and `isDirtyDraft` as needed; new grouped Store editor under `editors/`; delete `sheets/StoresSheet.tsx`; drop `addStore`/`removeStore` from `useItemActions`
- [x] 3.2 Add the `store` deck step (card, `neededSteps` order photo→title→price→store→note, `stepBlocked`, tracker premark); update `FieldRows` store row to open the grouped editor
- [x] 3.3 Preview: "Store links" entry → "Store" opening the grouped editor; extend the Create/Save gate to block on store/price error tiers; edit path seeds from the primary store with `stores[0]` fallback
- [x] 3.4 Remove the URL entry state's "Fill in details manually →" affordance and its draft-guard trigger (failure-screen affordance and prompt remain); update `FetchFailure` copy path if it referenced the shared-string mirror
- [x] 3.5 Update deck unit tests (tiers, steps, advance rule, editor, entry state, failure screen)

## 4. Server validation

- [x] 4.1 `createItem`/`updateItem` reject >1 store or an incomplete single store via the shared predicate; keep `ActionResponse` failure shape; unit tests for both rejections and the legacy-collapse pass-through

## 5. E2E

- [x] 5.1 Update flows for `Add Claim` / `View item ↗` / `Fully claimed` status (flow 7 + the card/modal store scenarios); adjust selectors and add the every-state `View item ↗` assertion

## 6. Pre-merge

- [x] 6.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 6.2 `npx tsc --noEmit` — zero errors
- [x] 6.3 `npm run build` — completes successfully
- [x] 6.4 `npm run test:coverage` — zero failing tests, with coverage reporting
- [x] 6.5 `npm run test:e2e` — zero failing tests
