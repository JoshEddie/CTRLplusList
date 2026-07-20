# Tasks: non-link-item-states

## 1. Validity predicates

- [x] 1.1 Add `storeValid` (FULL ∪ PRICED; PRICED = `link === ''` ∧ `name.trim() === ''` ∧ price tier `good`) alongside `storeComplete` in `lib/storeValidity.ts`; widen `primaryStore`'s filter to `storeValid` (sort and repair fallback unchanged)
- [x] 1.2 Unit tests: PRICED valid/not-complete, legacy invalid-link row excluded, name-without-link invalid, `primaryStore` selects PRICED-only rows and keeps repair fallback

## 2. Server actions

- [x] 2.1 Rework `validateStore` in `lib/data/item.actions.ts` to the tri-state contract: BARE (absent/all-empty) → `updateItemStores([], id)`; PRICED → one `{ name: '', link: '', price }` row with null provenance; FULL unchanged; field-level rejections for name-without-link, link-without-name, link-without-good-price
- [x] 2.2 Verify `updateItemStores([], id)` deletes existing rows (positional sync to zero) and `createItem` skips the insert for BARE
- [x] 2.3 Unit tests: BARE create/update persist zero rows, PRICED persists the linkless row, each rejection shape, FULL unchanged

## 3. Deck and preview tiers

- [x] 3.1 `storeTier` symmetric coupling in `deck/utils.ts`: both empty → `good` (empty note); name-without-link → `error` ("A store name needs a link"); existing nameless/invalid-link errors unchanged
- [x] 3.2 Link-aware price gating at the consumers (per design D2): `isStepComplete`/`stepBlocked`/row tiers/Preview save gate treat empty price as `good` with the neutral note ("No price — saves without one") only when name and link are both empty; malformed non-empty price stays `error`
- [x] 3.3 Unit tests: tier matrix (empty-empty good, name-only error, linkless empty price good with note, linkless malformed price error, linked empty price blocks), Preview save gate allows store-less save

## 4. Display

- [x] 4.1 `ItemActions`: `showView = !!store?.link`; `ItemCard` passes `storeValid(item.store) ? item.store : null`
- [x] 4.2 `PriceLine`: gate on `storeValid`; render `· {name}` only when the name is non-empty (PRICED → bare `$X.XX`)
- [x] 4.3 Confirm the purchase-modal store row stays gated on `storeComplete` (no change expected; assert in its test if uncovered)
- [x] 4.4 Component tests: PRICED card shows bare price and no View/Buy; BARE card shows no price line and the Add Claim row; FULL unchanged

## 5. Seed coverage

- [x] 5.1 Add one PRICED and one BARE hand-authored item to `scripts/seed-dev-users.ts` (idempotent upserts, consistent with existing hand-authored blocks)

## 6. Verification

- [x] 6.1 Edit a seeded BARE item end to end in local mode (dev server restarted after reseed): edit opens, save succeeds, card renders the store-less action set
- [x] 6.2 `openspec validate non-link-item-states --strict` passes

## 7. Pre-merge

- [x] 7.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 7.2 `npx tsc --noEmit` — zero errors
- [x] 7.3 `npm run build` — completes successfully
- [x] 7.4 `npm run test:coverage` — zero failing tests
- [x] 7.5 `npm run test:e2e` — zero failing tests
