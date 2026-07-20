# item-store-links delta

## ADDED Requirements

### Requirement: Primary-store selection SHALL happen once at the DAL read boundary

Every item read SHALL flatten the fetched `item_stores` rows to a single scalar `store: ItemStoreTable | null` via one shared pure selection helper co-located with the validity predicate: the lowest-priced complete store (per the shared validity predicate), else the first fetched row (so legacy incomplete rows stay reachable for repair), else `null`. The selection SHALL be a pure mapping over already-fetched rows (compatible with `'use cache'` reads — no request-scope inputs). No UI surface SHALL receive a store array or re-run primary-store selection; the retired UI-side selection helpers (`lowestPricedStore`, `sortedValidStores`) SHALL NOT be reintroduced. Because the scalar may carry an incomplete row, display surfaces SHALL gate store-derived rendering (price line, store link targets, store-gated actions) on the shared validity predicate, preserving the rendered outcomes of complete-only selection.

#### Scenario: Reads return the cheapest complete store as the scalar

- **WHEN** an item's fetched rows contain two complete stores at $30 and $12 and one incomplete row
- **THEN** every item read SHALL return the $12 store as `store`, and no consumer SHALL see the other rows

#### Scenario: Only incomplete rows — first row travels for repair, displays render nothing

- **WHEN** an item's fetched rows contain only incomplete stores
- **THEN** `store` SHALL be the first fetched row, the edit path SHALL seed from it, and no price line, `View item ↗`, or other store-gated display SHALL render

#### Scenario: No rows — null store

- **WHEN** an item has no `item_stores` rows
- **THEN** `store` SHALL be `null` and every store-gated surface SHALL render its store-less state

## MODIFIED Requirements

### Requirement: A store SHALL be considered valid only when it has a name, a link, and a numeric price

A store SHALL be complete (valid) only when it has a non-empty `name`, a `link` accepted by `isValidProductUrl`, and a `price` whose tier is `good` per the deck's `priceTier`/`PRICE_PATTERN` (optional `$`, integer or up to two decimals). This predicate SHALL live in one shared pure helper consumed by every surface — the DAL boundary's primary-store selection, display gating, the deck's tier rows, and the server actions' create/update validation — replacing the retired `isValidStore` (whose looser `Number(price)` check could disagree with the deck). Rows failing the predicate SHALL be excluded from primary-store selection (beyond the first-row repair fallback), the price line, and the `View item ↗` target.

#### Scenario: Row missing a name is excluded

- **WHEN** an item's fetched rows contain an entry with a falsy `name` (and another entry is complete)
- **THEN** that entry SHALL NOT be selected as the scalar `store` and SHALL NOT appear in any price or store display

#### Scenario: Row with an invalid link is excluded

- **WHEN** an item's fetched rows contain an entry whose `link` fails `isValidProductUrl`
- **THEN** that entry SHALL be excluded from primary-store selection and display

#### Scenario: Row with a non-good price tier is excluded

- **WHEN** an item's fetched rows contain an entry whose `price` fails `PRICE_PATTERN` (e.g. `1e5` or empty)
- **THEN** that entry SHALL be excluded — including values the retired `Number()` check would have accepted

#### Scenario: One predicate everywhere

- **WHEN** the DAL selection helper, a display surface's gate, the deck's store/price rows, and the server action validate the same store value
- **THEN** all SHALL consume the same shared predicate helper and agree on its completeness

### Requirement: Items SHALL be capped at a single store on create and update

The create and update paths SHALL accept a single scalar store: `createItem`/`updateItem` SHALL take one nullable `store` object — no array SHALL appear in the submitted payload, the zod contract, or the action signature — and SHALL reject a submission whose store fails the validity predicate, mirroring the client-side gate so the actions cannot persist what the UI forbids. The one-element array SHALL exist only internally where the action invokes the positional store-sync association helper (unchanged), so syncing still removes rows beyond the first, collapsing a legacy multi-store item to its single store on first edit-save. The `item_stores` schema is unchanged — the cap is input-side only. Existing multi-store items SHALL render their DAL-selected scalar `store` everywhere; their extra rows are dormant and excluded from every display surface. The edit path SHALL seed from the DAL scalar (whose selection rule already falls back to the first row when none is complete, so legacy incomplete rows surface for repair) and SHALL submit exactly one store. No migration SHALL be run for untouched items.

#### Scenario: Incomplete store payload is rejected

- **WHEN** a create or update submission carries a store missing its name, link, or a valid price
- **THEN** the action SHALL reject with a validation failure

#### Scenario: Legacy multi-store item renders its primary

- **WHEN** an item with three stored rows (two complete) renders on any surface
- **THEN** the cheapest complete store SHALL be the displayed price/name and `View item ↗` target, and the other rows SHALL be invisible

#### Scenario: Edit-save collapses legacy extras through the scalar path

- **WHEN** the owner edits a legacy multi-store item and saves the single seeded store
- **THEN** the action SHALL wrap the scalar for the positional sync internally and rows beyond the first SHALL be deleted
