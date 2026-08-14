# Item Actions + Single-Store Cap

## Why

A non-owner's only card action funnels through one modal button, and once an item is fully claimed the store link is trapped behind the disabled "Fully claimed" pill. Action branching is split across `ItemCard` / `Purchase`, and two divergent "valid store" definitions (`isValidStore`'s loose `Number()` check vs the deck's `priceTier`/`PRICE_PATTERN`) can disagree about the same store. With the single-store cap settled (issue #234, MAP #233), "store" also stops being a multi-row unit — its name, link, and price are just item values, but the form still edits them as an all-or-nothing composite.

## What Changes

- New `ItemActions` component owns the per-item action area per #169's state matrix: primary slot + 2-up secondary row, the `↗` external-link affordance, the `Fully claimed` status (`role="status"`), the owner spoiler-reveal host, and a view-only mode for non-interactive preview surfaces. Interim top slot for the claimable state is `Add Claim` (chunk 2's `Buy & Claim ↗` displaces it later).
- `View item ↗` is always present for every viewer in every claim state (primary = lowest-priced valid store, new tab) — reverses the trapped-store-link defect and the "modal store row is the sole non-owner navigation" constraint.
- `StoreLinks` (and every `+N` store menu, card and modal) is retired. The card price line simplifies to `$19.99 · Store Name` (single store).
- Single-store cap, input-side only (no schema change): the deck edits store name + link as one grouped two-field editor row and price as its own row — five rows everywhere (Photo, Item name, Note, Price, Store). `StoresSheet`, "Add another store", and the all-or-nothing composite rule retire. The deck gains a standing `store` step, premarked complete when the fetch delivered a good name (+ the pasted link).
- A store link is **required** (owner decision on #234): store validity consolidates to a single predicate — non-empty name, `isValidProductUrl` link, `priceTier(price).tier === 'good'` — with per-row `error` tiers blocking advance and save. `isValidStore` is retired. Server create/update validates the same predicate and rejects more than one store.
- The URL entry card's "Fill in details manually →" affordance is removed — manual entry is failure-screen-only, always link-seeded. First-class non-link items (cash / homemade / experiences) are tracked by #256 (OFF THE MAP).
- Existing multi-store items render their primary (lowest-priced valid) store; edit-save collapses them to that single store (positional sync already deletes rows beyond the submitted array — no new plumbing, no migration).

## Capabilities

### New Capabilities

- `item-actions`: the per-item action area — the state matrix deciding which actions render for a given (viewer, claim state, spoiler state), the primary + 2-up-secondary layout, the `↗` affordance, the `Fully claimed` status, the owner spoiler-reveal host, and the view-only mode consumed by preview surfaces.

### Modified Capabilities

- `item-store-links`: store validity becomes the single link-required predicate; `View item ↗` replaces the chip row / metadata-line split and the modal store row's "sole direct navigation" role; all `+N` menus retire; price line becomes `$X.XX · Store`; row/grid anatomy requirements re-anchor on `ItemActions`; single-store cap on create/update.
- `item-decision-deck`: store decomposes into Price row + grouped Store (name+link) row; `StoresSheet` retires; standing `store` step; store/link tiers become `error` when incomplete; Preview's "Store links" entry becomes "Store" opening the grouped editor; the failure screen's manual affordance stands alone (its "mirrors URL entry exactly" coupling breaks).
- `product-link-prefill`: the URL entry state drops the manual-entry affordance and its "Manual link bypasses fetching" scenario; the draft-guard prompt's trigger reduces to the failure-screen affordance.
- `claim-attribution`: card-side claim affordance labels re-anchor on `ItemActions` (`Manage claim` / `Manage claims` copy per #169); modal contract unchanged.
- `e2e-critical-flows`: "no direct store-link affordance exists on the card" reverses — flows assert `View item ↗` presence and the new action layout.
- `list-item-management`: choose-items preview rows inherit `ItemActions` view-only (`View item ↗`) instead of live buy-link chips from the retired shared chip row.

## Impact

- **Components:** `app/(main)/items/ui/components/` — `Item`, `ItemCard`, `Purchase` (absorbed into `ItemActions`), `StoreLinks` (deleted), `StoreMetadataLine` (simplified), `PurchaseModalSlot`, `purchasemodal/ModalStoreRow` (+N removal), `utils.ts` (`isValidStore` retired; `lowestPricedStore`/`sortedValidStores` re-predicated).
- **Deck:** `itemform/deck/` — `FieldRows`, `sheets/StoresSheet` (deleted), new grouped store editor under `editors/`, `neededSteps` (store step), `utils.ts` (tiers), `viewModel`, `useItemActions` (add/remove-store actions retire), `summaries`, `Preview`, `FetchFailure`.
- **Server:** `lib/data/item.actions.ts` — single-complete-store validation on create/update; `item.associations.ts` untouched (positional sync already collapses).
- **Tests/e2e:** unit suites across the touched components; e2e flows asserting card actions and store navigation.
- **No schema or migration change; no new cache tags** — reads stay on `cacheTag('items')`, mutations already `updateTag('items')`.
