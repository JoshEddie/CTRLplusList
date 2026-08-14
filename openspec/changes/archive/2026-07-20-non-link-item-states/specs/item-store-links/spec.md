# Delta: item-store-links

## REMOVED Requirements

### Requirement: A store SHALL be considered valid only when it has a name, a link, and a numeric price

**Reason**: Superseded by the tri-state validity model (map #233 decision, issue #256): a priced-but-linkless (PRICED) row is now valid, so "complete" (navigable) and "valid" (displayable) split into two predicates.

**Migration**: The complete predicate (`storeComplete`) survives unchanged under the ADDED tri-state requirement; consumers gating navigation keep it, consumers gating display move to the widened `storeValid`.

## ADDED Requirements

### Requirement: Store validity SHALL be tri-state — FULL, PRICED, or absent

Two shared pure predicates SHALL live in one home (`lib/storeValidity.ts`), consumed by every surface — the DAL boundary's primary-store selection, display gating, the deck's tier rows, and the server actions' create/update validation — so validity cannot drift between surfaces:

- **Complete (FULL)** — `storeComplete`: non-empty `name`, a `link` accepted by `isValidProductUrl`, and a `price` whose tier is `good` per `priceTier`/`PRICE_PATTERN` (optional `$`, integer or up to two decimals). The sole gate for navigation surfaces (`View item ↗`, `Buy & Claim ↗`, the purchase modal store row).
- **Valid (FULL ∪ PRICED)** — a row is PRICED only when `link` is exactly `''`, `name` trims to `''`, and the price tier is `good`. Valid rows participate in primary-store selection and the price line. Requiring `link === ''` (not merely "invalid") keeps legacy dormant rows with broken non-empty links excluded — they SHALL NOT resurrect.

Name and link SHALL couple symmetrically: a non-empty name requires a valid link, a non-empty link requires a non-empty name (and a good price). Rows failing both predicates SHALL be excluded from selection (beyond the first-row repair fallback), the price line, and every store-gated action.

#### Scenario: PRICED row is valid but not navigable

- **WHEN** an item's only row is `{ name: '', link: '', price: '25.00' }`
- **THEN** the row SHALL be selected as the scalar `store`, the price line SHALL render, and no `View item ↗`, `Buy & Claim ↗`, or purchase-modal store row SHALL render

#### Scenario: Legacy invalid-link row stays excluded

- **WHEN** an item's fetched rows contain an entry with a good price and a non-empty `link` that fails `isValidProductUrl`
- **THEN** that entry SHALL NOT be valid — excluded from selection (beyond repair fallback) and every display

#### Scenario: Name without link is invalid

- **WHEN** a row carries a non-empty `name`, an empty `link`, and a good price
- **THEN** the row SHALL be neither complete nor valid

#### Scenario: One predicate pair everywhere

- **WHEN** the DAL selection helper, a display surface's gate, the deck's store/price rows, and the server action classify the same store value
- **THEN** all SHALL consume the same shared predicate helpers and agree on its state

## MODIFIED Requirements

### Requirement: The price line SHALL name the primary store as inert metadata

Wherever an item card or row displays its price, the line SHALL render the primary store's price as muted, inert text: no anchor, no button, no external-link icon, no tap affordance, and never wrapping to a second line. For a complete (FULL) store the line SHALL read `$X.XX · {store name}`; for a PRICED (linkless) store it SHALL read `$X.XX` alone — no `·` separator and no name fragment. The line SHALL render whenever the item has a valid store (FULL ∪ PRICED), uniformly across claim states — store navigation is carried exclusively by the `View item ↗` action owned by `item-actions`, so the metadata line never doubles as navigation. When no valid store exists (BARE, or only invalid legacy rows), no price line SHALL render.

#### Scenario: Price line names the single store

- **WHEN** any viewer renders an item whose complete store is Crate & Barrel at $19.99
- **THEN** the price line SHALL read `$19.99 · Crate & Barrel`, no element of it SHALL be interactive, and it SHALL render on one line

#### Scenario: PRICED item shows a bare price

- **WHEN** any viewer renders an item whose valid store is PRICED at $25.00
- **THEN** the price line SHALL read `$25.00` with no `·` separator, no store name, and no interactive element

#### Scenario: No valid store, no price line

- **WHEN** an item has no valid store (no rows, or only legacy rows failing the validity predicates)
- **THEN** no price line SHALL render

### Requirement: Items SHALL be capped at a single store on create and update

The create and update paths SHALL accept a single scalar store: `createItem`/`updateItem` SHALL take one nullable `store` object — no array SHALL appear in the submitted payload, the zod contract, or the action signature — and SHALL accept exactly the tri-state model, mirroring the client-side gate so the actions cannot persist what the UI forbids: an absent or all-empty store (BARE) SHALL persist zero rows, a PRICED store SHALL persist one `{ name: '', link: '', price }` row with null provenance, and a FULL store SHALL persist as today. A store failing the validity predicates — name without link, link without name, link without a good price, or a malformed non-empty price — SHALL be rejected with a validation failure. The internal positional store-sync invocation is unchanged (BARE passes an empty array), so syncing still removes rows beyond the submitted set, collapsing legacy multi-store items on first edit-save — including to zero rows for a BARE save. The `item_stores` schema is unchanged — the cap is input-side only. Existing multi-store items SHALL render their DAL-selected scalar `store` everywhere; their extra rows are dormant and excluded from every display surface. The edit path SHALL seed from the DAL scalar (whose selection rule already falls back to the first row when none is valid, so legacy incomplete rows surface for repair) and SHALL submit at most one store. No migration SHALL be run for untouched items.

#### Scenario: Store-less item saves

- **WHEN** a create or update submission carries no store (or a store whose name, link, and price are all empty)
- **THEN** the action SHALL succeed and persist zero `item_stores` rows for the item

#### Scenario: PRICED submission persists a linkless row

- **WHEN** an update submission carries `{ name: '', link: '', price: '25.00' }`
- **THEN** the action SHALL succeed and persist exactly one row with empty name/link, the price, and null provenance

#### Scenario: Name-without-link payload is rejected

- **WHEN** a create or update submission carries a store with a non-empty name and an empty link
- **THEN** the action SHALL reject with a validation failure

#### Scenario: Linked store still requires all three fields

- **WHEN** a create or update submission carries a store with a non-empty link missing its name or a valid price
- **THEN** the action SHALL reject with a validation failure

#### Scenario: Edit-save collapses legacy extras through the scalar path

- **WHEN** the owner edits a legacy multi-store item and saves the single seeded store
- **THEN** the action SHALL wrap the scalar for the positional sync internally and rows beyond the first SHALL be deleted

### Requirement: Primary-store selection SHALL happen once at the DAL read boundary

Every item read SHALL flatten the fetched `item_stores` rows to a single scalar `store: ItemStoreTable | null` via one shared pure selection helper co-located with the validity predicates: the lowest-priced **valid** store (FULL ∪ PRICED, per the shared predicates), else the first fetched row (so legacy incomplete rows stay reachable for repair), else `null`. The selection SHALL be a pure mapping over already-fetched rows (compatible with `'use cache'` reads — no request-scope inputs). No UI surface SHALL receive a store array or re-run primary-store selection; the retired UI-side selection helpers (`lowestPricedStore`, `sortedValidStores`) SHALL NOT be reintroduced. Because the scalar may carry an invalid row, display surfaces SHALL gate store-derived rendering on the shared predicates — the price line on validity, store link targets and store-gated actions on completeness — preserving the rendered outcomes of the previous complete-only selection for legacy rows.

#### Scenario: Reads return the cheapest valid store as the scalar

- **WHEN** an item's fetched rows contain two complete stores at $30 and $12 and one invalid row
- **THEN** every item read SHALL return the $12 store as `store`, and no consumer SHALL see the other rows

#### Scenario: PRICED row participates in selection

- **WHEN** an item's fetched rows contain only a PRICED row (`link` exactly `''`, good price)
- **THEN** `store` SHALL be that row and the price line SHALL render its bare price

#### Scenario: Only invalid rows — first row travels for repair, displays render nothing

- **WHEN** an item's fetched rows contain only invalid stores
- **THEN** `store` SHALL be the first fetched row, the edit path SHALL seed from it, and no price line, `View item ↗`, or other store-gated display SHALL render

#### Scenario: No rows — null store

- **WHEN** an item has no `item_stores` rows
- **THEN** `store` SHALL be `null` and every store-gated surface SHALL render its store-less state
